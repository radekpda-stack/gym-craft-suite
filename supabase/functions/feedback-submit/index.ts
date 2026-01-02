import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter - only for public token submissions
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return false;
  }
  
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return false;
  }
  
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Unified feedback schema
const feedbackSchema = z.object({
  // Authentication - either token OR client portal session
  token: z.string().uuid().optional(),
  client_session_token: z.string().optional(),
  training_session_id: z.string().uuid().optional(),
  
  // Feedback values (1-10 scale)
  values: z.record(z.string(), z.number().int().min(1).max(10)),
  
  // Pain data
  pain_areas: z.array(z.string().max(50)).optional(),
  pain_area_intensities: z.record(z.string(), z.union([
    z.number().int().min(1).max(10),
    z.object({
      intensity: z.number().int().min(1).max(10),
      isNew: z.boolean().optional(),
    }),
  ])).optional(),
  pain_area_other: z.string().max(100).optional(),
  pain_type: z.enum(['muscle', 'joint', 'tendon']).optional().nullable(),
  
  // Sleep data
  sleep_after: z.enum(['poor', 'average', 'good']).optional().nullable(),
  sleep_hours: z.number().min(0).max(24).optional().nullable(),
  
  // Note
  note: z.string().max(500).optional(),
});

// Red flag thresholds
const RED_FLAG_THRESHOLDS = { pain: 7, body_feel: 3 };

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawBody = await req.json();
    console.log(`[${requestId}] Incoming feedback submission`);
    
    // Validate input
    const parseResult = feedbackSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error(`[${requestId}] Validation error:`, parseResult.error.flatten());
      return new Response(
        JSON.stringify({ 
          error: "Neplatná data formuláře", 
          code: "VALIDATION_ERROR",
          details: parseResult.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = parseResult.data;
    let clientId: string;
    let userId: string;
    let trainingSessionId: string;
    let trainingDate: string;
    let feedbackRequestId: string | null = null;
    let source: string;
    let clientName: string | null = null;
    let isHighIntensityTest = false;

    // ===== AUTHENTICATION MODE =====
    if (data.token) {
      // PUBLIC LINK MODE - authenticate via feedback request token
      source = "link";
      
      // Rate limit only public submissions (per token)
      const rateLimitKey = `token:${data.token}`;
      if (isRateLimited(rateLimitKey)) {
        console.warn(`[${requestId}] Rate limit hit for token`);
        return new Response(
          JSON.stringify({ error: "Příliš mnoho požadavků. Zkuste to za chvíli.", code: "RATE_LIMITED" }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find feedback request
      const { data: request, error: requestError } = await supabase
        .from("feedback_requests")
        .select("*, clients(name), training_sessions(date, is_high_intensity_test)")
        .eq("token", data.token)
        .maybeSingle();

      if (requestError) {
        console.error(`[${requestId}] Error finding request:`, requestError);
        throw new Error("Chyba při hledání požadavku");
      }

      if (!request) {
        return new Response(
          JSON.stringify({ error: "Neplatný odkaz na formulář", code: "NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (request.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Zpětná vazba již byla odeslána", code: "ALREADY_COMPLETED" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (request.rejected_at) {
        return new Response(
          JSON.stringify({ error: "Tento formulář byl označen jako nesprávně doručený", code: "REJECTED" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (new Date(request.expires_at) < new Date()) {
        await supabase.from("feedback_requests").update({ status: "expired" }).eq("id", request.id);
        return new Response(
          JSON.stringify({ error: "Platnost odkazu vypršela", code: "EXPIRED" }),
          { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!request.training_session_id) {
        return new Response(
          JSON.stringify({ error: "Chybí odkaz na trénink", code: "NO_TRAINING" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      clientId = request.client_id;
      userId = request.user_id;
      trainingSessionId = request.training_session_id;
      trainingDate = request.training_sessions?.date || new Date().toISOString();
      feedbackRequestId = request.id;
      clientName = request.clients?.name || null;
      isHighIntensityTest = request.training_sessions?.is_high_intensity_test ?? false;

    } else if (data.client_session_token && data.training_session_id) {
      // CLIENT PORTAL MODE - authenticate via client portal session
      source = "portal";
      
      // Validate client session
      const { data: clientAccount, error: authError } = await supabase
        .from("client_accounts")
        .select("client_id, trainer_id, is_active, clients(name)")
        .eq("auth_user_id", data.client_session_token)
        .eq("is_active", true)
        .maybeSingle();

      if (authError || !clientAccount) {
        console.error(`[${requestId}] Client auth failed:`, authError);
        return new Response(
          JSON.stringify({ error: "Neplatná klientská relace", code: "AUTH_FAILED" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Verify training session belongs to client
      const { data: session, error: sessionError } = await supabase
        .from("training_sessions")
        .select("id, date, client_id, is_high_intensity_test")
        .eq("id", data.training_session_id)
        .eq("client_id", clientAccount.client_id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: "Trénink nebyl nalezen", code: "SESSION_NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from("training_feedback")
        .select("id")
        .eq("training_session_id", data.training_session_id)
        .maybeSingle();

      if (existingFeedback) {
        return new Response(
          JSON.stringify({ error: "Zpětná vazba již byla odeslána", code: "ALREADY_COMPLETED" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      clientId = clientAccount.client_id;
      userId = clientAccount.trainer_id;
      trainingSessionId = data.training_session_id;
      trainingDate = session.date;
      clientName = (clientAccount.clients as any)?.name || null;
      isHighIntensityTest = session.is_high_intensity_test ?? false;

    } else {
      return new Response(
        JSON.stringify({ error: "Chybí autentizace (token nebo client_session_token + training_session_id)", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ===== PROCESS FEEDBACK =====
    const { values, pain_areas, pain_area_intensities, pain_area_other, pain_type, sleep_after, sleep_hours, note } = data;

    // Get user's red flag thresholds
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "feedback_settings")
      .single();

    const painThreshold = settings?.value?.red_flag_pain_threshold || RED_FLAG_THRESHOLDS.pain;
    const bodyFeelThreshold = settings?.value?.red_flag_body_feel_threshold || RED_FLAG_THRESHOLDS.body_feel;

    // Extract values with defaults
    const soreness = values.soreness ?? 5;
    const body_feel = values.body_feel ?? 5;
    const energy = values.energy ?? 5;
    const pain = values.pain ?? 1;
    const session_fit = values.session_fit ?? 5;
    const difficulty = values.difficulty ?? 5;
    const fun = values.fun ?? 5;

    // Detect red flags
    let redFlagReasons: string[] = [];
    let isRedFlag = false;

    if (!isHighIntensityTest) {
      if (pain >= painThreshold) {
        redFlagReasons.push(`Vysoká bolest (${pain}/10)`);
      }
      if ((pain_type === 'joint' || pain_type === 'tendon') && pain >= 4) {
        const painTypeLabel = pain_type === 'joint' ? 'Kloubní' : 'Šlachová';
        redFlagReasons.push(`${painTypeLabel} bolest (${pain}/10)`);
      }
      if (body_feel <= bodyFeelThreshold) {
        redFlagReasons.push(`Nízký pocit v těle (${body_feel}/10)`);
      }
      isRedFlag = redFlagReasons.length > 0;
    }

    // Build comment
    let comment: string | null = null;
    if (note) {
      comment = note.slice(0, 500);
    }

    // Prepare feedback data - pain_type must match DB constraint
    const dbPainType = pain_type === 'tendon' ? null : pain_type; // DB allows only muscle/joint

    const feedbackData = {
      training_session_id: trainingSessionId,
      client_id: clientId,
      user_id: userId,
      training_date: trainingDate,
      feedback_request_id: feedbackRequestId,
      source,
      is_processed: false,
      // Values
      soreness,
      body_feel,
      energy_rating: energy,
      pain,
      session_fit,
      difficulty,
      fun,
      // Pain data
      pain_area: pain_areas?.length ? pain_areas.join(", ") : null,
      pain_area_other: pain_area_other || null,
      pain_area_intensities: pain_area_intensities && Object.keys(pain_area_intensities).length > 0 
        ? pain_area_intensities 
        : null,
      pain_type: dbPainType,
      // Sleep data
      sleep_after: sleep_after || null,
      sleep_hours: sleep_hours ?? null,
      // Comment
      comment,
      // Red flags
      is_red_flag: isRedFlag,
      red_flag_reasons: redFlagReasons.length > 0 ? redFlagReasons : null,
      // Backward compatibility (required fields)
      rpe_rating: difficulty,
      fatigue_level: Math.min(5, Math.max(1, Math.ceil(soreness / 2))),
      mood_rating: Math.min(5, Math.max(1, Math.ceil(fun / 2))),
      technique_rating: Math.min(5, Math.max(1, Math.ceil(session_fit / 2))),
      energy_level: energy >= 7 ? "stable" : energy >= 4 ? "better_end" : "low_entire",
      goal_relevance: session_fit >= 7 ? "yes" : session_fit >= 4 ? "partially" : "no",
    };

    console.log(`[${requestId}] Inserting feedback for client ${clientId}, session ${trainingSessionId}`);

    const { data: feedback, error: feedbackError } = await supabase
      .from("training_feedback")
      .insert(feedbackData)
      .select()
      .single();

    if (feedbackError) {
      console.error(`[${requestId}] Feedback insert error:`, feedbackError);
      throw new Error(`Chyba při ukládání zpětné vazby: ${feedbackError.message}`);
    }

    // Update feedback request if from public link
    if (feedbackRequestId) {
      await supabase
        .from("feedback_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", feedbackRequestId);

      await supabase.from("feedback_event_log").insert({
        feedback_request_id: feedbackRequestId,
        event_type: "SUBMITTED",
        meta: { feedback_id: feedback.id, is_red_flag: isRedFlag, source },
      });
    }

    // Create notifications
    const painTypeLabel = pain_type === 'muscle' ? 'sval' : pain_type === 'joint' ? 'kloub' : pain_type === 'tendon' ? 'šlacha' : null;
    const feedbackPreview = [
      `💪 Svalovka: ${soreness}/10`,
      `🧘 Pocit: ${body_feel}/10`,
      `⚡ Energie: ${energy}/10`,
      pain > 1 ? `🩹 Bolest: ${pain}/10${painTypeLabel ? ` (${painTypeLabel})` : ''}` : null,
      `🏋️ Náročnost: ${difficulty}/10`,
    ].filter(Boolean).join(" | ");

    await supabase.from("notifications").insert({
      user_id: userId,
      client_id: clientId,
      type: "feedback_received",
      title: "📬 Nová zpětná vazba",
      message: `${clientName || "Klient"}: ${feedbackPreview}`,
      entity_type: "training",
      entity_id: trainingSessionId,
      severity: "info",
    });

    if (isRedFlag) {
      const severity = pain >= 8 || body_feel <= 2 ? "critical" : "warning";
      await supabase.from("notifications").insert({
        user_id: userId,
        client_id: clientId,
        type: "feedback_red_flag",
        title: "⚠️ Red flag - vyžaduje pozornost",
        message: `${clientName || "Klient"}: ${redFlagReasons.join(", ")}`,
        entity_type: "training",
        entity_id: trainingSessionId,
        severity,
      });
    }

    // Mark client portal notification as completed
    if (source === "portal") {
      await supabase
        .from("client_portal_notifications")
        .update({ action_completed: true, is_read: true })
        .eq("client_id", clientId)
        .eq("type", "feedback_reminder")
        .contains("metadata", { training_session_id: trainingSessionId });
    }

    console.log(`[${requestId}] Feedback submitted successfully: ${feedback.id}`);

    return new Response(
      JSON.stringify({ success: true, feedbackId: feedback.id, isRedFlag }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message || "Interní chyba serveru", code: "SERVER_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
