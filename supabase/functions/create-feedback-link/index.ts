import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const inputSchema = z.object({
  client_id: z.string().uuid(),
  training_id: z.string().uuid(),
  send_channel: z.enum(["sms", "whatsapp", "other"]).optional(),
  // Frontend origin to build the public link (supports custom domains)
  base_url: z.string().url().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný přístup" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný přístup" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = inputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Neplatná data", details: parseResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { client_id, training_id, send_channel, base_url } = parseResult.data;

    const getBaseUrl = () => {
      // 1) explicit base_url from frontend (preferred)
      if (base_url) return base_url.replace(/\/$/, "");

      // 2) forwarded host/proto (common in production)
      const xfProto = req.headers.get("x-forwarded-proto");
      const xfHost = req.headers.get("x-forwarded-host");
      if (xfProto && xfHost) return `${xfProto}://${xfHost}`;

      // 3) origin / referer fallback
      const origin = req.headers.get("origin");
      if (origin) return origin.replace(/\/$/, "");

      const referer = req.headers.get("referer");
      if (referer) {
        try {
          const u = new URL(referer);
          return `${u.protocol}//${u.host}`;
        } catch {
          // ignore
        }
      }

      // last resort fallback
      return "https://zukmwqfqmfuyqpxfjqil.lovable.app";
    };

    const resolvedBaseUrl = getBaseUrl();

    console.log(`Creating feedback link for client ${client_id}, training ${training_id}, baseUrl=${resolvedBaseUrl}`);

    // Check if client has feedback enabled
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, feedback_enabled")
      .eq("id", client_id)
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Klient nenalezen" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (client.feedback_enabled === false) {
      return new Response(
        JSON.stringify({ error: "Klient má vypnuté posílání feedback dotazníků" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for existing active link (use limit(1) instead of single() to avoid error on duplicates)
    const { data: existingLinks } = await supabase
      .from("feedback_requests")
      .select("id, token, status, expires_at")
      .eq("client_id", client_id)
      .eq("training_session_id", training_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const existingLink = existingLinks?.[0];

    if (existingLink) {
      // Return existing active link
      return new Response(
        JSON.stringify({ 
          success: true, 
          token: existingLink.token,
          url: `${resolvedBaseUrl}/feedback/${existingLink.token}`,
          isExisting: true,
          expiresAt: existingLink.expires_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Cancel any old pending requests for this training before creating new one
    await supabase
      .from("feedback_requests")
      .update({ status: "cancelled" })
      .eq("client_id", client_id)
      .eq("training_session_id", training_id)
      .eq("status", "pending");

    // Get settings for expiration hours
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "feedback_settings")
      .single();

    const expirationHours = settings?.value?.link_expiry_hours || 72;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();

    // Create new feedback request
    const { data: newRequest, error: createError } = await supabase
      .from("feedback_requests")
      .insert({
        client_id,
        training_session_id: training_id,
        user_id: user.id,
        expires_at: expiresAt,
        status: "pending",
        send_channel: send_channel || null,
        is_link_generated: true,
      })
      .select("id, token, expires_at")
      .single();

    if (createError) {
      console.error("Error creating feedback request:", createError);
      throw new Error("Chyba při vytváření odkazu");
    }

    console.log(`Feedback link created: ${newRequest.token}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        token: newRequest.token,
        url: `${resolvedBaseUrl}/feedback/${newRequest.token}`,
        isExisting: false,
        expiresAt: newRequest.expires_at,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-feedback-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
