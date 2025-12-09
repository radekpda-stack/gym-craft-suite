import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ 
          error: "Neplatná data", 
          details: parseResult.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { token, ...feedbackData } = parseResult.data;

    console.log(`Processing feedback submission for token: ${token}`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select("*, clients(name), training_sessions(date)")
      .eq("token", token)
      .maybeSingle();

    if (requestError) {
      console.error("Error finding request:", requestError);
      throw new Error("Chyba při hledání požadavku");
    }

    if (!request) {
      console.error("Request not found for token:", token);
      return new Response(
        JSON.stringify({ error: "Neplatný nebo expirovaný odkaz" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already completed
    if (request.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Zpětná vazba již byla odeslána" }),
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
        JSON.stringify({ error: "Platnost odkazu vypršela" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
      throw new Error("Chyba při ukládání zpětné vazby");
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

    // Create notification for trainer
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: request.user_id,
        client_id: request.client_id,
        type: "feedback_received",
        title: "Nová zpětná vazba",
        message: `${request.clients?.name || "Klient"} vyplnil zpětnou vazbu po tréninku.`,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    console.log("Feedback submitted successfully:", feedback.id);

    return new Response(
      JSON.stringify({ success: true, feedbackId: feedback.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
