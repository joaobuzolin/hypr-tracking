import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache para tags para melhorar performance
const tagCache = new Map<string, { id: string; type: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Rate limiting simples por IP (configurável via env vars)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(Deno.env.get('TRACK_EVENT_RATE_LIMIT') || '2000'); // requests por minuto por IP
const RATE_WINDOW = parseInt(Deno.env.get('TRACK_EVENT_RATE_WINDOW') || '60000'); // 1 minuto

// Função para verificar rate limit
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  
  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (current.count >= RATE_LIMIT) {
    return false;
  }
  
  current.count++;
  return true;
}

// Função para obter tag do cache ou banco
async function getTagInfo(supabase: any, tagCode: string) {
  // Verificar cache primeiro
  const cached = tagCache.get(tagCode);
  if (cached && Date.now() < cached.expires) {
    return cached;
  }
  
  // Buscar no banco
  const { data: tag, error } = await supabase
    .from('tags')
    .select('id, type')
    .eq('code', tagCode)
    .single();
    
  if (error || !tag) {
    return null;
  }
  
  // Adicionar ao cache
  const tagInfo = { id: tag.id, type: tag.type, expires: Date.now() + CACHE_TTL };
  tagCache.set(tagCode, tagInfo);
  
  return tagInfo;
}

// Limpeza periódica do cache e rate limiting
setInterval(() => {
  const now = Date.now();
  
  // Limpar cache expirado
  for (const [key, value] of tagCache.entries()) {
    if (now > value.expires) {
      tagCache.delete(key);
    }
  }
  
  // Limpar rate limiting expirado
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Executar a cada minuto

// 1x1 transparent GIF in base64
const GIF_PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const rawIp = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown';
    const ip = rawIp === 'unknown' ? 'unknown' : rawIp.split(',')[0].trim();
    
    if (!checkRateLimit(ip)) {
      console.log(`Rate limit exceeded for IP: ${ip}`)
      return new Response('Rate limit exceeded', { 
        status: 429, 
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Window': (RATE_WINDOW / 1000).toString(),
          'X-RateLimit-Remaining': '0'
        }
      });
    }
    
    const url = new URL(req.url)
    let tagCode = url.searchParams.get('tag')
    
    // If tag not in URL, try to get it from POST body
    if (!tagCode && req.method === 'POST') {
      try {
        const body = await req.json()
        tagCode = body.tag
      } catch (e) {
        // If JSON parsing fails, continue with null tagCode
        console.log('Failed to parse JSON body:', e)
      }
    }
    
    if (!tagCode) {
      console.log('Missing tag parameter in both URL and body')
      return new Response('Missing tag parameter', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get tag info (com cache otimizado)
    const tag = await getTagInfo(supabase, tagCode);
    
    if (!tag) {
      console.log('Tag not found:', tagCode)
      return new Response('Tag not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Get user agent (IP já foi processado acima)
    const userAgent = req.headers.get('user-agent')

    // Get additional metadata based on request method
    let metadata = {}
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        metadata = body
      } catch (e) {
        // If JSON parsing fails, continue with empty metadata
      }
    } else if (req.method === 'GET') {
      // For GET requests, include all query parameters (except 'tag') in metadata
      const params = Object.fromEntries(url.searchParams.entries())
      delete params.tag // Remove the tag parameter as it's already processed
      if (Object.keys(params).length > 0) {
        metadata = { query_params: params }
      }
    }

    // Map tag type to event type (aligned with frontend expectations)
    const eventTypeMapping = {
      'click-button': 'click',
      'pin': 'pin_click', 
      'page-view': 'page_view'
    }
    
    const eventType = eventTypeMapping[tag.type as keyof typeof eventTypeMapping] || tag.type
    
    console.log(`Processing event: tag_type=${tag.type}, mapped_event_type=${eventType}, ip=${ip}`)

    // Insert event record
    const eventData = {
      tag_id: tag.id,
      event_type: eventType,
      user_agent: userAgent,
      ip_address: ip === 'unknown' ? null : ip, // Store null instead of 'unknown' for inet type
      metadata: metadata
    }
    
    console.log('Inserting event data:', eventData)
    
    const { error: insertError } = await supabase
      .from('events')
      .insert(eventData)

    if (insertError) {
      console.error('Error inserting event:', insertError)
      return new Response('Error recording event', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    console.log(`Event recorded: ${eventType} for tag ${tagCode}`)

    // Return appropriate response based on request method
    if (req.method === 'GET') {
      // Return 1x1 pixel GIF for GET requests
      const gifBuffer = Uint8Array.from(atob(GIF_PIXEL), c => c.charCodeAt(0))
      const currentLimit = rateLimitMap.get(ip)
      const remaining = currentLimit ? Math.max(0, RATE_LIMIT - currentLimit.count) : RATE_LIMIT - 1
      
      return new Response(gifBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Content-Length': gifBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Window': (RATE_WINDOW / 1000).toString()
        }
      })
    } else {
      // Return JSON response for POST requests
      const currentLimit = rateLimitMap.get(ip)
      const remaining = currentLimit ? Math.max(0, RATE_LIMIT - currentLimit.count) : RATE_LIMIT - 1
      
      return new Response(
        JSON.stringify({ success: true, event_type: eventType }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Window': (RATE_WINDOW / 1000).toString()
          }
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})