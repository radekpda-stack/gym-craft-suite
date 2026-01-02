import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per key

// Generate a unique rate limit key - never use shared "unknown" to prevent global blocking
function getRateLimitKey(req: Request, token?: string): string {
  // Try multiple headers for IP detection
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             req.headers.get("cf-connecting-ip") ||
             req.headers.get("x-real-ip") ||
             req.headers.get("x-client-ip") ||
             req.headers.get("true-client-ip");
  
  if (ip && ip !== "unknown") {
    return `ip:${ip}`;
  }
  
  // Fallback: use token + user-agent hash to create per-device key
  const userAgent = req.headers.get("user-agent") || "";
  const acceptLang = req.headers.get("accept-language") || "";
  const fallbackKey = `${token || "anon"}-${userAgent.slice(0, 50)}-${acceptLang.slice(0, 20)}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fallbackKey.length; i++) {
    const char = fallbackKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `fallback:${Math.abs(hash).toString(36)}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return false;
  }
  
  // Reset window if expired
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstRequest: now });
    return false;
  }
  
  // Increment and check
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for key: ${key}, count: ${entry.count}`);
    return true;
  }
  
  return false;
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get token first for rate limit key
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    
    // If not in query params, try to get from body
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body.token;
      } catch (e) {
        console.warn(`[${requestId}] Failed to parse request body:`, e);
      }
    }

    // Rate limiting check with improved key generation
    const rateLimitKey = getRateLimitKey(req, token || undefined);
    console.log(`[${requestId}] Rate limit key: ${rateLimitKey.slice(0, 30)}...`);
    
    if (isRateLimited(rateLimitKey)) {
      console.warn(`[${requestId}] Rate limit hit for key: ${rateLimitKey}`);
      return new Response(
        JSON.stringify({ error: "Příliš mnoho požadavků. Zkuste to za chvíli.", code: "RATE_LIMITED" }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[${requestId}] Token: ${token ? token.substring(0, 8) + '...' : 'null'}`);

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token je povinný", code: "MISSING_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Trim whitespace and validate token format
    token = token.trim();
    
    // Validate token format
    if (!isValidUUID(token)) {
      console.warn(`[${requestId}] Invalid token format: ${token.substring(0, 20)}... (length: ${token.length})`);
      return new Response(
        JSON.stringify({ error: "Neplatný formát tokenu", code: "INVALID_TOKEN" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Fetching feedback form for token: ${token}`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select(`
        *,
        clients(name, gender),
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

    // Check if rejected
    if (request.rejected_at) {
      return new Response(
        JSON.stringify({ error: "Tento formulář byl označen jako nesprávně doručený", code: "REJECTED" }),
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

    // Track opened_at if not already set (first open) and log event
    if (!request.opened_at) {
      await supabase
        .from("feedback_requests")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", request.id);
      
      // Log OPENED event
      await supabase
        .from("feedback_event_log")
        .insert({
          feedback_request_id: request.id,
          event_type: "OPENED",
          meta: {
            key_hash: rateLimitKey.slice(0, 20),
            user_agent: req.headers.get("user-agent")?.substring(0, 200) || null,
          },
        });
      
      console.log(`[${requestId}] Marked feedback request ${request.id} as opened`);
    }

    // Get user's feedback settings for questions configuration
    const { data: feedbackSettings } = await supabase
      .from("feedback_settings")
      .select("feedback_questions")
      .eq("user_id", request.user_id)
      .maybeSingle();

    console.log(`Loaded feedback settings for user ${request.user_id}:`, feedbackSettings?.feedback_questions ? 'custom config' : 'default config');

    // Get trainer name from profiles table (separate query to avoid join issues)
    let trainerName = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", request.user_id)
      .maybeSingle();
    
    if (profile) {
      trainerName = profile.full_name;
    }

    // Return form data with trainer info
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clientName: request.clients?.name || "Klient",
          clientGender: request.clients?.gender || null,
          trainingDate: request.training_sessions?.date || null,
          trainingNotes: request.training_sessions?.notes || null,
          trainerName: trainerName,
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
