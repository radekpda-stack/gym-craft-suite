import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ClientErrorLog = {
  kind: "error" | "unhandledrejection";
  message: string;
  name?: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  href?: string;
  userAgent?: string;
  timestamp: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const log: ClientErrorLog = await req.json();

    console.error(
      "🟠 CLIENT ERROR:",
      JSON.stringify(
        {
          kind: log.kind,
          message: log.message,
          name: log.name,
          href: log.href,
          userAgent: req.headers.get("user-agent"),
          timestamp: log.timestamp,
          stackTop: log.stack?.split("\n").slice(0, 8).join("\n"),
          source: log.source,
          lineno: log.lineno,
          colno: log.colno,
        },
        null,
        2,
      ),
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("audit_log").insert({
      action: "client_error",
      table_name: "frontend",
      record_id: log.kind,
      new_data: {
        ...log,
        userAgent: req.headers.get("user-agent"),
        // avoid huge payloads
        stack: log.stack?.substring(0, 4000),
        message: log.message?.substring(0, 500),
        href: log.href?.substring(0, 500),
        source: log.source?.substring(0, 500),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error logging client error:", error);
    return new Response(JSON.stringify({ error: "Failed to log" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
