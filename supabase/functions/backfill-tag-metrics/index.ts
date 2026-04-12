
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { start_offset = 0, days = 10 } = await req.json().catch(() => ({}));
  
  const results: string[] = [];
  
  for (let i = start_offset; i < start_offset + days; i++) {
    const { data, error } = await supabase.rpc("backfill_tag_metrics_batch", {
      p_start: new Date(Date.now() - (i + 1) * 86400000).toISOString().split("T")[0],
      p_end: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
    });
    
    if (error) {
      results.push(`Day -${i}: ERROR - ${error.message}`);
    } else {
      results.push(`Day -${i}: OK`);
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});
