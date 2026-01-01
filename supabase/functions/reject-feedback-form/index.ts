import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

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
  
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const inputSchema = z.object({
  token: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
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
    const parseResult = inputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Neplatná data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { token, reason } = parseResult.data;

    console.log(`Rejecting feedback form for token: ${token}`);

    // Find the feedback request by token
    const { data: request, error: requestError } = await supabase
      .from("feedback_requests")
      .select("id, user_id, client_id, status, clients(name)")
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

    // Check if already completed or rejected
    if (request.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Zpětná vazba již byla vyplněna", code: "ALREADY_COMPLETED" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update feedback request with rejection
    const { error: updateError } = await supabase
      .from("feedback_requests")
      .update({
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || "Klient uvedl, že není správný příjemce",
        status: "cancelled",
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("Error updating feedback request:", updateError);
      throw new Error("Chyba při aktualizaci");
    }

    // Log the rejection event
    await supabase
      .from("feedback_event_log")
      .insert({
        feedback_request_id: request.id,
        event_type: "REJECTED",
        meta: {
          reason: reason || "Klient uvedl, že není správný příjemce",
          ip_hash: clientIP.split(".").slice(0, 2).join(".") + ".x.x", // Partial IP for privacy
        },
      });

    // Create notification for trainer
    await supabase
      .from("notifications")
      .insert({
        user_id: request.user_id,
        client_id: request.client_id,
        type: "feedback_rejected",
        title: "⚠️ Odmítnutý feedback formulář",
        message: `Klient "${(request as any).clients?.name || "Neznámý"}" označil, že formulář nepatří jemu. ${reason ? `Důvod: ${reason}` : ""}`,
        entity_type: "feedback",
        entity_id: request.id,
        severity: "warning",
      });

    console.log(`Feedback form rejected successfully for request: ${request.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Děkujeme za upozornění. Formulář byl označen jako nesprávně doručený." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in reject-feedback-form:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
