import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId } = await req.json();
    
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
    
    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch context data based on user
    let contextData = "";
    
    // Get all clients for this user
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id);

    // Get recent training sessions
    const { data: trainings } = await supabase
      .from("training_sessions")
      .select("*, clients(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50);

    // Get recent measurements
    const { data: measurements } = await supabase
      .from("measurements")
      .select("*, clients(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);

    // Get diagnostics
    const { data: diagnostics } = await supabase
      .from("diagnostics")
      .select("*, clients(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);

    // If specific client is selected, get detailed data
    let clientDetail = null;
    if (clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .eq("user_id", user.id)
        .single();
      
      if (client) {
        const { data: clientTrainings } = await supabase
          .from("training_sessions")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false });

        const { data: clientMeasurements } = await supabase
          .from("measurements")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false });

        const { data: clientDiagnostics } = await supabase
          .from("diagnostics")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false });

        clientDetail = {
          ...client,
          trainings: clientTrainings,
          measurements: clientMeasurements,
          diagnostics: clientDiagnostics,
        };
      }
    }

    // Build context
    contextData = `
## Přehled dat trenéra

### Klienti (${clients?.length || 0}):
${clients?.map(c => `- ${c.name}: kredit ${c.credit_balance || 0} Kč, cíle: ${c.training_goals?.join(", ") || "neuvedeny"}, zdravotní omezení: ${c.health_restrictions || "žádná"}`).join("\n") || "Žádní klienti"}

### Poslední tréninky:
${trainings?.slice(0, 20).map(t => `- ${new Date(t.date).toLocaleDateString("cs-CZ")} - ${t.clients?.name || "?"}: ${t.status}, ${t.duration} min, hodnocení: ${t.subjective_rating || "?"}/5`).join("\n") || "Žádné tréninky"}

### Poslední měření:
${measurements?.slice(0, 15).map(m => `- ${new Date(m.date).toLocaleDateString("cs-CZ")} - ${m.clients?.name || "?"}: váha ${m.weight || "?"}kg, tuk ${m.body_fat_percentage || "?"}%, svaly ${m.muscle_mass || "?"}kg`).join("\n") || "Žádná měření"}

### Poslední diagnostiky:
${diagnostics?.slice(0, 15).map(d => `- ${new Date(d.date).toLocaleDateString("cs-CZ")} - ${d.clients?.name || "?"}: ${d.area_name} (${d.area_type}) - ${d.findings}`).join("\n") || "Žádné diagnostiky"}
`;

    if (clientDetail) {
      contextData += `

## Detail klienta: ${clientDetail.name}
- Email: ${clientDetail.email || "neuvedeno"}
- Telefon: ${clientDetail.phone || "neuvedeno"}
- Datum narození: ${clientDetail.birth_date || "neuvedeno"}
- Kredit: ${clientDetail.credit_balance || 0} Kč
- Cíle: ${clientDetail.training_goals?.join(", ") || "neuvedeny"}
- Zdravotní omezení: ${clientDetail.health_restrictions || "žádná"}
- Poznámky: ${clientDetail.notes || "žádné"}

### Historie tréninků (${clientDetail.trainings?.length || 0}):
${clientDetail.trainings?.slice(0, 20).map((t: any) => `- ${new Date(t.date).toLocaleDateString("cs-CZ")}: ${t.status}, ${t.duration} min, hodnocení: ${t.subjective_rating || "?"}/5, poznámky: ${t.notes || "-"}`).join("\n") || "Žádné"}

### Historie měření (${clientDetail.measurements?.length || 0}):
${clientDetail.measurements?.map((m: any) => `- ${new Date(m.date).toLocaleDateString("cs-CZ")}: váha ${m.weight || "?"}kg, tuk ${m.body_fat_percentage || "?"}%, svaly ${m.muscle_mass || "?"}kg, pas ${m.waist || "?"}cm`).join("\n") || "Žádná"}

### Diagnostiky (${clientDetail.diagnostics?.length || 0}):
${clientDetail.diagnostics?.map((d: any) => `- ${new Date(d.date).toLocaleDateString("cs-CZ")}: ${d.area_name} - ${d.findings}`).join("\n") || "Žádné"}
`;
    }

    const systemPrompt = `Jsi osobní AI asistent pro trenéra. Pomáháš s analýzou dat klientů, navrhováním tréninků a shrnutím pokroků.

Máš přístup k těmto datům:
${contextData}

Pravidla:
- Odpovídej vždy česky
- Buď stručný a konkrétní
- Při návrhu tréninků zohledni zdravotní omezení klienta
- Při shrnutí pokroku používej konkrétní čísla z měření
- Pokud nemáš dostatek dat, řekni to
- Formátuj odpovědi přehledně s odrážkami když je to vhodné`;

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Neznámá chyba" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
