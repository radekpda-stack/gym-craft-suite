import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for AI to understand available actions
const tools = [
  {
    type: "function",
    function: {
      name: "create_training",
      description: "Vytvoří nový trénink pro klienta. Použij když uživatel chce naplánovat trénink.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Jméno klienta (může být částečné)" },
          date: { type: "string", description: "Datum tréninku ve formátu YYYY-MM-DD" },
          time: { type: "string", description: "Čas tréninku ve formátu HH:MM" },
          duration: { type: "number", description: "Délka tréninku v minutách, default 60" },
          participant_count: { type: "number", description: "Počet účastníků, default 1" },
          notes: { type: "string", description: "Poznámky k tréninku" },
        },
        required: ["client_name", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_credit",
      description: "Přidá kredit klientovi. Použij když uživatel zmiňuje platbu nebo dobití kreditu.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Jméno klienta" },
          amount: { type: "number", description: "Částka v CZK" },
          payment_method: { 
            type: "string", 
            enum: ["cash", "bank_transfer", "card", "revolut", "invoice"],
            description: "Způsob platby" 
          },
          description: { type: "string", description: "Popis transakce" },
        },
        required: ["client_name", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_training",
      description: "Zruší naplánovaný trénink. Použij když uživatel chce zrušit trénink.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Jméno klienta" },
          date: { type: "string", description: "Datum tréninku ve formátu YYYY-MM-DD" },
          time: { type: "string", description: "Čas tréninku ve formátu HH:MM (volitelné)" },
          deduct_credit: { type: "boolean", description: "Zda strhnout kredit za pozdní zrušení" },
        },
        required: ["client_name", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_training",
      description: "Označí trénink jako dokončený. Použij když uživatel zmiňuje dokončení tréninku.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Jméno klienta" },
          date: { type: "string", description: "Datum tréninku ve formátu YYYY-MM-DD" },
          time: { type: "string", description: "Čas tréninku ve formátu HH:MM (volitelné)" },
          payment_method: { 
            type: "string", 
            enum: ["credit", "cash", "card", "pending"],
            description: "Způsob platby za trénink" 
          },
          rating: { type: "number", description: "Hodnocení tréninku 1-10" },
        },
        required: ["client_name", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_data",
      description: "Dotaz na data - kredit, tréninky, příjmy, měření, cvičení, diagnostiky, PR záznamy atd.",
      parameters: {
        type: "object",
        properties: {
          query_type: { 
            type: "string", 
            enum: [
              "client_credit", 
              "trainings_count", 
              "income", 
              "trainings_list", 
              "clients_low_credit",
              "client_measurements",
              "client_weight_progress",
              "client_exercises",
              "client_exercise_prs",
              "client_cardio",
              "client_diagnostics",
              "client_profile",
              "exercise_leaderboard",
              "all_prs"
            ],
            description: "Typ dotazu" 
          },
          client_name: { type: "string", description: "Jméno klienta (pokud je relevantní)" },
          exercise_name: { type: "string", description: "Název cviku (pokud je relevantní)" },
          date_from: { type: "string", description: "Od data ve formátu YYYY-MM-DD" },
          date_to: { type: "string", description: "Do data ve formátu YYYY-MM-DD" },
          limit: { type: "number", description: "Počet výsledků (default 10)" },
        },
        required: ["query_type"],
      },
    },
  },
];

// Helper to find client by partial name match
async function findClient(supabase: any, userId: string, clientName: string) {
  const normalizedName = clientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, credit_balance")
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (!clients || clients.length === 0) return null;

  // Try exact match first
  let match = clients.find((c: any) => 
    c.name.toLowerCase() === clientName.toLowerCase()
  );

  if (!match) {
    // Try partial match
    match = clients.find((c: any) => {
      const normalizedClientName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalizedClientName.includes(normalizedName) || normalizedName.includes(normalizedClientName);
    });
  }

  return match;
}

// Helper to find training by client and date
async function findTraining(supabase: any, userId: string, clientId: string, date: string, time?: string) {
  let query = supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .eq("status", "scheduled");

  // Date matching
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;
  query = query.gte("date", startOfDay).lte("date", endOfDay);

  const { data: trainings } = await query;

  if (!trainings || trainings.length === 0) return null;

  // If time specified, find closest match
  if (time && trainings.length > 1) {
    const targetTime = time.split(":").map(Number);
    return trainings.reduce((closest: any, t: any) => {
      const tTime = new Date(t.date);
      const tDiff = Math.abs(tTime.getHours() - targetTime[0]) * 60 + Math.abs(tTime.getMinutes() - targetTime[1]);
      const cTime = new Date(closest.date);
      const cDiff = Math.abs(cTime.getHours() - targetTime[0]) * 60 + Math.abs(cTime.getMinutes() - targetTime[1]);
      return tDiff < cDiff ? t : closest;
    });
  }

  return trainings[0];
}

