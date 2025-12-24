import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize response time to prevent timing attacks
const MIN_RESPONSE_TIME_MS = 150;

async function normalizeResponseTime<T>(startTime: number, response: T): Promise<T> {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
  }
  return response;
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from URL
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Token je povinný", code: "MISSING_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Neplatný odkaz", code: "INVALID_TOKEN" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    console.log(`Fetching feedback form for token: ${token.substring(0, 8)}...`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select(`
        *,
        clients(id, name),
        training_sessions(id, date, notes, status)
      `)
      .eq("token", token)
      .maybeSingle();

    if (requestError) {
      console.error("Error finding request:", requestError);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Nepodařilo se načíst formulář", code: "LOAD_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Use consistent response for not found (prevents token enumeration)
    if (!request) {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Neplatný odkaz", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Check if already completed
    if (request.status === "completed") {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ 
          error: "Zpětná vazba již byla odeslána", 
          code: "ALREADY_COMPLETED" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Check expiration
    if (new Date(request.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("feedback_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ 
          error: "Platnost odkazu vypršela", 
          code: "EXPIRED" 
        }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Return form data
    return await normalizeResponseTime(startTime, new Response(
      JSON.stringify({
        success: true,
        data: {
          token: request.token,
          clientName: request.clients?.name || "Klient",
          trainingDate: request.training_sessions?.date,
          trainingNotes: request.training_sessions?.notes,
          customMessage: request.custom_message,
          trainerSignature: request.trainer_signature,
          expiresAt: request.expires_at,
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    ));
  } catch (error: any) {
    console.error("Error in get-feedback-form:", error);
    return await normalizeResponseTime(Date.now(), new Response(
      JSON.stringify({ error: "Nepodařilo se načíst formulář", code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    ));
  }
});
