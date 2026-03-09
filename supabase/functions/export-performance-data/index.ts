import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Simple API key auth
  const apiKey = req.headers.get("x-client-apikey");
  const expectedKey = Deno.env.get("EXPORT_API_KEY");

  if (!expectedKey) {
    return new Response(JSON.stringify({ error: "EXPORT_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const table = url.searchParams.get("table") || "all";
  const userId = url.searchParams.get("user_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10000"), 50000);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const result: Record<string, unknown> = {};

    // Exercise entries (strength)
    if (table === "all" || table === "exercise_entries") {
      let q = supabase
        .from("exercise_entries")
        .select("*, clients!client_id(name)")
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      result.exercise_entries = data;
    }

    // Cardio entries
    if (table === "all" || table === "cardio_entries") {
      let q = supabase
        .from("cardio_entries")
        .select("*, clients!client_id(name)")
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      result.cardio_entries = data;
    }

    // Skill entries
    if (table === "all" || table === "skill_entries") {
      let q = supabase
        .from("skill_entries")
        .select("*, clients!client_id(name)")
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      result.skill_entries = data;
    }

    // Clients (basic info)
    if (table === "all" || table === "clients") {
      let q = supabase
        .from("clients")
        .select("id, name, email, phone, date_of_birth, gender, status, created_at")
        .range(offset, offset + limit - 1);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      result.clients = data;
    }

    // Exercises (library)
    if (table === "all" || table === "exercises") {
      let q = supabase
        .from("exercises")
        .select("id, name, name_cs, category, equipment, muscle_groups, is_unilateral, is_time_based, is_bodyweight")
        .eq("is_archived", false);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      result.exercises = data;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