// Get pricing based on participant count
function getTrainingPrice(participantCount: number): number {
  if (participantCount === 1) return 900;
  if (participantCount === 2) return 1100;
  return 1300;
}

// Process tool calls and prepare action proposals
async function processToolCall(
  supabase: any, 
  userId: string, 
  toolName: string, 
  args: any
): Promise<{ action: any; message: string; error?: string }> {
  console.log(`Processing tool call: ${toolName}`, args);

  switch (toolName) {
    case "create_training": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: "", error: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const duration = args.duration || 60;
      const participantCount = args.participant_count || 1;
      const price = getTrainingPrice(participantCount);
      const dateTime = `${args.date}T${args.time}:00`;

      return {
        action: {
          type: "create_training",
          params: {
            client_id: client.id,
            client_name: client.name,
            date: dateTime,
            duration,
            participant_count: participantCount,
            notes: args.notes || "",
            final_price: price,
          },
        },
        message: `📅 **Nový trénink**\n• Klient: ${client.name}\n• Datum: ${new Date(dateTime).toLocaleDateString("cs-CZ")} v ${args.time}\n• Délka: ${duration} min\n• Počet osob: ${participantCount}\n• Cena: ${price} Kč\n${args.notes ? `• Poznámky: ${args.notes}` : ""}`,
      };
    }

    case "add_credit": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: "", error: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const paymentMethodLabels: Record<string, string> = {
        cash: "hotovost",
        bank_transfer: "bankovní převod",
        card: "kartou",
        revolut: "Revolut",
        invoice: "faktura",
      };

      return {
        action: {
          type: "add_credit",
          params: {
            client_id: client.id,
            client_name: client.name,
            amount: args.amount,
            payment_method: args.payment_method || "bank_transfer",
            description: args.description || `Dobití kreditu`,
            current_balance: client.credit_balance || 0,
          },
        },
        message: `💰 **Dobití kreditu**\n• Klient: ${client.name}\n• Částka: ${args.amount.toLocaleString("cs-CZ")} Kč\n• Způsob: ${paymentMethodLabels[args.payment_method] || "bankovní převod"}\n• Aktuální kredit: ${(client.credit_balance || 0).toLocaleString("cs-CZ")} Kč → ${((client.credit_balance || 0) + args.amount).toLocaleString("cs-CZ")} Kč`,
      };
    }

    case "cancel_training": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: "", error: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const training = await findTraining(supabase, userId, client.id, args.date, args.time);
      if (!training) {
        return { action: null, message: "", error: `Trénink pro klienta "${client.name}" na ${args.date} nebyl nalezen.` };
      }

      const trainingDate = new Date(training.date);
      const now = new Date();
      const hoursUntil = (trainingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isLate = hoursUntil < 24;

      return {
        action: {
          type: "cancel_training",
          params: {
            training_id: training.id,
            client_id: client.id,
            client_name: client.name,
            is_late: isLate,
            deduct_credit: args.deduct_credit ?? isLate,
            final_price: training.final_price || getTrainingPrice(training.participant_count || 1),
          },
        },
        message: `❌ **Zrušení tréninku**\n• Klient: ${client.name}\n• Datum: ${trainingDate.toLocaleDateString("cs-CZ")} v ${trainingDate.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}\n• Pozdní zrušení: ${isLate ? "Ano (méně než 24h)" : "Ne"}\n• Strhnout kredit: ${(args.deduct_credit ?? isLate) ? `Ano (${training.final_price || getTrainingPrice(training.participant_count || 1)} Kč)` : "Ne"}`,
      };
    }

    case "complete_training": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: "", error: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const training = await findTraining(supabase, userId, client.id, args.date, args.time);
      if (!training) {
        return { action: null, message: "", error: `Trénink pro klienta "${client.name}" na ${args.date} nebyl nalezen.` };
      }

      const paymentLabels: Record<string, string> = {
        credit: "z kreditu",
        cash: "hotově",
        card: "kartou",
        pending: "nezaplaceno",
      };

      const paymentMethod = args.payment_method || "credit";
      const price = training.final_price || getTrainingPrice(training.participant_count || 1);

      return {
        action: {
          type: "complete_training",
          params: {
            training_id: training.id,
            client_id: client.id,
            client_name: client.name,
            payment_method: paymentMethod,
            final_price: price,
            rating: args.rating,
            current_balance: client.credit_balance || 0,
          },
        },
        message: `✅ **Dokončení tréninku**\n• Klient: ${client.name}\n• Datum: ${new Date(training.date).toLocaleDateString("cs-CZ")}\n• Cena: ${price} Kč\n• Platba: ${paymentLabels[paymentMethod]}${args.rating ? `\n• Hodnocení: ${args.rating}/10` : ""}${paymentMethod === "credit" ? `\n• Kredit po odečtu: ${((client.credit_balance || 0) - price).toLocaleString("cs-CZ")} Kč` : ""}`,
      };
    }

    case "query_data": {
      // Handle data queries - no confirmation needed
      return await handleDataQuery(supabase, userId, args);
    }

    default:
      return { action: null, message: "", error: `Neznámá akce: ${toolName}` };
  }
}

