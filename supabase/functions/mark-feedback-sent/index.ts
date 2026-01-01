import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const inputSchema = z.object({
  token: z.string().uuid(),
  send_channel: z.enum(["sms", "whatsapp", "imessage", "email", "manual", "other"]).optional(),
  sent_to: z.string().max(200).optional(), // phone or email
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
        JSON.stringify({ error: "Neplatná data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { token: feedbackToken, send_channel, sent_to } = parseResult.data;

    // Update the feedback request
    const { data, error } = await supabase
      .from("feedback_requests")
      .update({ 
        sent_at: new Date().toISOString(),
        send_channel: send_channel || null,
        sent_to: sent_to || null,
      })
      .eq("token", feedbackToken)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) {
      console.error("Error updating feedback request:", error);
      throw new Error("Chyba při aktualizaci");
    }

    // Log SENT event
    await supabase
      .from("feedback_event_log")
      .insert({
        feedback_request_id: data.id,
        event_type: "SENT",
        meta: {
          send_channel: send_channel || null,
          sent_to: sent_to || null,
        },
      });

    console.log(`Feedback marked as sent: ${data.id}`);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in mark-feedback-sent:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
