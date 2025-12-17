import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get token from query params or body (supports both direct URL and supabase.functions.invoke)
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    // If not in query params, try to get from body
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // ignore parse errors
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token je povinný", code: "MISSING_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Fetching feedback form for token: ${token}`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select(`
        *,
        clients(name),
        training_sessions(date, notes)
      `)
      .eq("token", token)
      .maybeSingle();

    if (requestError) {
      console.error("Error finding request:", requestError);
      throw new Error("Chyba při hledání požadavku");
    }

    if (!request) {
      return new Response(
        JSON.stringify({ error: "Neplatný odkaz", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already completed
    if (request.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Zpětná vazba již byla vyplněna", code: "ALREADY_COMPLETED" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiration
    if (new Date(request.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("feedback_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return new Response(
        JSON.stringify({ error: "Platnost odkazu vypršela", code: "EXPIRED" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user's feedback settings for questions configuration
    const { data: feedbackSettings } = await supabase
      .from("feedback_settings")
      .select("feedback_questions")
      .eq("user_id", request.user_id)
      .maybeSingle();

    console.log(`Loaded feedback settings for user ${request.user_id}:`, feedbackSettings?.feedback_questions ? 'custom config' : 'default config');

    // Return form data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clientName: request.clients?.name || "Klient",
          trainingDate: request.training_sessions?.date || null,
          trainingNotes: request.training_sessions?.notes || null,
          expiresAt: request.expires_at,
          questionsConfig: feedbackSettings?.feedback_questions || null,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in get-public-feedback-form:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