// Handle data queries
async function handleDataQuery(supabase: any, userId: string, args: any) {
  const limit = args.limit || 10;
  
  switch (args.query_type) {
    case "client_credit": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }
      return { 
        action: null, 
        message: `💳 Klient **${client.name}** má aktuálně **${(client.credit_balance || 0).toLocaleString("cs-CZ")} Kč** kreditu.` 
      };
    }

    case "trainings_count": {
      let query = supabase
        .from("training_sessions")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("status", "completed");

      if (args.date_from) query = query.gte("date", args.date_from);
      if (args.date_to) query = query.lte("date", args.date_to);

      const { count } = await query;
      const period = args.date_from && args.date_to 
        ? `od ${args.date_from} do ${args.date_to}` 
        : args.date_from 
        ? `od ${args.date_from}` 
        : "celkem";

      return { action: null, message: `📊 Počet dokončených tréninků ${period}: **${count || 0}**` };
    }

    case "income": {
      let query = supabase
        .from("credit_transactions")
        .select("amount, type")
        .eq("user_id", userId)
        .eq("type", "credit");

      if (args.date_from) query = query.gte("created_at", args.date_from);
      if (args.date_to) query = query.lte("created_at", args.date_to);

      const { data: transactions } = await query;
      const total = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      
      const period = args.date_from && args.date_to 
        ? `od ${args.date_from} do ${args.date_to}` 
        : args.date_from 
        ? `od ${args.date_from}` 
        : "celkem";

      return { action: null, message: `💰 Příjmy ${period}: **${total.toLocaleString("cs-CZ")} Kč**` };
    }

    case "trainings_list": {
      const dateFrom = args.date_from || new Date().toISOString().split("T")[0];
      const dateTo = args.date_to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: trainings } = await supabase
        .from("training_sessions")
        .select("*, clients(name)")
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .gte("date", dateFrom)
        .lte("date", dateTo + "T23:59:59")
        .order("date");

      if (!trainings || trainings.length === 0) {
        return { action: null, message: `📅 Žádné naplánované tréninky v období ${dateFrom} - ${dateTo}.` };
      }

      const list = trainings.map((t: any) => {
        const d = new Date(t.date);
        return `• ${d.toLocaleDateString("cs-CZ")} ${d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} - ${t.clients?.name || "?"}`;
      }).join("\n");

      return { action: null, message: `📅 **Naplánované tréninky** (${dateFrom} - ${dateTo}):\n${list}` };
    }

    case "clients_low_credit": {
      const { data: clients } = await supabase
        .from("clients")
        .select("name, credit_balance")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .lt("credit_balance", 1000)
        .order("credit_balance");

      if (!clients || clients.length === 0) {
        return { action: null, message: `✅ Všichni klienti mají dostatečný kredit (nad 1000 Kč).` };
      }

      const list = clients.map((c: any) => 
        `• ${c.name}: ${(c.credit_balance || 0).toLocaleString("cs-CZ")} Kč`
      ).join("\n");

      return { action: null, message: `⚠️ **Klienti s nízkým kreditem** (pod 1000 Kč):\n${list}` };
    }

    // NEW: Client measurements (weight, body fat, circumferences)
    case "client_measurements": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const { data: measurements } = await supabase
        .from("measurements")
        .select("*")
        .eq("client_id", client.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (!measurements || measurements.length === 0) {
        return { action: null, message: `📏 Klient **${client.name}** nemá žádná měření.` };
      }

      const list = measurements.map((m: any) => {
        const parts = [];
        if (m.weight) parts.push(`váha: ${m.weight} kg`);
        if (m.body_fat_percentage) parts.push(`tuk: ${m.body_fat_percentage}%`);
        if (m.muscle_mass) parts.push(`svaly: ${m.muscle_mass} kg`);
        return `• ${m.date}: ${parts.join(", ") || "bez dat"}`;
      }).join("\n");

      return { action: null, message: `📏 **Měření klienta ${client.name}** (posledních ${measurements.length}):\n${list}` };
    }

    // NEW: Client weight progress
    case "client_weight_progress": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const { data: measurements } = await supabase
        .from("measurements")
        .select("date, weight")
        .eq("client_id", client.id)
        .not("weight", "is", null)
        .order("date", { ascending: true });

      if (!measurements || measurements.length < 2) {
        return { action: null, message: `📊 Nedostatek dat pro analýzu hubnutí klienta **${client.name}**.` };
      }

      const first = measurements[0];
      const last = measurements[measurements.length - 1];
      const change = last.weight - first.weight;
      const changePercent = ((change / first.weight) * 100).toFixed(1);

      return { 
        action: null, 
        message: `📊 **Průběh hubnutí klienta ${client.name}:**\n• Počáteční váha (${first.date}): ${first.weight} kg\n• Aktuální váha (${last.date}): ${last.weight} kg\n• Změna: **${change > 0 ? "+" : ""}${change.toFixed(1)} kg** (${changePercent}%)\n• Počet měření: ${measurements.length}` 
      };
    }

    // NEW: Client exercise entries (strength)
    case "client_exercises": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      let query = supabase
        .from("exercise_entries")
        .select("*")
        .eq("client_id", client.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (args.exercise_name) {
        query = query.ilike("exercise_name", `%${args.exercise_name}%`);
      }

      const { data: entries } = await query;

      if (!entries || entries.length === 0) {
        return { action: null, message: `🏋️ Klient **${client.name}** nemá žádné záznamy cvičení${args.exercise_name ? ` pro "${args.exercise_name}"` : ""}.` };
      }

      const list = entries.map((e: any) => {
        const parts = [`${e.sets}x${e.reps || "?"}`];
        if (e.weight_kg) parts.push(`${e.weight_kg} kg`);
        if (e.time_seconds) parts.push(`${Math.floor(e.time_seconds / 60)}:${String(e.time_seconds % 60).padStart(2, "0")}`);
        const prMark = e.is_pr ? " 🏆" : "";
        return `• ${e.date} - **${e.exercise_name}**: ${parts.join(" @ ")}${prMark}`;
      }).join("\n");

      return { action: null, message: `🏋️ **Cvičení klienta ${client.name}**${args.exercise_name ? ` (${args.exercise_name})` : ""}:\n${list}` };
    }

    // NEW: Client exercise PRs
    case "client_exercise_prs": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const { data: prs } = await supabase
        .from("exercise_entries")
        .select("exercise_name, weight_kg, reps, time_seconds, date")
        .eq("client_id", client.id)
        .eq("is_pr", true)
        .order("date", { ascending: false })
        .limit(limit);

      if (!prs || prs.length === 0) {
        return { action: null, message: `🏆 Klient **${client.name}** nemá žádné osobní rekordy.` };
      }

      const list = prs.map((p: any) => {
        const value = p.weight_kg ? `${p.weight_kg} kg` : 
                      p.time_seconds ? `${Math.floor(p.time_seconds / 60)}:${String(p.time_seconds % 60).padStart(2, "0")}` : 
                      `${p.reps} reps`;
        return `• **${p.exercise_name}**: ${value} (${p.date})`;
      }).join("\n");

      return { action: null, message: `🏆 **Osobní rekordy klienta ${client.name}**:\n${list}` };
    }

    // NEW: Client cardio entries
    case "client_cardio": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const { data: cardio } = await supabase
        .from("cardio_entries")
        .select("*")
        .eq("client_id", client.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (!cardio || cardio.length === 0) {
        return { action: null, message: `🚴 Klient **${client.name}** nemá žádné cardio záznamy.` };
      }

      const list = cardio.map((c: any) => {
        const mins = Math.floor(c.duration_seconds / 60);
        const secs = c.duration_seconds % 60;
        const distance = c.distance_meters ? `${(c.distance_meters / 1000).toFixed(2)} km` : "";
        const prMark = c.is_pr ? " 🏆" : "";
        return `• ${c.date} - **${c.exercise_name}**: ${mins}:${String(secs).padStart(2, "0")} ${distance}${prMark}`;
      }).join("\n");

      return { action: null, message: `🚴 **Cardio záznamy klienta ${client.name}**:\n${list}` };
    }

    // NEW: Client diagnostics
    case "client_diagnostics": {
      const client = await findClient(supabase, userId, args.client_name);
      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const { data: diagnostics } = await supabase
        .from("diagnostics_entries")
        .select("*")
        .eq("client_id", client.id)
        .order("date", { ascending: false })
        .limit(limit);

      if (!diagnostics || diagnostics.length === 0) {
        return { action: null, message: `🔍 Klient **${client.name}** nemá žádné diagnostiky.` };
      }

      const list = diagnostics.map((d: any) => {
        const findings: string[] = [];
        if (d.mobility_issues) findings.push("problémy s mobilitou");
        if (d.posture_issues) findings.push("problémy s držením těla");
        if (d.strength_imbalances) findings.push("svalové dysbalance");
        return `• ${d.date}: ${findings.length > 0 ? findings.join(", ") : "bez nálezů"}${d.notes ? ` - ${d.notes.substring(0, 50)}...` : ""}`;
      }).join("\n");

      return { action: null, message: `🔍 **Diagnostiky klienta ${client.name}**:\n${list}` };
    }

    // NEW: Client full profile
    case "client_profile": {
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .ilike("name", `%${args.client_name}%`)
        .single();

      if (!client) {
        return { action: null, message: `Klient "${args.client_name}" nebyl nalezen.` };
      }

      const details: string[] = [];
      details.push(`• Jméno: **${client.name}**`);
      if (client.email) details.push(`• Email: ${client.email}`);
      if (client.phone) details.push(`• Telefon: ${client.phone}`);
      details.push(`• Kredit: ${(client.credit_balance || 0).toLocaleString("cs-CZ")} Kč`);
      if (client.birth_date) details.push(`• Datum narození: ${client.birth_date}`);
      if (client.gender) details.push(`• Pohlaví: ${client.gender === "male" ? "muž" : "žena"}`);
      if (client.height) details.push(`• Výška: ${client.height} cm`);
      if (client.weight) details.push(`• Váha: ${client.weight} kg`);
      if (client.training_goals?.length > 0) details.push(`• Cíle: ${client.training_goals.join(", ")}`);
      if (client.health_restrictions) details.push(`• Zdravotní omezení: ${client.health_restrictions}`);
      if (client.notes) details.push(`• Poznámky: ${client.notes}`);
      if (client.occupation) details.push(`• Povolání: ${client.occupation}`);
      if (client.pain_areas?.length > 0) details.push(`• Bolestivá místa: ${client.pain_areas.join(", ")}`);
      if (client.injury_history) details.push(`• Historie zranění: ${client.injury_history}`);

      return { action: null, message: `👤 **Profil klienta:**\n${details.join("\n")}` };
    }

    // NEW: Exercise leaderboard
    case "exercise_leaderboard": {
      if (!args.exercise_name) {
        return { action: null, message: `❌ Pro žebříček musíte zadat název cviku.` };
      }

      // Try strength exercises first
      const { data: strengthEntries } = await supabase
        .from("exercise_entries")
        .select("client_id, weight_kg, reps, time_seconds, date, clients(name, gender)")
        .eq("user_id", userId)
        .eq("is_pr", true)
        .ilike("exercise_name", `%${args.exercise_name}%`)
        .not("weight_kg", "is", null)
        .order("weight_kg", { ascending: false })
        .limit(limit);

      if (strengthEntries && strengthEntries.length > 0) {
        const list = strengthEntries.map((e: any, i: number) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          const gender = e.clients?.gender === "male" ? "♂️" : e.clients?.gender === "female" ? "♀️" : "";
          return `${medal} ${e.clients?.name || "?"} ${gender}: **${e.weight_kg} kg** x ${e.reps || "?"} (${e.date})`;
        }).join("\n");

        return { action: null, message: `🏆 **Žebříček: ${args.exercise_name}**\n${list}` };
      }

      // Try cardio if no strength entries
      const { data: cardioEntries } = await supabase
        .from("cardio_entries")
        .select("client_id, duration_seconds, distance_meters, date, clients(name, gender)")
        .eq("user_id", userId)
        .ilike("exercise_name", `%${args.exercise_name}%`)
        .order("duration_seconds", { ascending: true })
        .limit(limit);

      if (cardioEntries && cardioEntries.length > 0) {
        const list = cardioEntries.map((e: any, i: number) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          const mins = Math.floor(e.duration_seconds / 60);
          const secs = e.duration_seconds % 60;
          const gender = e.clients?.gender === "male" ? "♂️" : e.clients?.gender === "female" ? "♀️" : "";
          return `${medal} ${e.clients?.name || "?"} ${gender}: **${mins}:${String(secs).padStart(2, "0")}** (${e.date})`;
        }).join("\n");

        return { action: null, message: `🏆 **Žebříček: ${args.exercise_name}**\n${list}` };
      }

      return { action: null, message: `🏆 Žádné záznamy pro cvik "${args.exercise_name}".` };
    }

    // NEW: All PRs across all clients
    case "all_prs": {
      const { data: prs } = await supabase
        .from("exercise_entries")
        .select("exercise_name, weight_kg, reps, time_seconds, date, clients(name)")
        .eq("user_id", userId)
        .eq("is_pr", true)
        .order("date", { ascending: false })
        .limit(limit);

      if (!prs || prs.length === 0) {
        return { action: null, message: `🏆 Žádné osobní rekordy v databázi.` };
      }

      const list = prs.map((p: any) => {
        const value = p.weight_kg ? `${p.weight_kg} kg` : 
                      p.time_seconds ? `${Math.floor(p.time_seconds / 60)}:${String(p.time_seconds % 60).padStart(2, "0")}` : 
                      `${p.reps} reps`;
        return `• ${p.date} - **${p.clients?.name || "?"}** - ${p.exercise_name}: ${value}`;
      }).join("\n");

      return { action: null, message: `🏆 **Poslední osobní rekordy**:\n${list}` };
    }

    default:
      return { action: null, message: "Neznámý typ dotazu." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, executeAction, undoAction } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If undoing an action
    if (undoAction) {
      console.log("Undoing action:", undoAction);
      const result = await undoExecutedAction(supabase, user.id, undoAction);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If executing a confirmed action
    if (executeAction) {
      console.log("Executing confirmed action:", executeAction);
      const result = await executeConfirmedAction(supabase, user.id, executeAction);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get context data for AI
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, credit_balance, is_archived")
      .eq("user_id", user.id)
      .eq("is_archived", false);

    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrainings } = await supabase
      .from("training_sessions")
      .select("*, clients(name)")
      .eq("user_id", user.id)
      .gte("date", today + "T00:00:00")
      .lte("date", today + "T23:59:59");

    const contextInfo = `
Dnešní datum: ${new Date().toLocaleDateString("cs-CZ")}
Aktuální čas: ${new Date().toLocaleTimeString("cs-CZ")}

Klienti (${clients?.length || 0}):
${clients?.map(c => `- ${c.name} (kredit: ${c.credit_balance || 0} Kč)`).join("\n") || "Žádní"}

Dnešní tréninky:
${todayTrainings?.map(t => `- ${new Date(t.date).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })} - ${t.clients?.name}: ${t.status}`).join("\n") || "Žádné"}
`;

    const systemPrompt = `Jsi AI operátor pro aplikaci osobního trenéra. Tvým úkolem je interpretovat příkazy uživatele v přirozeném jazyce a provádět akce.

KONTEXT:
${contextInfo}

PRAVIDLA:
1. Odpovídej VŽDY česky
2. Když uživatel chce provést akci (vytvořit trénink, přidat kredit, zrušit trénink, dokončit trénink), MUSÍŠ použít odpovídající tool
3. Pro dotazy na data použij tool query_data s odpovídajícím query_type
4. Při nejasnostech se zeptej
5. Při interpretaci relativních dat (zítra, příští týden, v pátek) použij dnešní datum jako referenci
6. Buď stručný a jasný

DOSTUPNÉ DOTAZY (query_data tool):
- client_credit: Kredit klienta
- trainings_count: Počet tréninků
- income: Příjmy za období
- trainings_list: Seznam tréninků
- clients_low_credit: Klienti s nízkým kreditem
- client_measurements: Měření klienta (váha, tuk, obvody)
- client_weight_progress: Průběh hubnutí klienta
- client_exercises: Historie cvičení klienta
- client_exercise_prs: Osobní rekordy klienta
- client_cardio: Cardio záznamy klienta
- client_diagnostics: Diagnostiky klienta
- client_profile: Kompletní profil klienta
- exercise_leaderboard: Žebříček pro konkrétní cvik
- all_prs: Všechny poslední osobní rekordy

MÁŠ PŘÍSTUP K TĚMTO DATŮM:
- Kompletní profily klientů (výška, váha, cíle, zdravotní omezení, poznámky)
- Měření a průběh hubnutí
- Záznamy cvičení (silové i cardio)
- Osobní rekordy (PR)
- Diagnostiky
- Žebříčky podle cviků

INTERPRETACE ČASU:
- "zítra" = ${new Date(Date.now() + 24*60*60*1000).toISOString().split("T")[0]}
- "pozítří" = ${new Date(Date.now() + 48*60*60*1000).toISOString().split("T")[0]}
- "tento týden" / "v pátek" = odvoď z dnešního dne (${new Date().toLocaleDateString("cs-CZ", { weekday: "long" })})
- "příští týden" = přidej 7 dní`;

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
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to později." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Nedostatek kreditu pro AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Chyba AI služby" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    
    if (!choice) {
      return new Response(JSON.stringify({ error: "Prázdná odpověď od AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      console.log(`Tool call detected: ${toolName}`, toolArgs);

      const result = await processToolCall(supabase, user.id, toolName, toolArgs);

      if (result.error) {
        return new Response(JSON.stringify({ 
          message: result.error,
          action: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        message: result.message,
        action: result.action,
        requiresConfirmation: result.action !== null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular text response
    return new Response(JSON.stringify({
      message: choice.message?.content || "Promiň, nerozuměl jsem.",
      action: null,
      requiresConfirmation: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI operator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Neznámá chyba" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Execute confirmed actions
async function executeConfirmedAction(supabase: any, userId: string, action: any) {
  console.log("Executing action:", action);

  try {
    switch (action.type) {
      case "create_training": {
        const { error } = await supabase.from("training_sessions").insert({
          user_id: userId,
          client_id: action.params.client_id,
          date: action.params.date,
          duration: action.params.duration,
          participant_count: action.params.participant_count,
          notes: action.params.notes,
          final_price: action.params.final_price,
          status: "scheduled",
          payment_status: "pending",
        });

        if (error) throw error;

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "create",
          table_name: "training_sessions",
          record_id: crypto.randomUUID(),
          new_data: action.params,
          changed_by: "AI Operator",
        });

        return { success: true, message: `✅ Trénink s klientem ${action.params.client_name} byl vytvořen.` };
      }

      case "add_credit": {
        // Update client balance
        const newBalance = (action.params.current_balance || 0) + action.params.amount;
        
        const { error: clientError } = await supabase
          .from("clients")
          .update({ credit_balance: newBalance })
          .eq("id", action.params.client_id);

        if (clientError) throw clientError;

        // Create transaction record
        const { error: txError } = await supabase.from("credit_transactions").insert({
          user_id: userId,
          client_id: action.params.client_id,
          amount: action.params.amount,
          type: "credit",
          payment_method: action.params.payment_method,
          description: action.params.description,
          created_by: "AI Operator",
        });

        if (txError) throw txError;

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "credit_add",
          table_name: "credit_transactions",
          record_id: action.params.client_id,
          new_data: action.params,
          changed_by: "AI Operator",
        });

        return { success: true, message: `✅ Kredit ${action.params.amount.toLocaleString("cs-CZ")} Kč byl přidán klientovi ${action.params.client_name}.` };
      }

      case "cancel_training": {
        const updateData: any = {
          status: "canceled",
          canceled_at: new Date().toISOString(),
          is_late_cancellation: action.params.is_late,
        };

        const { error } = await supabase
          .from("training_sessions")
          .update(updateData)
          .eq("id", action.params.training_id);

        if (error) throw error;

        // Deduct credit if late cancellation
        if (action.params.deduct_credit) {
          const { data: client } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", action.params.client_id)
            .single();

          const newBalance = (client?.credit_balance || 0) - action.params.final_price;

          await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", action.params.client_id);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            client_id: action.params.client_id,
            training_session_id: action.params.training_id,
            amount: -action.params.final_price,
            type: "training_cancellation",
            description: "Pozdní zrušení tréninku",
            created_by: "AI Operator",
          });
        }

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "cancel",
          table_name: "training_sessions",
          record_id: action.params.training_id,
          new_data: updateData,
          changed_by: "AI Operator",
        });

        return { 
          success: true, 
          message: `✅ Trénink s klientem ${action.params.client_name} byl zrušen.${action.params.deduct_credit ? ` Kredit stržen: ${action.params.final_price} Kč.` : ""}` 
        };
      }

      case "complete_training": {
        const paymentStatusMap: Record<string, string> = {
          credit: "paid_credit",
          cash: "paid_cash",
          card: "paid_card",
          pending: "pending",
        };

        const updateData: any = {
          status: "completed",
          payment_status: paymentStatusMap[action.params.payment_method] || "pending",
          payment_method: action.params.payment_method,
        };

        if (action.params.rating) {
          updateData.subjective_rating = action.params.rating;
        }

        const { error } = await supabase
          .from("training_sessions")
          .update(updateData)
          .eq("id", action.params.training_id);

        if (error) throw error;

        // Deduct credit if paid by credit
        if (action.params.payment_method === "credit") {
          const newBalance = (action.params.current_balance || 0) - action.params.final_price;

          await supabase
            .from("clients")
            .update({ credit_balance: newBalance })
            .eq("id", action.params.client_id);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            client_id: action.params.client_id,
            training_session_id: action.params.training_id,
            amount: -action.params.final_price,
            type: "training",
            description: "Trénink",
            created_by: "AI Operator",
          });
        }

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "complete",
          table_name: "training_sessions",
          record_id: action.params.training_id,
          new_data: updateData,
          changed_by: "AI Operator",
        });

        return { 
          success: true, 
          message: `✅ Trénink s klientem ${action.params.client_name} byl dokončen.`,
          undoData: {
            training_id: action.params.training_id,
            client_id: action.params.client_id,
            client_name: action.params.client_name,
            previous_balance: action.params.current_balance,
            deducted_amount: action.params.payment_method === "credit" ? action.params.final_price : 0,
          }
        };
      }

      default:
        return { success: false, message: `Neznámá akce: ${action.type}` };
    }
  } catch (error) {
    console.error("Error executing action:", error);
    return { success: false, message: `Chyba při provádění akce: ${error instanceof Error ? error.message : "Neznámá chyba"}` };
  }
}

