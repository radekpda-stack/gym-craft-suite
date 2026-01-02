import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cleanup Diagnostics Edge Function
 * 
 * Deletes old diagnostic data:
 * - app_events older than 60 days
 * - app_errors older than 90 days
 * 
 * Designed to be called via cron job daily.
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🧹 Starting diagnostics cleanup...");

    // Call the database cleanup function
    const { data, error } = await supabase.rpc("cleanup_old_diagnostics");

    if (error) {
      console.error("❌ Cleanup failed:", error);
      throw error;
    }

    const duration = Date.now() - startTime;

    console.log("✅ Cleanup completed:", {
      deleted_events: data?.deleted_events || 0,
      deleted_errors: data?.deleted_errors || 0,
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        deleted_events: data?.deleted_events || 0,
        deleted_errors: data?.deleted_errors || 0,
        duration_ms: duration,
        ran_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Cleanup failed";
    console.error("❌ Cleanup error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
