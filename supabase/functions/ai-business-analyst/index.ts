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
    const { messages } = await req.json();

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
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const last90days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel data fetching
    const [
      clientsRes,
      ledgerRes,
      trainingsThisMonthRes,
      trainingsLastMonthRes,
      trainingsYearRes,
      transactionsRes,
      productSalesRes,
      expensesRes,
      productsRes,
    ] = await Promise.all([
      // All clients with balances
      supabase.from("vw_client_ledger_balances").select("*").eq("user_id", userId),
      // Credit transactions last 90 days
      supabase.from("credit_transactions").select("*").eq("user_id", userId).gte("created_at", last90days).order("created_at", { ascending: false }).limit(500),
      // Trainings this month
      supabase.from("training_sessions").select("id, date, status, duration, training_type, price, payment_status, clients(name)").eq("user_id", userId).gte("date", thisMonthStart).order("date", { ascending: false }),
      // Trainings last month
      supabase.from("training_sessions").select("id, date, status, duration, training_type, price, payment_status, clients(name)").eq("user_id", userId).gte("date", lastMonthStart).lt("date", thisMonthStart).order("date", { ascending: false }),
      // Trainings this year
      supabase.from("training_sessions").select("id, date, status, training_type, price, payment_status, duration").eq("user_id", userId).gte("date", thisYearStart).eq("status", "completed"),
      // Credit transactions for income analysis
      supabase.from("credit_transactions").select("*").eq("user_id", userId).gte("created_at", thisYearStart).in("type", ["payment", "training", "product", "canceled_training"]).order("created_at", { ascending: false }).limit(1000),
      // Product sales
      supabase.from("product_sales").select("*, products(name, sell_price, cost_price)").eq("user_id", userId).gte("created_at", last90days).order("created_at", { ascending: false }).limit(200),
      // Business expenses
      supabase.from("business_expenses").select("*").eq("user_id", userId).gte("date", thisYearStart).order("date", { ascending: false }).limit(200),
      // Products with stock
      supabase.from("products").select("id, name, sell_price, cost_price, stock_quantity, category").eq("user_id", userId).eq("is_active", true),
    ]);

    const clients = clientsRes.data || [];
    const ledger = ledgerRes.data || [];
    const trainingsThisMonth = trainingsThisMonthRes.data || [];
    const trainingsLastMonth = trainingsLastMonthRes.data || [];
    const trainingsYear = trainingsYearRes.data || [];
    const transactions = transactionsRes.data || [];
    const productSales = productSalesRes.data || [];
    const expenses = expensesRes.data || [];
    const products = productsRes.data || [];

    // Compute aggregates
    const totalClientsBalance = clients.reduce((s: number, c: any) => s + (c.balance || 0), 0);
    const clientsWithDebt = clients.filter((c: any) => (c.balance || 0) < 0);
    const clientsWithCredit = clients.filter((c: any) => (c.balance || 0) > 0);

    const completedThisMonth = trainingsThisMonth.filter((t: any) => t.status === "completed");
    const canceledThisMonth = trainingsThisMonth.filter((t: any) => t.status === "canceled");
    const completedLastMonth = trainingsLastMonth.filter((t: any) => t.status === "completed");

    const incomeThisYear = transactions.filter((t: any) => t.type === "payment").reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const trainingSpendThisYear = transactions.filter((t: any) => t.type === "training").reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    const productIncomeThisYear = transactions.filter((t: any) => t.type === "product").reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

    const totalExpensesYear = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

    const salesRevenue90d = productSales.reduce((s: number, ps: any) => s + ((ps.products?.sell_price || 0) * (ps.quantity || 1)), 0);
    const salesCost90d = productSales.reduce((s: number, ps: any) => s + ((ps.products?.cost_price || 0) * (ps.quantity || 1)), 0);

    const lowStockProducts = products.filter((p: any) => (p.stock_quantity || 0) <= 3 && (p.stock_quantity || 0) >= 0);

    const totalDurationYear = trainingsYear.reduce((s: number, t: any) => s + (t.duration || 0), 0);
    const avgDuration = trainingsYear.length > 0 ? Math.round(totalDurationYear / trainingsYear.length) : 0;

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

    const contextData = `
## FINANČNÍ DATA (aktuální k ${now.toLocaleDateString("cs-CZ")})

### Kreditní přehled
- Celkový zůstatek všech klientů: ${totalClientsBalance.toLocaleString("cs-CZ")} Kč
- Klienti s kreditem (${clientsWithCredit.length}): ${clientsWithCredit.slice(0, 15).map((c: any) => `${c.client_name}: ${c.balance?.toLocaleString("cs-CZ")} Kč`).join(", ")}
- Klienti s dluhem (${clientsWithDebt.length}): ${clientsWithDebt.map((c: any) => `${c.client_name}: ${c.balance?.toLocaleString("cs-CZ")} Kč`).join(", ") || "žádní"}

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

### Příjmy - rok ${now.getFullYear()}
- Dobití kreditů: ${incomeThisYear.toLocaleString("cs-CZ")} Kč
- Čerpáno tréninky: ${trainingSpendThisYear.toLocaleString("cs-CZ")} Kč
- Čerpáno produkty: ${productIncomeThisYear.toLocaleString("cs-CZ")} Kč

### Prodeje produktů (posledních 90 dní)
- Tržby: ${salesRevenue90d.toLocaleString("cs-CZ")} Kč
- Náklady: ${salesCost90d.toLocaleString("cs-CZ")} Kč
- Hrubý zisk: ${(salesRevenue90d - salesCost90d).toLocaleString("cs-CZ")} Kč
- Marže: ${salesRevenue90d > 0 ? Math.round((salesRevenue90d - salesCost90d) / salesRevenue90d * 100) : 0}%
- Počet prodejů: ${productSales.length}

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
`;

    const systemPrompt = `Jsi finanční a business analytik pro fitness trenéra. Tvým úkolem je analyzovat finanční data, kreditní zůstatky, prodeje produktů a tréninkové statistiky.

${contextData}

PRAVIDLA:
- Odpovídej vždy ČESKY
- Buď stručný, konkrétní a orientovaný na čísla
- Používej formátování markdown (tabulky, odrážky, tučné písmo pro důležitá čísla)
- Když se uživatel ptá na export, připrav data ve strukturovaném formátu (tabulka nebo seznam) který lze snadno zkopírovat
- Pokud uživatel žádá PDF/export, vytvoř přehledný textový formát s jasnou strukturou oddílů
- Počítej s českými měnovými zvyklostmi (Kč, česká čísla)
- Nabízej proaktivně insights: trendy, srovnání, varování (nízké zásoby, dluhy klientů)
- Pokud data nestačí pro odpověď, řekni to jasně
- Formátuj peněžní částky vždy s "Kč" a tisícovými oddělovači`;

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
