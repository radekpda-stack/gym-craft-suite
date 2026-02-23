import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find trainer by slug
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, public_stats_enabled, created_at, bio, specializations, experience_years")
      .eq("public_stats_slug", slug)
      .eq("public_stats_enabled", true)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Trainer not found or stats not public" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = profile.id;

    // Parallel data fetching
    const [
      clientsResult,
      sessionsResult,
      exerciseEntriesResult,
      exercisesResult,
      currentMonthResult,
    ] = await Promise.all([
      // Active clients
      supabase
        .from("clients")
        .select("id, created_at, status")
        .eq("user_id", userId),

      // All training sessions
      supabase
        .from("training_sessions")
        .select("id, date, status, rpe, duration_minutes")
        .eq("user_id", userId)
        .eq("status", "completed"),

      // Exercise entries for PRs (only weight-based)
      supabase
        .from("exercise_entries")
        .select("exercise_id, weight, reps, is_pr, exercises(name)")
        .eq("user_id", userId)
        .eq("is_pr", true)
        .order("weight", { ascending: false })
        .limit(200),

      // Total unique exercises
      supabase
        .from("exercises")
        .select("id")
        .eq("user_id", userId),

      // Current month sessions
      supabase
        .from("training_sessions")
        .select("id, date, status")
        .eq("user_id", userId)
        .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const clients = clientsResult.data || [];
    const sessions = sessionsResult.data || [];
    const exerciseEntries = exerciseEntriesResult.data || [];
    const exercises = exercisesResult.data || [];
    const currentMonthSessions = currentMonthResult.data || [];

    // Compute metrics
    const activeClients = clients.filter((c: any) => c.status === "active").length;
    const totalClients = clients.length;

    // Total training hours
    const totalHours = sessions.reduce((sum: number, s: any) => {
      return sum + (s.duration_minutes || 60) / 60;
    }, 0);

    // Current month trainings
    const currentMonthCompleted = currentMonthSessions.filter(
      (s: any) => s.status === "completed"
    ).length;
    const currentMonthTotal = currentMonthSessions.length;

    // Average RPE
    const sessionsWithRpe = sessions.filter((s: any) => s.rpe != null);
    const avgRpe =
      sessionsWithRpe.length > 0
        ? sessionsWithRpe.reduce((sum: number, s: any) => sum + s.rpe, 0) /
          sessionsWithRpe.length
        : null;

    // Monthly training trend (last 12 months)
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = sessions.filter((s: any) => {
        const sd = new Date(s.date);
        return sd.getFullYear() === year && sd.getMonth() === month;
      }).length;
      monthlyTrend.push({
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
        count,
      });
    }

    // Monthly average for trend comparison
    const avgMonthly =
      monthlyTrend.length > 0
        ? monthlyTrend.reduce((s, m) => s + m.count, 0) / monthlyTrend.length
        : 0;
    const trendPercent =
      avgMonthly > 0
        ? Math.round(
            ((currentMonthCompleted - avgMonthly) / avgMonthly) * 100
          )
        : 0;

    // Top PRs - group by exercise name, pick best weight
    const prMap = new Map<string, { weight: number; reps: number; name: string }>();
    for (const entry of exerciseEntries) {
      const name = (entry as any).exercises?.name || "Unknown";
      const existing = prMap.get(name);
      if (!existing || (entry.weight || 0) > existing.weight) {
        prMap.set(name, {
          weight: entry.weight || 0,
          reps: entry.reps || 0,
          name,
        });
      }
    }
    // Sort by weight desc and take top 6
    const topPRs = Array.from(prMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);

    // First training date
    const firstTraining =
      sessions.length > 0
        ? sessions.reduce((min: string, s: any) =>
            s.date < min ? s.date : min, sessions[0].date)
        : null;

    // Capacity utilization (client_limit from profile)
    const { data: capacityProfile } = await supabase
      .from("profiles")
      .select("client_limit")
      .eq("id", userId)
      .maybeSingle();
    
    const clientLimit = capacityProfile?.client_limit || 30;
    const capacityUtilization = Math.round((activeClients / clientLimit) * 100);

    const stats = {
      trainer: {
        displayName: profile.display_name || "Trenér",
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        specializations: profile.specializations,
        experienceYears: profile.experience_years,
      },
      metrics: {
        activeClients,
        totalClients,
        clientLimit,
        capacityUtilization: Math.min(capacityUtilization, 100),
        totalHours: Math.round(totalHours),
        totalTrainings: sessions.length,
        currentMonthTrainings: currentMonthCompleted,
        currentMonthTotal,
        trendPercent,
        avgRpe: avgRpe ? Math.round(avgRpe * 10) / 10 : null,
        uniqueExercises: exercises.length,
        trainerSince: firstTraining,
      },
      topPRs,
      monthlyTrend: monthlyTrend.map((m) => ({ value: m.count })),
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in public-trainer-stats:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
