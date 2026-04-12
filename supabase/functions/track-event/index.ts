import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache para tags para melhorar performance
const tagCache = new Map<string, { id: string; type: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Deduplication cache for page views only (5 second TTL)
const dedupeCache = new Map<string, number>();
const DEDUPE_TTL = 5 * 1000; // 5 seconds

// Rate limiting simples por IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = parseInt(Deno.env.get('TRACK_EVENT_RATE_LIMIT') || '2000');
const RATE_WINDOW = parseInt(Deno.env.get('TRACK_EVENT_RATE_WINDOW') || '60000');

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count++;
  return true;
}

async function getTagInfo(supabase: any, tagCode: string) {
  const cached = tagCache.get(tagCode);
  if (cached && Date.now() < cached.expires) return cached;
  
  const { data: tag, error } = await supabase
    .from('tags')
    .select('id, type')
    .eq('code', tagCode)
    .single();
    
  if (error || !tag) return null;
  
  const tagInfo = { id: tag.id, type: tag.type, expires: Date.now() + CACHE_TTL };
  tagCache.set(tagCode, tagInfo);
  return tagInfo;
}

// Classify user agent into simple category
function classifyUserAgent(ua: string | null): string {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (lower.includes('bot') || lower.includes('crawler') || lower.includes('spider') || lower.includes('headless')) return 'bot';
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return 'mobile';
  return 'desktop';
}

// Extract just hostname from referer
function extractRefererHostname(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname;
  } catch {
    return null;
  }
}

// Filter out unresolved DV360/ad server placeholders
const PLACEHOLDER_PATTERN = /^\{.*\}$/;
function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_PATTERN.test(value);
}

function generateDedupeKey(tagId: string, uniqueId: string | null, ip: string, userAgent: string | null, referer: string | null): string {
  if (uniqueId && uniqueId !== '' && !isPlaceholder(uniqueId)) {
    return `pv|${tagId}|${uniqueId}`;
  }
  const hostname = extractRefererHostname(referer) || 'none';
  return `pv|${tagId}|${ip}|${classifyUserAgent(userAgent)}|${hostname}`;
}

function checkDedupe(dedupeKey: string): boolean {
  const now = Date.now();
  const cached = dedupeCache.get(dedupeKey);
  if (cached && now < cached + DEDUPE_TTL) return true;
  dedupeCache.set(dedupeKey, now);
  return false;
}

// Limpeza periódica dos caches
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tagCache.entries()) {
    if (now > value.expires) tagCache.delete(key);
  }
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }
  for (const [key, value] of dedupeCache.entries()) {
    if (now > value + DEDUPE_TTL) dedupeCache.delete(key);
  }
}, 60000);

// 1x1 transparent GIF
const GIF_PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function gifResponse(headers: Record<string, string> = {}) {
  const gifBuffer = Uint8Array.from(atob(GIF_PIXEL), c => c.charCodeAt(0));
  return new Response(gifBuffer, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/gif',
      'Content-Length': gifBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...headers,
    }
  });
}

Deno.serve(async (req) => {
  if (req.url.endsWith('/health')) {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ip = rawIp === 'unknown' ? 'unknown' : rawIp.split(',')[0].trim();
    
    if (!checkRateLimit(ip)) {
      return new Response('Rate limit exceeded', { status: 429, headers: corsHeaders });
    }
    
    // Extract tag code from path or query
    let tagCode: string | null = null;
    let url: URL | null = null;
    
    const pathMatch = req.url.match(/\/track-event\/([^/?&]+)/);
    if (pathMatch) {
      try { tagCode = decodeURIComponent(pathMatch[1]); } catch { tagCode = pathMatch[1]; }
    }
    
    if (!tagCode) {
      try {
        url = new URL(req.url);
        tagCode = url.searchParams.get('tag') || url.searchParams.get('code') || url.searchParams.get('t');
      } catch {
        const tagMatch = req.url.match(/[?&](?:tag|code|t)=([^&]+)/);
        if (tagMatch) tagCode = decodeURIComponent(tagMatch[1]);
      }
    }
    
    if (!tagCode && req.method === 'POST') {
      try {
        const body = await req.json();
        tagCode = body.tag || body.code || body.t;
      } catch { /* ignore */ }
    }
    
    if (!tagCode) {
      return gifResponse({ 'X-Debug': 'missing-tag' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tag = await getTagInfo(supabase, tagCode);
    if (!tag) {
      if (req.method === 'GET') return gifResponse({ 'X-Debug': 'tag-not-found' });
      return new Response('Tag not found', { status: 404, headers: corsHeaders });
    }

    const userAgent = req.headers.get('user-agent');
    const referer = req.headers.get('referer');

    // Build LEAN metadata — only essential fields
    const refererHostname = extractRefererHostname(referer);
    const metadata: Record<string, any> = {};
    if (refererHostname) metadata.referer = refererHostname;

    // Extract cb3 (unique_id) from query params if present
    let uniqueId: string | null = null;
    if (url?.searchParams) {
      const cb3 = url.searchParams.get('cb3');
      if (cb3 && !isPlaceholder(cb3)) {
        metadata.cb3 = cb3;
        uniqueId = cb3;
      }
    }

    // Map tag type to event type
    const eventTypeMapping: Record<string, string> = {
      'click-button': 'click',
      'pin': 'pin_click',
      'page-view': 'page_view'
    };
    const eventType = eventTypeMapping[tag.type] || tag.type;

    // Page view deduplication
    if (eventType === 'page_view') {
      const dedupeKey = generateDedupeKey(tag.id, uniqueId, ip, userAgent, referer);
      if (checkDedupe(dedupeKey)) {
        if (req.method === 'GET') return gifResponse({ 'X-Dedup': 'hit' });
        return new Response(JSON.stringify({ success: true, deduped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Insert event — store classified UA instead of full string
    const uaClass = classifyUserAgent(userAgent);
    const { error: insertError } = await supabase
      .from('events')
      .insert({
        tag_id: tag.id,
        event_type: eventType,
        user_agent: uaClass,
        ip_address: ip === 'unknown' ? null : ip,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      });

    if (insertError) {
      console.error('Error inserting event:', insertError);
      if (req.method === 'GET') return gifResponse({ 'X-Debug': 'insert-error' });
      return new Response('Error recording event', { status: 500, headers: corsHeaders });
    }

    if (req.method === 'GET') {
      return gifResponse({ 'X-Dedup': eventType === 'page_view' ? 'miss' : 'none' });
    }

    return new Response(
      JSON.stringify({ success: true, event_type: eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    if (req.method === 'GET') return gifResponse({ 'X-Debug': 'unexpected-error' });
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