// Undo executed actions
async function undoExecutedAction(supabase: any, userId: string, action: any) {
  console.log("Undoing action:", action);

  try {
    switch (action.type) {
      case "create_training": {
        // Find and delete the training created
        const { data: trainings } = await supabase
          .from("training_sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("client_id", action.params.client_id)
          .eq("date", action.params.date)
          .eq("status", "scheduled")
          .limit(1);

        if (trainings && trainings.length > 0) {
          const { error } = await supabase
            .from("training_sessions")
            .delete()
            .eq("id", trainings[0].id);

          if (error) throw error;

          // Log to audit
          await supabase.from("audit_log").insert({
            user_id: userId,
            action: "undo_create",
            table_name: "training_sessions",
            record_id: trainings[0].id,
            old_data: action.params,
            changed_by: "AI Operator (Undo)",
          });

          return { success: true, message: `↩️ Trénink s klientem ${action.params.client_name} byl zrušen (Undo).` };
        }
        return { success: false, message: "Trénink k vrácení nebyl nalezen." };
      }

      case "add_credit": {
        // Reverse the credit addition
        const { data: client } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", action.params.client_id)
          .single();

        const revertedBalance = (client?.credit_balance || 0) - action.params.amount;

        const { error: clientError } = await supabase
          .from("clients")
          .update({ credit_balance: revertedBalance })
          .eq("id", action.params.client_id);

        if (clientError) throw clientError;

        // Create reverse transaction
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          client_id: action.params.client_id,
          amount: -action.params.amount,
          type: "credit_reversal",
          description: `Vrácení: ${action.params.description}`,
          created_by: "AI Operator (Undo)",
        });

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "undo_credit",
          table_name: "credit_transactions",
          record_id: action.params.client_id,
          old_data: action.params,
          changed_by: "AI Operator (Undo)",
        });

        return { success: true, message: `↩️ Kredit ${action.params.amount.toLocaleString("cs-CZ")} Kč byl odebrán klientovi ${action.params.client_name} (Undo).` };
      }

      case "cancel_training": {
        // Restore the training to scheduled
        const { error } = await supabase
          .from("training_sessions")
          .update({
            status: "scheduled",
            canceled_at: null,
            is_late_cancellation: false,
          })
          .eq("id", action.params.training_id);

        if (error) throw error;

        // Refund credit if it was deducted
        if (action.params.deduct_credit) {
          const { data: client } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", action.params.client_id)
            .single();

          const refundedBalance = (client?.credit_balance || 0) + action.params.final_price;

          await supabase
            .from("clients")
            .update({ credit_balance: refundedBalance })
            .eq("id", action.params.client_id);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            client_id: action.params.client_id,
            training_session_id: action.params.training_id,
            amount: action.params.final_price,
            type: "credit_refund",
            description: "Vrácení za zrušený trénink (Undo)",
            created_by: "AI Operator (Undo)",
          });
        }

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "undo_cancel",
          table_name: "training_sessions",
          record_id: action.params.training_id,
          changed_by: "AI Operator (Undo)",
        });

        return { success: true, message: `↩️ Trénink s klientem ${action.params.client_name} byl obnoven (Undo).` };
      }

      case "complete_training": {
        // Revert training to scheduled
        const { error } = await supabase
          .from("training_sessions")
          .update({
            status: "scheduled",
            payment_status: "pending",
            payment_method: null,
            subjective_rating: null,
          })
          .eq("id", action.params.training_id);

        if (error) throw error;

        // Refund credit if it was deducted
        if (action.params.payment_method === "credit") {
          const { data: client } = await supabase
            .from("clients")
            .select("credit_balance")
            .eq("id", action.params.client_id)
            .single();

          const refundedBalance = (client?.credit_balance || 0) + action.params.final_price;

          await supabase
            .from("clients")
            .update({ credit_balance: refundedBalance })
            .eq("id", action.params.client_id);

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            client_id: action.params.client_id,
            training_session_id: action.params.training_id,
            amount: action.params.final_price,
            type: "credit_refund",
            description: "Vrácení za dokončený trénink (Undo)",
            created_by: "AI Operator (Undo)",
          });
        }

        // Log to audit
        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "undo_complete",
          table_name: "training_sessions",
          record_id: action.params.training_id,
          changed_by: "AI Operator (Undo)",
        });

        return { success: true, message: `↩️ Dokončení tréninku s klientem ${action.params.client_name} bylo vráceno (Undo).` };
      }

      default:
        return { success: false, message: `Nelze vrátit akci: ${action.type}` };
    }
  } catch (error) {
    console.error("Error undoing action:", error);
    return { success: false, message: `Chyba při vracení akce: ${error instanceof Error ? error.message : "Neznámá chyba"}` };
  }
}
