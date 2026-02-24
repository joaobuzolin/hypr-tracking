import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'public' },
      global: { headers: { 'x-connection-encrypted': 'true' } }
    });

    const results: Record<string, string> = {};

    // Refresh summary view first (smaller, used by counters)
    try {
      const { error: summaryError } = await supabase.rpc("refresh_campaign_metrics_summary" as any);
      if (summaryError) {
        console.error("Error refreshing summary view:", summaryError.message);
        results.summary = `error: ${summaryError.message}`;
      } else {
        console.log("campaign_metrics_summary refreshed successfully");
        results.summary = "ok";
      }
    } catch (e) {
      console.error("Exception refreshing summary:", e);
      results.summary = `exception: ${String(e)}`;
    }

    // Then refresh daily view (larger, used by reports)
    try {
      const { error: dailyError } = await supabase.rpc("refresh_campaign_metrics_daily" as any);
      if (dailyError) {
        console.error("Error refreshing daily view:", dailyError.message);
        results.daily = `error: ${dailyError.message}`;
      } else {
        console.log("campaign_metrics_daily refreshed successfully");
        results.daily = "ok";
      }
    } catch (e) {
      console.error("Exception refreshing daily:", e);
      results.daily = `exception: ${String(e)}`;
    }

    const allOk = results.summary === "ok" && results.daily === "ok";
    console.log("Refresh completed at", new Date().toISOString(), results);

    return new Response(JSON.stringify({ 
      success: allOk, 
      results,
      refreshed_at: new Date().toISOString() 
    }), {
      status: allOk ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
