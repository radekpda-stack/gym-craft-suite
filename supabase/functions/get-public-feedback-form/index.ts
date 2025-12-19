import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per IP

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

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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

    // Validate token format
    if (!isValidUUID(token)) {
      console.warn(`Invalid token format from IP ${clientIP}: ${token.substring(0, 20)}...`);
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
          clientGender: request.clients?.gender || null,
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
