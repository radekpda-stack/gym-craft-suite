import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max submissions per window per IP (lower for submissions)

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("cf-connecting-ip") || 
         "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  // Reset window if expired
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  // Increment and check
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for IP: ${ip}, count: ${entry.count}`);
    return true;
  }
  
  return false;
}

// Dynamic feedback schema - accepts any numeric values
const feedbackSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  values: z.record(z.string(), z.number().int().min(1).max(10)),
  pain_area: z.string().max(200).optional(),
  pain_areas: z.array(z.string().max(50)).optional(),
  pain_area_notes: z.record(z.string(), z.string().max(100)).optional(),
  pain_area_intensities: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
  pain_area_side: z.enum(['left', 'right', 'both']).optional(),
  pain_area_other: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
});

// Red flag detection thresholds
const RED_FLAG_THRESHOLDS = {
  pain: 7,
  body_feel: 3,
};

// Helper to build comment with pain area notes
function buildComment(note: string | undefined, painAreaNotes: Record<string, string> | undefined): string | null {
  const parts: string[] = [];
  
  if (note) {
    parts.push(note);
  }
  
  if (painAreaNotes && Object.keys(painAreaNotes).length > 0) {
    const noteEntries = Object.entries(painAreaNotes)
      .map(([area, areaNote]) => `${area}: ${areaNote}`)
      .join('; ');
    parts.push(`[Bolest: ${noteEntries}]`);
  }
  
  const combined = parts.join(' | ');
  return combined ? combined.slice(0, 500) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit hit for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Příliš mnoho požadavků. Zkuste to později.", code: "RATE_LIMITED" }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const { token, values, pain_area, pain_areas, pain_area_notes, pain_area_intensities, pain_area_side, pain_area_other, note } = parseResult.data;

    console.log(`Processing public feedback submission for token: ${token}`);
    console.log(`Values received:`, values);

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

    // Extract standard values with fallbacks
    const soreness = values.soreness ?? 5;
    const body_feel = values.body_feel ?? 5;
    const energy = values.energy ?? 5;
    const pain = values.pain ?? 1;
    const session_fit = values.session_fit ?? 5;
    const difficulty = values.difficulty ?? 5;
    const fun = values.fun ?? 5;

    // Detect red flags
    const redFlagReasons: string[] = [];
    if (pain >= painThreshold) {
      redFlagReasons.push(`Vysoká bolest (${pain}/10)`);
    }
    if (body_feel <= bodyFeelThreshold) {
      redFlagReasons.push(`Nízký pocit v těle (${body_feel}/10)`);
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

    // Create feedback entry
    const trainingDate = request.training_sessions?.date || new Date().toISOString();
    
    const feedbackData = {
      training_session_id: request.training_session_id,
      client_id: request.client_id,
      user_id: request.user_id,
      training_date: trainingDate,
      feedback_request_id: request.id,
      source: "link",
      is_processed: false,
      // Dynamic values
      soreness,
      body_feel,
      energy_rating: energy,
      pain,
      session_fit,
      difficulty,
      fun,
      pain_area: pain_area || null,
      pain_area_other: pain_area_other || null,
      pain_area_intensities: pain_area_intensities && Object.keys(pain_area_intensities).length > 0 
        ? pain_area_intensities 
        : null,
      // Include notes in comment if present
      comment: buildComment(note, pain_area_notes),
      is_red_flag: isRedFlag,
      red_flag_reasons: redFlagReasons.length > 0 ? redFlagReasons : null,
      // Backward compatibility fields
      rpe_rating: difficulty,
      fatigue_level: Math.min(5, Math.max(1, Math.ceil(soreness / 2))),
      mood_rating: Math.min(5, Math.max(1, Math.ceil(fun / 2))),
      technique_rating: Math.min(5, Math.max(1, Math.ceil(session_fit / 2))),
      energy_level: energy >= 7 ? "stable" : energy >= 4 ? "better_end" : "low_entire",
      goal_relevance: session_fit >= 7 ? "yes" : session_fit >= 4 ? "partially" : "no",
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

    // Create notification for trainer with feedback preview
    const feedbackPreview = [
      `💪 Svalovka: ${soreness}/10`,
      `🧘 Pocit: ${body_feel}/10`,
      `⚡ Energie: ${energy}/10`,
      pain > 1 ? `🩹 Bolest: ${pain}/10` : null,
      `🏋️ Náročnost: ${difficulty}/10`,
      `😊 Zábava: ${fun}/10`,
    ].filter(Boolean).join(" | ");

    await supabase
      .from("notifications")
      .insert({
        user_id: request.user_id,
        client_id: request.client_id,
        type: "feedback_received",
        title: "📬 Nová zpětná vazba",
        message: `${request.clients?.name || "Klient"}: ${feedbackPreview}`,
        entity_type: "training",
        entity_id: request.training_session_id,
        severity: "info",
      });

    // Create red flag notification if applicable
    if (isRedFlag) {
      const severity = pain >= 8 || body_feel <= 2 ? "critical" : "warning";
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

      const highPainCount = recentFeedbacks.filter(f => f.pain && f.pain >= 5).length;
      if (highPainCount >= 3) {
        trendAlerts.push(`Opakovaná vysoká bolest (${highPainCount}x za sebou)`);
      }

      const lowBodyFeelCount = recentFeedbacks.filter(f => f.body_feel && f.body_feel <= 4).length;
      if (lowBodyFeelCount >= 3) {
        trendAlerts.push(`Opakovaně nízký pocit v těle (${lowBodyFeelCount}x za sebou)`);
      }

      const highSorenessCount = recentFeedbacks.filter(f => f.soreness && f.soreness >= 6).length;
      if (highSorenessCount >= 3) {
        trendAlerts.push(`Opakovaně vysoká svalová únava (${highSorenessCount}x za sebou)`);
      }

      const lowEnergyCount = recentFeedbacks.filter(f => f.energy_rating && f.energy_rating <= 4).length;
      if (lowEnergyCount >= 3) {
        trendAlerts.push(`Opakovaně nízká energie (${lowEnergyCount}x za sebou)`);
      }

      const lowFunCount = recentFeedbacks.filter(f => f.fun && f.fun <= 4).length;
      if (lowFunCount >= 3) {
        trendAlerts.push(`Opakovaně nízká zábava (${lowFunCount}x za sebou)`);
      }

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
