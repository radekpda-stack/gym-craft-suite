import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// New 7-scale feedback schema (all 1-10)
const feedbackSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  soreness: z.number().int().min(1).max(10),
  body_feel: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  pain: z.number().int().min(1).max(10),
  session_fit: z.number().int().min(1).max(10),
  difficulty: z.number().int().min(1).max(10),
  fun: z.number().int().min(1).max(10),
  pain_area: z.enum(["knee", "back", "shoulder", "hip", "ankle", "wrist", "neck", "other"]).optional(),
  pain_area_other: z.string().max(100).optional(),
  // DB constraint: training_feedback.comment <= 200
  note: z.string().max(500).optional(),
});

// Red flag detection thresholds
const RED_FLAG_THRESHOLDS = {
  pain: 7, // pain >= 7 is red flag
  body_feel: 3, // body_feel <= 3 is red flag
};

serve(async (req) => {
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

    const { token, pain_area, pain_area_other, note, ...scales } = parseResult.data;

    console.log(`Processing public feedback submission for token: ${token}`);

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
        JSON.stringify({ error: "Neplatný odkaz", code: "NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already completed
    if (request.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Zpětná vazba již byla odeslána", code: "ALREADY_COMPLETED" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiration
    if (new Date(request.expires_at) < new Date()) {
      await supabase
        .from("feedback_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return new Response(
        JSON.stringify({ error: "Platnost odkazu vypršela", code: "EXPIRED" }),
        { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user's red flag thresholds from settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("user_id", request.user_id)
      .eq("key", "feedback_settings")
      .single();

    const painThreshold = settings?.value?.red_flag_pain_threshold || RED_FLAG_THRESHOLDS.pain;
    const bodyFeelThreshold = settings?.value?.red_flag_body_feel_threshold || RED_FLAG_THRESHOLDS.body_feel;

    // Detect red flags
    const redFlagReasons: string[] = [];
    if (scales.pain >= painThreshold) {
      redFlagReasons.push(`Vysoká bolest (${scales.pain}/10)`);
    }
    if (scales.body_feel <= bodyFeelThreshold) {
      redFlagReasons.push(`Nízký pocit v těle (${scales.body_feel}/10)`);
    }
    const isRedFlag = redFlagReasons.length > 0;

    // Check if training_session_id exists
    if (!request.training_session_id) {
      console.error("No training_session_id found in feedback request");
      return new Response(
        JSON.stringify({ error: "Chybí odkaz na trénink", code: "NO_TRAINING" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create feedback entry with new schema
    const trainingDate = request.training_sessions?.date || new Date().toISOString();
    
    const feedbackData = {
      training_session_id: request.training_session_id,
      client_id: request.client_id,
      user_id: request.user_id,
      training_date: trainingDate,
      feedback_request_id: request.id,
      // DB constraint: training_feedback.source in ('manual','email','link')
      source: "link",
      is_processed: false,
      // New 7-scale fields
      soreness: scales.soreness,
      body_feel: scales.body_feel,
      energy_rating: scales.energy,
      pain: scales.pain,
      session_fit: scales.session_fit,
      difficulty: scales.difficulty,
      fun: scales.fun,
      pain_area: pain_area || null,
      pain_area_other: pain_area_other || null,
      // DB constraint: training_feedback.comment <= 200
      comment: note ? note.slice(0, 200) : null,
      is_red_flag: isRedFlag,
      red_flag_reasons: redFlagReasons.length > 0 ? redFlagReasons : null,
      // Set some default values for old fields to maintain compatibility
      rpe_rating: scales.difficulty, // Map difficulty to RPE
      fatigue_level: Math.min(5, Math.max(1, Math.ceil(scales.soreness / 2))), // Map soreness to fatigue 1-5
      mood_rating: Math.min(5, Math.max(1, Math.ceil(scales.fun / 2))), // Map fun to mood 1-5
      technique_rating: Math.min(5, Math.max(1, Math.ceil(scales.session_fit / 2))), // Map session_fit to technique 1-5
      energy_level: scales.energy >= 7 ? "stable" : scales.energy >= 4 ? "better_end" : "low_entire",
      goal_relevance: scales.session_fit >= 7 ? "yes" : scales.session_fit >= 4 ? "partially" : "no",
    };

    console.log("Inserting feedback data:", JSON.stringify(feedbackData, null, 2));

    const { data: feedback, error: feedbackError } = await supabase
      .from("training_feedback")
      .insert(feedbackData)
      .select()
      .single();

    if (feedbackError) {
      console.error("Error creating feedback - code:", feedbackError.code);
      console.error("Error creating feedback - message:", feedbackError.message);
      console.error("Error creating feedback - details:", feedbackError.details);
      console.error("Error creating feedback - hint:", feedbackError.hint);
      throw new Error(`Chyba při ukládání zpětné vazby: ${feedbackError.message}`);
    }

    // Update request status to completed
    await supabase
      .from("feedback_requests")
      .update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      })
      .eq("id", request.id);

    // Create notification for trainer
    await supabase
      .from("notifications")
      .insert({
        user_id: request.user_id,
        client_id: request.client_id,
        type: "feedback_received",
        title: "Nová zpětná vazba",
        message: `${request.clients?.name || "Klient"} vyplnil zpětnou vazbu po tréninku.`,
        entity_type: "training",
        entity_id: request.training_session_id,
        severity: "info",
      });

    // Create red flag notification if applicable
    if (isRedFlag) {
      const severity = scales.pain >= 8 || scales.body_feel <= 2 ? "critical" : "warning";
      await supabase
        .from("notifications")
        .insert({
          user_id: request.user_id,
          client_id: request.client_id,
          type: "feedback_red_flag",
          title: "⚠️ Red flag - vyžaduje pozornost",
          message: `${request.clients?.name || "Klient"}: ${redFlagReasons.join(", ")}`,
          entity_type: "training",
          entity_id: request.training_session_id,
          severity,
        });
    }

    // Check for repeated negative patterns (last 3 feedbacks)
    const { data: recentFeedbacks } = await supabase
      .from("training_feedback")
      .select("pain, body_feel, soreness, energy_rating, fun, training_date")
      .eq("client_id", request.client_id)
      .order("training_date", { ascending: false })
      .limit(3);

    if (recentFeedbacks && recentFeedbacks.length >= 3) {
      const trendAlerts: string[] = [];

      // Check for repeated high pain (>= 5 for 3 sessions)
      const highPainCount = recentFeedbacks.filter(f => f.pain && f.pain >= 5).length;
      if (highPainCount >= 3) {
        trendAlerts.push(`Opakovaná vysoká bolest (${highPainCount}x za sebou)`);
      }

      // Check for repeated low body feel (<= 4 for 3 sessions)
      const lowBodyFeelCount = recentFeedbacks.filter(f => f.body_feel && f.body_feel <= 4).length;
      if (lowBodyFeelCount >= 3) {
        trendAlerts.push(`Opakovaně nízký pocit v těle (${lowBodyFeelCount}x za sebou)`);
      }

      // Check for repeated high soreness (>= 6 for 3 sessions)
      const highSorenessCount = recentFeedbacks.filter(f => f.soreness && f.soreness >= 6).length;
      if (highSorenessCount >= 3) {
        trendAlerts.push(`Opakovaně vysoká svalová únava (${highSorenessCount}x za sebou)`);
      }

      // Check for repeated low energy (<= 4 for 3 sessions)
      const lowEnergyCount = recentFeedbacks.filter(f => f.energy_rating && f.energy_rating <= 4).length;
      if (lowEnergyCount >= 3) {
        trendAlerts.push(`Opakovaně nízká energie (${lowEnergyCount}x za sebou)`);
      }

      // Check for repeated low fun (<= 4 for 3 sessions)
      const lowFunCount = recentFeedbacks.filter(f => f.fun && f.fun <= 4).length;
      if (lowFunCount >= 3) {
        trendAlerts.push(`Opakovaně nízká zábava (${lowFunCount}x za sebou)`);
      }

      // Create trend alert notification if patterns detected
      if (trendAlerts.length > 0) {
        console.log(`Trend alerts detected for client ${request.client_id}:`, trendAlerts);
        
        await supabase
          .from("notifications")
          .insert({
            user_id: request.user_id,
            client_id: request.client_id,
            type: "feedback_trend_alert",
            title: "📉 Negativní trend u klienta",
            message: `${request.clients?.name || "Klient"}: ${trendAlerts.join("; ")}`,
            entity_type: "client",
            entity_id: request.client_id,
            severity: "warning",
          });
      }
    }

    console.log(`Public feedback submitted successfully: ${feedback.id}, isRedFlag: ${isRedFlag}`);

    return new Response(
      JSON.stringify({ success: true, feedbackId: feedback.id, isRedFlag }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in submit-public-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
