import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const last90days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel data fetching
    const [
      clientsRes,
      clientsFullRes,
      ledgerRes,
      trainingsThisMonthRes,
      trainingsLastMonthRes,
      trainingsYearRes,
      transactionsRes,
      productSalesRes,
      expensesRes,
      productsRes,
      feedbackRes,
      groupBalancesRes,
      todayScheduleRes,
      tomorrowScheduleRes,
      cancelledLast30Res,
      exercisePRsRes,
      exerciseVolumesRes,
      trainingPlansRes,
      feedbackRequestsRes,
      todaySalesRes,
      // NEW data sources
      measurementsRes,
      diagnosticsRes,
      clientPackagesRes,
      clientXpRes,
      loyaltyRes,
      challengesRes,
      challengeSubmissionsRes,
      nutritionSessionsRes,
      stockMovementsRes,
      testDefinitionsRes,
      testSessionsRes,
      assignedWorkoutsRes,
      preCheckinRes,
      clientBadgesRes,
      badgeDefsRes,
      priceListsRes,
      priceItemsRes,
      recurringSchedulesRes,
    ] = await Promise.all([
      supabase.from("vw_client_ledger_balances").select("*").eq("user_id", userId),
      supabase.from("clients").select("id, name, health_restrictions, training_goals, is_archived, training_start_date, birth_date, gender, payment_mode").eq("user_id", userId).eq("is_archived", false),
      supabase.from("credit_transactions").select("*").eq("user_id", userId).gte("created_at", last90days).order("created_at", { ascending: false }).limit(500),
      supabase.from("training_sessions").select("id, date, status, duration, training_type, price, final_price, payment_status, participant_count, clients(name)").eq("user_id", userId).gte("date", thisMonthStart).order("date", { ascending: false }),
      supabase.from("training_sessions").select("id, date, status, duration, training_type, price, final_price, payment_status, participant_count, clients(name)").eq("user_id", userId).gte("date", lastMonthStart).lt("date", thisMonthStart).order("date", { ascending: false }),
      supabase.from("training_sessions").select("id, date, status, training_type, price, final_price, payment_status, duration, participant_count, client_id, clients(name)").eq("user_id", userId).gte("date", thisYearStart).eq("status", "completed"),
      supabase.from("credit_transactions").select("*").eq("user_id", userId).gte("created_at", thisYearStart).in("type", ["payment", "training", "product", "canceled_training"]).order("created_at", { ascending: false }).limit(1000),
      supabase.from("product_sales").select("*, products(name, sell_price, cost_price)").eq("user_id", userId).gte("created_at", last90days).order("created_at", { ascending: false }).limit(200),
      supabase.from("business_expenses").select("*").eq("user_id", userId).gte("date", thisYearStart).order("date", { ascending: false }).limit(200),
      supabase.from("products").select("id, name, sell_price, cost_price, stock_quantity, category").eq("user_id", userId).eq("is_active", true),
      supabase.from("training_feedback").select("id, client_id, training_date, body_feel, pain, rpe_rating, is_red_flag, notes, created_at").eq("user_id", userId).gte("training_date", last90days).order("training_date", { ascending: false }).limit(500),
      supabase.from("vw_group_ledger_balances").select("*").eq("user_id", userId),
      supabase.from("training_sessions").select("id, date, status, duration, training_type, clients(name), participant_count").eq("user_id", userId).gte("date", today).lt("date", tomorrow).order("date", { ascending: true }),
      supabase.from("training_sessions").select("id, date, status, duration, training_type, clients(name), participant_count").eq("user_id", userId).gte("date", tomorrow).lt("date", dayAfterTomorrow).order("date", { ascending: true }),
      supabase.from("training_sessions").select("id, date, status, final_price, clients(name)").eq("user_id", userId).gte("date", last30days).in("status", ["cancelled", "canceled"]),
      supabase.from("exercise_entries").select("id, exercise_name, client_id, date, sets, reps, weight_kg, is_pr, is_bodyweight").eq("user_id", userId).eq("is_pr", true).order("date", { ascending: false }).limit(100),
      supabase.from("exercise_entries").select("client_id, sets, reps, weight_kg, date").eq("user_id", userId).gte("date", last90days).limit(1000),
      supabase.from("training_plans").select("id, client_id, name, primary_goal, phase, period_start, period_end, days_per_week, is_active, notes").eq("user_id", userId).eq("is_active", true),
      supabase.from("feedback_requests").select("id, training_session_id, status, created_at, sent_at, completed_at").eq("user_id", userId).gte("created_at", last90days),
      supabase.from("product_sales").select("*, products(name, sell_price, cost_price), clients(name)").eq("user_id", userId).gte("created_at", `${today}T00:00:00`).lt("created_at", `${tomorrow}T00:00:00`).order("created_at", { ascending: false }),
      // NEW queries
      supabase.from("measurements").select("id, client_id, date, weight, body_fat_percentage, muscle_mass, waist, chest, hips, bmi, visceral_fat, water_percent, notes").eq("user_id", userId).order("date", { ascending: false }).limit(200),
      supabase.from("diagnostics").select("id, client_id, date, area_type, area_name, findings, notes").eq("user_id", userId).order("date", { ascending: false }).limit(100),
      supabase.from("client_packages").select("id, client_id, package_name, trainings_total, trainings_used, price_paid, is_active, purchased_at, expires_at").eq("user_id", userId).eq("is_active", true),
      supabase.from("client_xp").select("client_id, total_xp, level, level_xp, xp_to_next, last_xp_date, updated_at"),
      supabase.from("loyalty_balance").select("client_id, points_balance, lifetime_points, updated_at"),
      supabase.from("challenges").select("id, title, status, start_at, end_at, scoring_type, primary_metric").eq("created_by_user_id", userId).order("start_at", { ascending: false }).limit(20),
      supabase.from("challenge_submissions").select("id, challenge_id, client_id, score_primary, status, submitted_at, is_winner").order("submitted_at", { ascending: false }).limit(100),
      supabase.from("nutrition_log_sessions").select("id, client_id, start_date, end_date, status, created_at").eq("user_id", userId).gte("start_date", last30days).limit(500),
      supabase.from("stock_movements").select("id, product_id, user_id, movement_type, quantity, unit_price, created_at").eq("user_id", userId).gte("created_at", last30days).order("created_at", { ascending: false }).limit(200),
      supabase.from("test_definitions").select("id, name, name_cs, category, primary_metric_key, primary_metric_better, is_active").eq("is_active", true),
      supabase.from("test_sessions").select("id, test_definition_id, client_id, date_time, metrics_json, is_valid, rpe_1_10, notes").eq("user_id", userId).order("date_time", { ascending: false }).limit(200),
      supabase.from("client_assigned_workouts").select("id, client_id, title, status, due_date, completed_at, created_at").eq("trainer_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("pre_session_checkins").select("id, client_id, training_session_id, energy_level, sleep_quality, pain_area, pain_notes, notes, created_at").eq("user_id", userId).gte("created_at", last30days).order("created_at", { ascending: false }).limit(100),
      supabase.from("client_badges").select("id, client_id, badge_id, earned_at, progress_current, progress_target").order("earned_at", { ascending: false }).limit(50),
      supabase.from("badge_definitions").select("id, name, description, rarity, icon_key, is_active").eq("is_active", true),
      supabase.from("price_lists").select("id, name, is_active, effective_from, description").eq("user_id", userId).eq("is_active", true),
      supabase.from("price_items").select("id, price_list_id, service_id, unit_price_czk"),
      supabase.from("client_recurring_schedules").select("id, client_id, day_of_week, time, duration, is_active, notes").eq("user_id", userId).eq("is_active", true),
    ]);

    const clients = clientsRes.data || [];
    const clientsFull = clientsFullRes.data || [];
    const ledger = ledgerRes.data || [];
    const trainingsThisMonth = trainingsThisMonthRes.data || [];
    const trainingsLastMonth = trainingsLastMonthRes.data || [];
    const trainingsYear = trainingsYearRes.data || [];
    const transactions = transactionsRes.data || [];
    const productSales = productSalesRes.data || [];
    const expenses = expensesRes.data || [];
    const products = productsRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const groupBalances = groupBalancesRes.data || [];
    const todaySchedule = todayScheduleRes.data || [];
    const tomorrowSchedule = tomorrowScheduleRes.data || [];
    const cancelledLast30 = cancelledLast30Res.data || [];
    const exercisePRs = exercisePRsRes.data || [];
    const exerciseVolumes = exerciseVolumesRes.data || [];
    const trainingPlans = trainingPlansRes.data || [];
    const feedbackRequests = feedbackRequestsRes.data || [];
    const todaySales = todaySalesRes.data || [];
    // NEW data extractions
    const measurements = measurementsRes.data || [];
    const diagnostics = diagnosticsRes.data || [];
    const clientPackages = clientPackagesRes.data || [];
    // Filter client_xp and loyalty_balance by trainer's client IDs (no user_id column)
    const clientIds = new Set(clientsFull.map((c: any) => c.id));
    const clientXp = (clientXpRes.data || []).filter((x: any) => clientIds.has(x.client_id));
    const loyaltyBalances = (loyaltyRes.data || []).filter((l: any) => clientIds.has(l.client_id));
    const challenges = challengesRes.data || [];
    const challengeSubmissions = challengeSubmissionsRes.data || [];
    const nutritionSessions = nutritionSessionsRes.data || [];
    const stockMovements = stockMovementsRes.data || [];
    const testDefinitions = testDefinitionsRes.data || [];
    const testSessions = testSessionsRes.data || [];
    const assignedWorkouts = assignedWorkoutsRes.data || [];
    const preCheckins = preCheckinRes.data || [];
    const clientBadges = (clientBadgesRes.data || []).filter((b: any) => clientIds.has(b.client_id));
    const badgeDefs = badgeDefsRes.data || [];
    const priceLists = priceListsRes.data || [];
    const priceListIds = new Set(priceLists.map((pl: any) => pl.id));
    const priceItems = (priceItemsRes.data || []).filter((pi: any) => priceListIds.has(pi.price_list_id));
    const recurringSchedules = recurringSchedulesRes.data || [];

    // Build client name map
    const clientNameMap: Record<string, string> = {};
    clientsFull.forEach((c: any) => { clientNameMap[c.id] = c.name; });

    // Compute aggregates
    const totalClientsBalance = clients.reduce((s: number, c: any) => s + (c.balance || 0), 0);
    const clientsWithDebt = clients.filter((c: any) => (c.balance || 0) < 0);
    const clientsWithCredit = clients.filter((c: any) => (c.balance || 0) > 0);

    const completedThisMonth = trainingsThisMonth.filter((t: any) => t.status === "completed");
    const canceledThisMonth = trainingsThisMonth.filter((t: any) => t.status === "canceled" || t.status === "cancelled");
    const completedLastMonth = trainingsLastMonth.filter((t: any) => t.status === "completed");

    const incomeThisYear = transactions.filter((t: any) => t.type === "payment").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const trainingSpendThisYear = transactions.filter((t: any) => t.type === "training").reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    const productIncomeThisYear = transactions.filter((t: any) => t.type === "product").reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    const cancelFees = transactions.filter((t: any) => t.type === "canceled_training").reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

    const totalExpensesYear = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    const salesRevenue90d = productSales.reduce((s: number, ps: any) => s + ((ps.products?.sell_price || 0) * (ps.quantity || 1)), 0);
    const salesCost90d = productSales.reduce((s: number, ps: any) => s + ((ps.products?.cost_price || 0) * (ps.quantity || 1)), 0);

    const lowStockProducts = products.filter((p: any) => (p.stock_quantity || 0) <= 3 && (p.stock_quantity || 0) >= 0);

    const totalDurationYear = trainingsYear.reduce((s: number, t: any) => s + (t.duration || 0), 0);
    const avgDuration = trainingsYear.length > 0 ? Math.round(totalDurationYear / trainingsYear.length) : 0;

    // Hourly rate calculation
    const trainingsWithPrice = trainingsYear.filter((t: any) => (t.final_price || t.price) && t.duration);
    const totalRevForHourly = trainingsWithPrice.reduce((s: number, t: any) => s + (t.final_price || t.price || 0), 0);
    const totalHoursForHourly = trainingsWithPrice.reduce((s: number, t: any) => s + (t.duration || 0), 0) / 60;
    const hourlyRate = totalHoursForHourly > 0 ? Math.round(totalRevForHourly / totalHoursForHourly) : 0;

    // Training type breakdown
    const typeBreakdown: Record<string, number> = {};
    trainingsYear.forEach((t: any) => {
      const type = t.training_type || "solo";
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    // Monthly training counts for trend
    const monthlyTrainings: Record<string, number> = {};
    trainingsYear.forEach((t: any) => {
      const month = t.date?.substring(0, 7);
      if (month) monthlyTrainings[month] = (monthlyTrainings[month] || 0) + 1;
    });

    // Expense categories
    const expenseCategories: Record<string, number> = {};
    expenses.forEach((e: any) => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + (e.amount || 0);
    });

    // Top clients by trainings and revenue
    const clientStats: Record<string, { name: string; count: number; revenue: number }> = {};
    trainingsYear.forEach((t: any) => {
      const cid = t.client_id;
      const cname = t.clients?.name || "Neznámý";
      if (!clientStats[cid]) clientStats[cid] = { name: cname, count: 0, revenue: 0 };
      clientStats[cid].count++;
      clientStats[cid].revenue += (t.final_price || t.price || 0);
    });
    const topClientsByRevenue = Object.values(clientStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topClientsByCount = Object.values(clientStats).sort((a, b) => b.count - a.count).slice(0, 10);

    // Cancellation stats (30 days)
    const totalLast30 = cancelledLast30.length;
    const trainingsLast30Res2 = trainingsThisMonth.length + cancelledLast30.length;
    const cancellationRate = trainingsLast30Res2 > 0 ? Math.round((totalLast30 / trainingsLast30Res2) * 100) : 0;
    const cancelFeeLast30 = cancelledLast30.reduce((s: number, t: any) => s + (t.final_price || 0), 0);

    // Feedback analysis
    const redFlags = feedbacks.filter((f: any) => f.is_red_flag);
    const feedbacksWithPain = feedbacks.filter((f: any) => f.pain && f.pain >= 3);
    const avgBodyFeel = feedbacks.filter((f: any) => f.body_feel).reduce((s: number, f: any) => s + f.body_feel, 0) / (feedbacks.filter((f: any) => f.body_feel).length || 1);
    const avgPain = feedbacks.filter((f: any) => f.pain != null).reduce((s: number, f: any) => s + f.pain, 0) / (feedbacks.filter((f: any) => f.pain != null).length || 1);

    // Recent feedbacks (last 7 days)
    const recentFeedbacks = feedbacks.filter((f: any) => f.training_date >= last7days.split("T")[0]);

    // Group balances summary
    const groupBalanceSummary = groupBalances.map((g: any) => `${g.group_name}: ${(g.ledger_balance || 0).toLocaleString("cs-CZ")} Kč`).join(", ");

    // Schedule formatting
    const formatSchedule = (items: any[]) => items.map((t: any) => {
      const time = t.date ? new Date(t.date).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) : "?";
      return `${time} - ${t.clients?.name || "?"} (${t.training_type || "solo"}${t.participant_count > 1 ? `, ${t.participant_count} os.` : ""}, ${t.duration || "?"} min) [${t.status}]`;
    }).join("\n") || "Žádné tréninky";

    // Health & Goals
    const clientsWithHealth = clientsFull.filter((c: any) => c.health_restrictions && c.health_restrictions.trim() !== "");
    const clientsWithGoals = clientsFull.filter((c: any) => c.training_goals && c.training_goals.length > 0);
    
    const healthSummary = clientsWithHealth.length > 0
      ? clientsWithHealth.map((c: any) => `- ${c.name}: ${c.health_restrictions}`).join("\n")
      : "Žádná zdravotní omezení";
    
    const goalsSummary = clientsWithGoals.length > 0
      ? clientsWithGoals.map((c: any) => `- ${c.name}: ${(c.training_goals || []).join(", ")}`).join("\n")
      : "Žádné tréninkové cíle";

    // Exercise PRs
    const prSummary = exercisePRs.length > 0
      ? exercisePRs.slice(0, 30).map((pr: any) => {
          const clientName = clientNameMap[pr.client_id] || "?";
          const weight = pr.is_bodyweight ? "BW" : `${pr.weight_kg || 0} kg`;
          return `- ${pr.date} | ${clientName} | ${pr.exercise_name}: ${pr.sets}×${pr.reps || "?"} @ ${weight}`;
        }).join("\n")
      : "Žádné PR záznamy";

    // Volume analysis per client
    const clientVolumes: Record<string, number> = {};
    exerciseVolumes.forEach((e: any) => {
      const vol = (e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0);
      clientVolumes[e.client_id] = (clientVolumes[e.client_id] || 0) + vol;
    });
    const topVolumeClients = Object.entries(clientVolumes)
      .map(([cid, vol]) => ({ name: clientNameMap[cid] || "?", volume: vol as number }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // --- NEW: Training Plans ---
    const plansSummary = trainingPlans.length > 0
      ? trainingPlans.map((p: any) => {
          const clientName = clientNameMap[p.client_id] || "?";
          return `- ${clientName}: "${p.name}" | Cíl: ${p.primary_goal} | Fáze: ${p.phase} | ${p.days_per_week}× týdně | ${p.period_start}–${p.period_end || "neomezeno"}`;
        }).join("\n")
      : "Žádné aktivní plány";

    // --- NEW: Feedback Requests & Response Rate ---
    const totalFbRequests = feedbackRequests.length;
    const completedFbRequests = feedbackRequests.filter((r: any) => r.status === "completed");
    const pendingFbRequests = feedbackRequests.filter((r: any) => r.status === "pending");
    const fbResponseRate = totalFbRequests > 0 ? Math.round((completedFbRequests.length / totalFbRequests) * 100) : 0;
    
    // Average response time (completed only)
    const responseTimes = completedFbRequests
      .filter((r: any) => r.sent_at && r.completed_at)
      .map((r: any) => {
        const sent = new Date(r.sent_at).getTime();
        const completed = new Date(r.completed_at).getTime();
        return (completed - sent) / (1000 * 60 * 60); // hours
      });
    const avgResponseTimeHours = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length)
      : null;

    // --- NEW: Inactive / At-Risk Clients ---
    const clientLastTraining: Record<string, string> = {};
    trainingsYear.forEach((t: any) => {
      if (t.client_id && t.date) {
        if (!clientLastTraining[t.client_id] || t.date > clientLastTraining[t.client_id]) {
          clientLastTraining[t.client_id] = t.date;
        }
      }
    });

    const inactiveClients: { name: string; daysSince: number }[] = [];
    const atRiskClients: { name: string; daysSince: number; hadTrainings: number }[] = [];
    
    clientsFull.forEach((c: any) => {
      const lastDate = clientLastTraining[c.id];
      if (!lastDate) {
        // Never trained this year
        inactiveClients.push({ name: c.name, daysSince: -1 });
        return;
      }
      const daysSince = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        const totalTrainings = trainingsYear.filter((t: any) => t.client_id === c.id).length;
        if (totalTrainings >= 5) {
          atRiskClients.push({ name: c.name, daysSince, hadTrainings: totalTrainings });
        } else {
          inactiveClients.push({ name: c.name, daysSince });
        }
      } else if (daysSince > 14) {
        const totalTrainings = trainingsYear.filter((t: any) => t.client_id === c.id).length;
        if (totalTrainings >= 8) {
          atRiskClients.push({ name: c.name, daysSince, hadTrainings: totalTrainings });
        }
      }
    });

    const contextData = `
## FINANČNÍ DATA (aktuální k ${now.toLocaleDateString("cs-CZ")})

### Kreditní přehled
- Celkový zůstatek všech klientů: ${totalClientsBalance.toLocaleString("cs-CZ")} Kč
- Klienti s kreditem (${clientsWithCredit.length}): ${clientsWithCredit.slice(0, 15).map((c: any) => `${c.client_name}: ${c.balance?.toLocaleString("cs-CZ")} Kč`).join(", ")}
- Klienti s dluhem (${clientsWithDebt.length}): ${clientsWithDebt.map((c: any) => `${c.client_name}: ${c.balance?.toLocaleString("cs-CZ")} Kč`).join(", ") || "žádní"}

### Skupinové rozpočty
${groupBalanceSummary || "Žádné skupiny"}

### Hodinová sazba
- Skutečná hodinová sazba (rok ${now.getFullYear()}): ${hourlyRate.toLocaleString("cs-CZ")} Kč/hod
- Počet tréninků s cenou a délkou: ${trainingsWithPrice.length}
- Celkové tržby z tréninků: ${totalRevForHourly.toLocaleString("cs-CZ")} Kč
- Celkový čas: ${Math.round(totalHoursForHourly)} hodin

### Tréninky - tento měsíc
- Dokončeno: ${completedThisMonth.length}
- Zrušeno: ${canceledThisMonth.length}
- Celkem naplánováno/proběhlo: ${trainingsThisMonth.length}
- Srovnání s minulým měsícem: ${completedLastMonth.length} dokončených

### Tréninky - rok ${now.getFullYear()}
- Celkem dokončeno: ${trainingsYear.length}
- Celkový čas: ${Math.round(totalDurationYear / 60)} hodin
- Průměrná délka: ${avgDuration} min
- Rozpad typů: ${Object.entries(typeBreakdown).map(([k, v]) => `${k}: ${v}`).join(", ")}
- Měsíční trend: ${Object.entries(monthlyTrainings).sort().map(([m, c]) => `${m}: ${c}`).join(", ")}

### Storno statistika (posledních 30 dní)
- Zrušeno tréninků: ${totalLast30}
- Míra storna: ${cancellationRate}%
- Storno poplatky: ${cancelFeeLast30.toLocaleString("cs-CZ")} Kč
- Celkové storno poplatky (rok): ${cancelFees.toLocaleString("cs-CZ")} Kč

### Top 10 klientů dle tržeb (rok ${now.getFullYear()})
${topClientsByRevenue.map((c, i) => `${i + 1}. ${c.name}: ${c.revenue.toLocaleString("cs-CZ")} Kč (${c.count} tréninků)`).join("\n")}

### Top 10 klientů dle počtu tréninků
${topClientsByCount.map((c, i) => `${i + 1}. ${c.name}: ${c.count} tréninků (${c.revenue.toLocaleString("cs-CZ")} Kč)`).join("\n")}

### Příjmy - rok ${now.getFullYear()}
- Dobití kreditů: ${incomeThisYear.toLocaleString("cs-CZ")} Kč
- Čerpáno tréninky: ${trainingSpendThisYear.toLocaleString("cs-CZ")} Kč
- Čerpáno produkty: ${productIncomeThisYear.toLocaleString("cs-CZ")} Kč
- Storno poplatky: ${cancelFees.toLocaleString("cs-CZ")} Kč

### Prodeje produktů (posledních 90 dní)
- Tržby: ${salesRevenue90d.toLocaleString("cs-CZ")} Kč
- Náklady: ${salesCost90d.toLocaleString("cs-CZ")} Kč
- Hrubý zisk: ${(salesRevenue90d - salesCost90d).toLocaleString("cs-CZ")} Kč
- Marže: ${salesRevenue90d > 0 ? Math.round((salesRevenue90d - salesCost90d) / salesRevenue90d * 100) : 0}%
- Počet prodejů: ${productSales.length}

### Dnešní prodeje (${today})
- Počet prodejů dnes: ${todaySales.length}
- Tržby dnes: ${todaySales.reduce((s: number, ps: any) => s + ((ps.products?.sell_price || 0) * (ps.quantity || 1)), 0).toLocaleString("cs-CZ")} Kč
${todaySales.length > 0 ? todaySales.map((ps: any) => `  - ${new Date(ps.created_at).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} | ${ps.products?.name || "?"} × ${ps.quantity || 1} | ${((ps.products?.sell_price || 0) * (ps.quantity || 1)).toLocaleString("cs-CZ")} Kč | Klient: ${ps.clients?.name || "?"}`).join("\n") : "Žádné prodeje dnes"}

### Produkty na skladě
- Celkem aktivních: ${products.length}
- Nízké zásoby (≤3 ks): ${lowStockProducts.map((p: any) => `${p.name} (${p.stock_quantity} ks)`).join(", ") || "žádné"}

### Náklady - rok ${now.getFullYear()}
- Celkem: ${totalExpensesYear.toLocaleString("cs-CZ")} Kč
- Rozpad kategorií: ${Object.entries(expenseCategories).map(([k, v]) => `${k}: ${(v as number).toLocaleString("cs-CZ")} Kč`).join(", ")}

### Čistý zisk (odhad, rok ${now.getFullYear()})
- Příjmy (dobití): ${incomeThisYear.toLocaleString("cs-CZ")} Kč
- Tržby produkty: ${salesRevenue90d.toLocaleString("cs-CZ")} Kč (90 dní)
- Náklady: ${totalExpensesYear.toLocaleString("cs-CZ")} Kč

### Feedbacky klientů (posledních 90 dní)
- Celkem feedbacků: ${feedbacks.length}
- Průměrný pocit z těla (body_feel): ${avgBodyFeel.toFixed(1)}/5
- Průměrná bolest: ${avgPain.toFixed(1)}/5
- Red flagy: ${redFlags.length} ${redFlags.length > 0 ? `(${redFlags.slice(0, 5).map((f: any) => `${f.training_date}${f.notes ? ': ' + f.notes.substring(0, 50) : ''}`).join("; ")})` : ""}
- Klienti s bolestí ≥3: ${feedbacksWithPain.length}
- Feedbacky za posledních 7 dní: ${recentFeedbacks.length}
${recentFeedbacks.length > 0 ? recentFeedbacks.slice(0, 10).map((f: any) => `  - ${f.training_date}: body_feel=${f.body_feel || "?"}, pain=${f.pain || "?"}, rpe=${f.rpe_rating || "?"}${f.is_red_flag ? " ⚠️ RED FLAG" : ""}${f.notes ? ` "${f.notes.substring(0, 60)}"` : ""}`).join("\n") : ""}

### Feedback Response Rate (posledních 90 dní)
- Odeslaných feedback requestů: ${totalFbRequests}
- Dokončených: ${completedFbRequests.length}
- Čekajících: ${pendingFbRequests.length}
- Response rate: ${fbResponseRate}%
${avgResponseTimeHours !== null ? `- Průměrná doba odpovědi: ${avgResponseTimeHours} hodin` : ""}

### Zdravotní omezení klientů
- Klientů se zdravotním omezením: ${clientsWithHealth.length}
${healthSummary}

### Tréninkové cíle klientů
- Klientů s cíli: ${clientsWithGoals.length}
${goalsSummary}

### Aktivní tréninkové plány
- Počet aktivních plánů: ${trainingPlans.length}
${plansSummary}

### Osobní rekordy (PR) - posledních ${exercisePRs.length} záznamů
${prSummary}

### Top 10 klientů dle tréninkového objemu (90 dní, sets×reps×kg)
${topVolumeClients.map((c, i) => `${i + 1}. ${c.name}: ${Math.round(c.volume).toLocaleString("cs-CZ")} kg`).join("\n") || "Žádná data"}

### Neaktivní klienti (30+ dní bez tréninku)
${inactiveClients.length > 0 ? inactiveClients.map(c => `- ${c.name}: ${c.daysSince === -1 ? "žádný trénink letos" : `${c.daysSince} dní`}`).join("\n") : "Žádní neaktivní klienti"}

### Klienti "at risk" (dříve aktivní, nyní nechodí)
${atRiskClients.length > 0 ? atRiskClients.map(c => `- ⚠️ ${c.name}: ${c.daysSince} dní bez tréninku (měl ${c.hadTrainings} tréninků letos)`).join("\n") : "Žádní rizikoví klienti"}

### Dnešní rozvrh (${today})
${formatSchedule(todaySchedule)}

### Zítřejší rozvrh (${tomorrow})
${formatSchedule(tomorrowSchedule)}

## MĚŘENÍ KLIENTŮ
${(() => {
  // Latest measurement per client
  const latestPerClient: Record<string, any> = {};
  measurements.forEach((m: any) => {
    if (!latestPerClient[m.client_id]) latestPerClient[m.client_id] = m;
  });
  const entries = Object.values(latestPerClient);
  if (entries.length === 0) return "Žádná měření";
  return entries.map((m: any) => {
    const name = clientNameMap[m.client_id] || "?";
    return `- ${name} (${m.date}): váha=${m.weight || "?"}kg, tuk=${m.body_fat_percentage || "?"}%, svalstvo=${m.muscle_mass || "?"}kg, pas=${m.waist || "?"}cm, hrudník=${m.chest || "?"}cm, boky=${m.hips || "?"}cm, BMI=${m.bmi || "?"}${m.notes ? ` | ${m.notes.substring(0, 40)}` : ""}`;
  }).join("\n");
})()}

## DIAGNOSTIKY
${diagnostics.length > 0 ? diagnostics.slice(0, 30).map((d: any) => {
  const name = clientNameMap[d.client_id] || "?";
  return `- ${name} (${d.date}): [${d.area_type || "?"}/${d.area_name || "?"}] ${(d.findings || "").substring(0, 80)}${d.notes ? ` | ${d.notes.substring(0, 40)}` : ""}`;
}).join("\n") : "Žádné diagnostiky"}

## BALÍČKY KLIENTŮ (aktivní)
${clientPackages.length > 0 ? clientPackages.map((p: any) => {
  const name = clientNameMap[p.client_id] || "?";
  const remaining = p.trainings_total - p.trainings_used;
  const expires = p.expires_at ? ` | expiruje: ${p.expires_at.split("T")[0]}` : "";
  return `- ${name}: "${p.package_name}" | zbývá ${remaining}/${p.trainings_total} tréninků | ${p.price_paid} Kč${expires}`;
}).join("\n") : "Žádné aktivní balíčky"}

## GAMIFIKACE (XP & Věrnostní body)
### XP Levely
${clientXp.length > 0 ? clientXp.map((x: any) => {
  const name = clientNameMap[x.client_id] || "?";
  return `- ${name}: Level ${x.level || 0}, Total XP: ${x.total_xp || 0}, Level XP: ${x.level_xp || 0}, Do dalšího: ${x.xp_to_next || 0}`;
}).join("\n") : "Žádná XP data"}
### Věrnostní body
${loyaltyBalances.length > 0 ? loyaltyBalances.slice(0, 20).map((l: any) => {
  const name = clientNameMap[l.client_id] || "?";
  return `- ${name}: ${l.points_balance || 0} bodů (celkem: ${l.lifetime_points || 0})`;
}).join("\n") : "Žádné věrnostní body"}

## VÝZVY (Challenges)
${challenges.length > 0 ? challenges.slice(0, 10).map((ch: any) => {
  const subs = challengeSubmissions.filter((s: any) => s.challenge_id === ch.id);
  const winners = subs.filter((s: any) => s.is_winner);
  return `- "${ch.title}" [${ch.status}] ${ch.start_at?.split("T")[0]}–${ch.end_at?.split("T")[0]} | ${subs.length} submissions, ${winners.length} výherců`;
}).join("\n") : "Žádné výzvy"}

## VÝŽIVA (posledních 30 dní)
${(() => {
  const perClient: Record<string, number> = {};
  nutritionSessions.forEach((n: any) => {
    perClient[n.client_id] = (perClient[n.client_id] || 0) + 1;
  });
  const entries = Object.entries(perClient);
  if (entries.length === 0) return "Žádné nutriční záznamy";
  return `Celkem logů: ${nutritionSessions.length}\n` + entries.map(([cid, count]) => {
    const name = clientNameMap[cid] || "?";
    return `- ${name}: ${count} záznamů`;
  }).join("\n");
})()}

## SKLADOVÉ POHYBY (posledních 30 dní)
${(() => {
  const summary: Record<string, number> = {};
  stockMovements.forEach((m: any) => {
    summary[m.movement_type] = (summary[m.movement_type] || 0) + (m.quantity || 0);
  });
  if (Object.keys(summary).length === 0) return "Žádné pohyby";
  return `Celkem pohybů: ${stockMovements.length}\n` + Object.entries(summary).map(([type, qty]) => `- ${type}: ${qty} ks`).join("\n");
})()}

## VÝKONNOSTNÍ TESTY
### Definice testů
${testDefinitions.length > 0 ? testDefinitions.map((td: any) => `- ${td.name_cs || td.name} [${td.category}] metr: ${td.primary_metric_key}`).join("\n") : "Žádné testy"}
### Poslední výsledky
${(() => {
  // Latest per client per test
  const latestPerKey: Record<string, any> = {};
  testSessions.forEach((ts: any) => {
    const key = ts.client_id + "|" + ts.test_definition_id;
    if (!latestPerKey[key]) latestPerKey[key] = ts;
  });
  const entries = Object.values(latestPerKey);
  if (entries.length === 0) return "Žádné výsledky testů";
  const defMap: Record<string, any> = {};
  testDefinitions.forEach((td: any) => { defMap[td.id] = td; });
  return entries.slice(0, 30).map((ts: any) => {
    const name = clientNameMap[ts.client_id] || "?";
    const def = defMap[ts.test_definition_id];
    const testName = def?.name_cs || def?.name || "?";
    const primaryVal = ts.metrics_json?.[def?.primary_metric_key] ?? "?";
    return `- ${name} | ${testName}: ${primaryVal} (${ts.date_time?.split("T")[0]})${ts.is_valid === false ? " ❌ nevalidní" : ""}`;
  }).join("\n");
})()}

## DOMÁCÍ TRÉNINKY
${(() => {
  const total = assignedWorkouts.length;
  const completed = assignedWorkouts.filter((w: any) => w.status === "completed").length;
  const pending = assignedWorkouts.filter((w: any) => w.status === "assigned" || w.status === "pending").length;
  if (total === 0) return "Žádné zadané domácí tréninky";
  return `Celkem: ${total} | Dokončeno: ${completed} | Čeká: ${pending} | Míra plnění: ${Math.round(completed / total * 100)}%`;
})()}

## PRE-SESSION CHECKINS (posledních 30 dní)
${(() => {
  if (preCheckins.length === 0) return "Žádné check-iny";
  const avgEnergy = preCheckins.filter((c: any) => c.energy_level).reduce((s: number, c: any) => s + c.energy_level, 0) / (preCheckins.filter((c: any) => c.energy_level).length || 1);
  const avgSleep = preCheckins.filter((c: any) => c.sleep_quality).reduce((s: number, c: any) => s + c.sleep_quality, 0) / (preCheckins.filter((c: any) => c.sleep_quality).length || 1);
  const withPain = preCheckins.filter((c: any) => c.pain_area && c.pain_area.trim() !== "");
  return `Celkem: ${preCheckins.length} | Prům. energie: ${avgEnergy.toFixed(1)} | Prům. spánek: ${avgSleep.toFixed(1)} | S bolestí: ${withPain.length}${withPain.length > 0 ? "\nBolesti:\n" + withPain.slice(0, 10).map((c: any) => {
    const name = clientNameMap[c.client_id] || "?";
    return `  - ${name}: ${c.pain_area}${c.pain_notes ? ` (${c.pain_notes.substring(0, 50)})` : ""}`;
  }).join("\n") : ""}`;
})()}

## ODZNAKY (Badges)
${(() => {
  const earned = clientBadges.filter((b: any) => b.earned_at);
  const defMap: Record<string, any> = {};
  badgeDefs.forEach((d: any) => { defMap[d.id] = d; });
  if (earned.length === 0) return "Žádné udělené odznaky";
  return `Celkem uděleno: ${earned.length}\nPoslední:\n` + earned.slice(0, 10).map((b: any) => {
    const name = clientNameMap[b.client_id] || "?";
    const def = defMap[b.badge_id];
    return `- ${name}: ${def?.name || "?"} [${def?.rarity || "?"}] (${b.earned_at?.split("T")[0]})`;
  }).join("\n");
})()}

## CENÍKY
${priceLists.length > 0 ? priceLists.map((pl: any) => {
  const items = priceItems.filter((pi: any) => pi.price_list_id === pl.id);
  const itemsStr = items.map((pi: any) => `service_id=${pi.service_id}: ${pi.unit_price_czk} Kč`).join("; ");
  return `- "${pl.name}" (od ${pl.effective_from || "?"})${pl.description ? ` – ${pl.description}` : ""}:\n  ${itemsStr || "žádné položky"}`;
}).join("\n") : "Žádné aktivní ceníky"}

## OPAKUJÍCÍ SE ROZVRH
${(() => {
  const days = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
  if (recurringSchedules.length === 0) return "Žádné pravidelné termíny";
  return recurringSchedules.map((rs: any) => {
    const name = clientNameMap[rs.client_id] || "?";
    const day = days[rs.day_of_week] || rs.day_of_week;
    return `- ${name}: ${day} ${rs.time || "?"} (${rs.duration || "?"}min)${rs.notes ? ` | ${rs.notes.substring(0, 30)}` : ""}`;
  }).join("\n");
})()}
`;

    const briefingInstruction = mode === "briefing" ? `
DŮLEŽITÉ: Uživatel právě otevřel agenta. Automaticky připrav krátký ranní briefing dne. Formát:
## 📋 Briefing ${now.toLocaleDateString("cs-CZ")}
- Dnešní rozvrh (kolik tréninků, klienti)
- Varování (dluhy, red flagy, nízké zásoby, at-risk klienti, expirující balíčky, neaktivní klienti)
- Klíčová čísla (příjem tento měsíc, zůstatky)
- Feedback response rate, pre-session check-in souhrn
- Gamifikace highlights (nedávné odznaky, streaky)
Buď stručný, max 25 řádků.` : "";

    const systemPrompt = `Jsi komplexní business analytik pro fitness trenéra. Máš přístup ke VŠEM datům aplikace: finance, kredity, tréninky, prodeje, feedbacky, měření klientů, diagnostiky, balíčky, gamifikace (XP, odznaky, věrnostní body), výzvy, výživa, skladové pohyby, výkonnostní testy, domácí tréninky, pre-session check-iny, ceníky a rozvrh.

${contextData}

${briefingInstruction}

PRAVIDLA:
- Odpovídej vždy ČESKY
- Buď stručný, konkrétní a orientovaný na čísla
- Používej formátování markdown (tabulky, odrážky, tučné písmo pro důležitá čísla)
- Když se uživatel ptá na export, připrav data ve strukturovaném formátu (tabulka nebo seznam) který lze snadno zkopírovat
- Pokud uživatel žádá PDF/export, vytvoř přehledný textový formát s jasnou strukturou oddílů a nadpisy
- Počítej s českými měnovými zvyklostmi (Kč, česká čísla)
- Nabízej proaktivně insights: trendy, srovnání, varování (nízké zásoby, dluhy klientů, red flagy, bolesti, neaktivní klienti, at-risk klienti, blížící se expirace balíčků)
- Pokud data nestačí pro odpověď, řekni to jasně
- Formátuj peněžní částky vždy s "Kč" a tisícovými oddělovači
- Identifikuj rizikové klienty: neaktivní, s bolestmi/red flagy, s dluhem, at-risk, s expirujícím balíčkem
- Nabízej doporučení a varování proaktivně
- Pokud uživatel chce report, strukturuj odpověď s jasným nadpisem, sekcemi a shrnutím na konci
- Umíš porovnávat období (tento vs minulý měsíc, meziměsíční trendy)
- Hodinovou sazbu počítej ze skutečné duration a final_price
- Umíš analyzovat výkonnostní data: PR klientů, tréninkové objemy, trendy síly, výsledky testů
- Umíš pracovat se zdravotními profily: identifikuj klienty s omezením, sleduj bolesti ve feedbackech a check-inech
- Umíš analyzovat tréninkové plány: aktivní plány, plnění cílů, frekvence
- Umíš analyzovat feedback response rate: kolik klientů odpovídá, průměrná doba
- Umíš analyzovat měření: trendy váhy, tělesného tuku, obvody
- Umíš analyzovat diagnostiky: problémové oblasti, nálezy per klient
- Umíš analyzovat balíčky: zbývající tréninky, expirace, doporučení na obnovu
- Umíš analyzovat gamifikaci: XP levely, streaky, odznaky, věrnostní body
- Umíš analyzovat výzvy: účast, výsledky, zapojení klientů
- Umíš analyzovat výživu: frekvence logování, pravidelnost per klient
- Umíš analyzovat domácí tréninky: míra plnění, compliance per klient
- Umíš analyzovat pre-session check-iny: průměrná energie, spánek, stres, bolesti
- Umíš analyzovat ceníky a doporučit cenovou strategii
- Umíš analyzovat pravidelný rozvrh klientů
- Pokud uživatel požádá o data ve formátu pro graf, vrať je jako JSON blok s klíči "chartData" a "chartType" (bar/line/pie):
  Příklad: \`\`\`chart {"chartType":"bar","chartData":[{"name":"Leden","value":15},{"name":"Únor","value":22}]} \`\`\`

FOLLOW-UP SUGGESTIONS:
Na konci KAŽDÉ odpovědi přidej blok s 2-3 relevantnímí follow-up otázkami ve formátu:
\`\`\`suggestions
["Otázka 1 relevantní k odpovědi?", "Otázka 2 relevantní k odpovědi?", "Otázka 3 relevantní k odpovědi?"]
\`\`\`
Otázky musí být specifické a navazovat na kontext odpovědi (ne generické).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to později." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nedostatek kreditu pro AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI business analyst error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Neznámá chyba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
