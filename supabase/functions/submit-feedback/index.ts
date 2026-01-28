import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Zod schema for input validation
const feedbackSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  rpe_rating: z.number().int().min(1).max(10),
  fatigue_level: z.number().int().min(1).max(5),
  muscle_soreness: z.array(z.string().max(50)).max(20).default([]),
  muscle_soreness_comment: z.string().max(500).optional(),
  energy_level: z.enum(["stable", "better-at-end", "low", "only-beginning-good"]),
  sleep_hours: z.number().min(0).max(24).optional(),
  sleep_quality: z.number().int().min(1).max(5).optional(),
  mood_rating: z.number().int().min(1).max(5),
  technique_rating: z.number().int().min(1).max(5),
  goal_relevance: z.enum(["yes", "partial", "no"]),
  comment: z.string().max(200).optional(),
});

// Sanitize validation errors - only return field names, not schema details
function sanitizeValidationErrors(error: z.ZodError): string[] {
  return [...new Set(error.issues.map(issue => issue.path[0]?.toString() || 'unknown'))];
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

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = feedbackSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.flatten());
      const invalidFields = sanitizeValidationErrors(parseResult.error);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ 
          error: "Neplatná data", 
          code: "VALIDATION_ERROR",
          fields: invalidFields
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    const { token, ...feedbackData } = parseResult.data;

    console.log(`Processing feedback submission for token: ${token.substring(0, 8)}...`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select("*, clients(name), training_sessions(date)")
      .eq("token", token)
      .maybeSingle();

    if (requestError) {
      console.error("Error finding request:", requestError);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Nepodařilo se zpracovat požadavek", code: "PROCESS_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Use consistent response for not found (prevents token enumeration)
    if (!request) {
      console.error("Request not found for token:", token.substring(0, 8));
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Neplatný nebo expirovaný odkaz", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Check if already completed
    if (request.status === "completed") {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Zpětná vazba již byla odeslána", code: "ALREADY_COMPLETED" }),
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
        JSON.stringify({ error: "Platnost odkazu vypršela", code: "EXPIRED" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Create feedback entry
    const trainingDate = request.training_sessions?.date || new Date().toISOString();
    
    const { data: feedback, error: feedbackError } = await supabase
      .from("training_feedback")
      .insert({
        training_session_id: request.training_session_id,
        client_id: request.client_id,
        user_id: request.user_id,
        training_date: trainingDate,
        feedback_request_id: request.id,
        source: "email",
        is_processed: false,
        ...feedbackData,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error("Error creating feedback:", feedbackError);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: "Nepodařilo se uložit zpětnou vazbu", code: "SAVE_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      ));
    }

    // Update request status to completed
    const { error: updateError } = await supabase
      .from("feedback_requests")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("Error updating request status:", updateError);
    }

    // Create notification for trainer with entity_type and entity_id for navigation
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: request.user_id,
        client_id: request.client_id,
        type: "feedback_received",
        title: "Nová zpětná vazba",
        message: `${request.clients?.name || "Klient"} vyplnil(a) zpětnou vazbu.`,
        entity_type: "training",
        entity_id: request.training_session_id,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    console.log("Feedback submitted successfully:", feedback.id);

    return await normalizeResponseTime(startTime, new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    ));
  } catch (error: any) {
    console.error("Error in submit-feedback:", error);
    return await normalizeResponseTime(Date.now(), new Response(
      JSON.stringify({ error: "Nepodařilo se odeslat zpětnou vazbu", code: "INTERNAL_ERROR" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    ));
  }
});
