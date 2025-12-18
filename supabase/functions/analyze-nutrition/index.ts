import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoodEntry {
  id: string;
  description: string;
  meal_type?: string;
  portion_size?: string;
  portion_estimate?: string;
  grams?: number;
  entry_time: string;
}

interface DrinkEntry {
  id: string;
  drink_type: string;
  amount_ml?: number;
  amount_container_count?: number;
  amount_container_type?: string;
}

interface CoffeeEntry {
  id: string;
  coffee_type: string;
  count: number;
  sugar: boolean;
  sugar_spoons: number;
  milk?: string;
}

interface DayData {
  date: string;
  food: FoodEntry[];
  drinks: DrinkEntry[];
  coffee: CoffeeEntry[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, analyzeType } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('nutrition_log_sessions')
      .select('*, clients(name)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all entries
    const [{ data: food }, { data: drinks }, { data: coffee }] = await Promise.all([
      supabase.from('nutrition_food_entries').select('*').eq('session_id', sessionId),
      supabase.from('nutrition_drink_entries').select('*').eq('session_id', sessionId),
      supabase.from('nutrition_coffee_entries').select('*').eq('session_id', sessionId),
    ]);

    // Group entries by date
    const dayDataMap = new Map<string, DayData>();
    
    food?.forEach(f => {
      if (!dayDataMap.has(f.entry_date)) {
        dayDataMap.set(f.entry_date, { date: f.entry_date, food: [], drinks: [], coffee: [] });
      }
      dayDataMap.get(f.entry_date)!.food.push(f);
    });
    
    drinks?.forEach(d => {
      if (!dayDataMap.has(d.entry_date)) {
        dayDataMap.set(d.entry_date, { date: d.entry_date, food: [], drinks: [], coffee: [] });
      }
      dayDataMap.get(d.entry_date)!.drinks.push(d);
    });
    
    coffee?.forEach(c => {
      if (!dayDataMap.has(c.entry_date)) {
        dayDataMap.set(c.entry_date, { date: c.entry_date, food: [], drinks: [], coffee: [] });
      }
      dayDataMap.get(c.entry_date)!.coffee.push(c);
    });

    const days = Array.from(dayDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    if (analyzeType === 'daily') {
      // Analyze each day
      const dailyAnalyses = [];

      for (const day of days) {
        const analysis = await analyzeDayWithAI(day, lovableApiKey);
        
        // Save to database
        const { data: saved, error: saveError } = await supabase
          .from('nutrition_daily_analysis')
          .upsert({
            session_id: sessionId,
            client_id: session.client_id,
            analysis_date: day.date,
            user_id: session.user_id,
            ...analysis,
            analyzed_at: new Date().toISOString(),
          }, { onConflict: 'session_id,analysis_date' })
          .select()
          .single();

        if (!saveError) {
          dailyAnalyses.push(saved);
        }
      }

      return new Response(JSON.stringify({ analyses: dailyAnalyses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (analyzeType === 'weekly') {
      // Analyze the whole week
      const weeklyAnalysis = await analyzeWeekWithAI(days, session.clients?.name || 'Klient', lovableApiKey);

      // Save weekly summary
      const { data: saved, error: saveError } = await supabase
        .from('nutrition_weekly_summary')
        .upsert({
          session_id: sessionId,
          client_id: session.client_id,
          user_id: session.user_id,
          ...weeklyAnalysis,
          analyzed_at: new Date().toISOString(),
        }, { onConflict: 'session_id' })
        .select()
        .single();

      return new Response(JSON.stringify({ summary: saved }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid analyzeType' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeDayWithAI(day: DayData, apiKey: string) {
  const prompt = buildDailyPrompt(day);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: DAILY_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      tools: [dailyAnalysisTool],
      tool_choice: { type: 'function', function: { name: 'daily_nutrition_analysis' } },
    }),
  });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  return getDefaultDailyAnalysis();
}

async function analyzeWeekWithAI(days: DayData[], clientName: string, apiKey: string) {
  const prompt = buildWeeklyPrompt(days, clientName);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: WEEKLY_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      tools: [weeklyAnalysisTool],
      tool_choice: { type: 'function', function: { name: 'weekly_nutrition_summary' } },
    }),
  });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  return getDefaultWeeklyAnalysis();
}

const DAILY_SYSTEM_PROMPT = `Jsi výživový asistent pro osobního trenéra. Analyzuješ denní jídelníček klienta a poskytneš orientační hodnocení.

PRAVIDLA:
- Nikdy nepočítej přesné kalorie - pouze orientační rozsahy
- Buď motivační a neutrální, bez moralizování
- Zaměř se na praktická doporučení
- Rozpoznej ultra-processed potraviny
- Hodnoť kvalitu, ne jen kvantitu

BODOVÉ HODNOCENÍ (0-5):
- 0 = kritické nedostatky
- 1 = výrazné problémy
- 2 = pod průměrem
- 3 = průměr
- 4 = dobrý
- 5 = výborný

Odpovídej pouze česky.`;

const WEEKLY_SYSTEM_PROMPT = `Jsi výživový asistent pro osobního trenéra. Vytváříš týdenní shrnutí jídelníčku klienta.

PRAVIDLA:
- Identifikuj opakující se vzorce (pozitivní i negativní)
- Max 3 doporučení pro klienta - konkrétní a realizovatelná
- Pro trenéra: identifikuj rizika a priority
- Buď motivační, ne kritický
- Kalorie pouze jako orientační rozsah

Odpovídej pouze česky.`;

function buildDailyPrompt(day: DayData): string {
  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Snídaně',
    snack_am: 'Dopolední svačina',
    lunch: 'Oběd',
    snack_pm: 'Odpolední svačina',
    dinner: 'Večeře',
    snack: 'Svačina',
  };

  const portionLabels: Record<string, string> = {
    small: 'malá porce (~150g)',
    medium: 'střední porce (~250g)',
    large: 'velká porce (~400g)',
    palm: 'velikost dlaně',
    fist: 'velikost pěsti',
    handful: 'hrst',
    thumb: 'velikost palce',
  };

  let prompt = `Datum: ${day.date}\n\n`;
  
  prompt += `JÍDLO (${day.food.length} záznamů):\n`;
  day.food.forEach(f => {
    const mealType = f.meal_type ? mealTypeLabels[f.meal_type] || f.meal_type : 'Nespecifikováno';
    const portion = f.portion_size ? portionLabels[f.portion_size] : 
                    f.portion_estimate ? portionLabels[f.portion_estimate] :
                    f.grams ? `${f.grams}g` : 'neznámá porce';
    prompt += `- ${f.entry_time?.slice(0,5) || '??:??'} [${mealType}]: ${f.description} (${portion})\n`;
  });
  
  prompt += `\nNÁPOJE (${day.drinks.length} záznamů):\n`;
  day.drinks.forEach(d => {
    const ml = d.amount_ml || (d.amount_container_count || 1) * getContainerMl(d.amount_container_type);
    prompt += `- ${d.drink_type}: ${ml}ml\n`;
  });
  
  prompt += `\nKÁVA (${day.coffee.length} záznamů):\n`;
  day.coffee.forEach(c => {
    const sugar = c.sugar ? `, ${c.sugar_spoons} lžičky cukru` : '';
    const milk = c.milk && c.milk !== 'none' ? `, s mlékem` : '';
    prompt += `- ${c.coffee_type} ×${c.count}${sugar}${milk}\n`;
  });

  return prompt;
}

function buildWeeklyPrompt(days: DayData[], clientName: string): string {
  let prompt = `Klient: ${clientName}\nPočet dní se záznamy: ${days.length}/7\n\n`;
  
  days.forEach(day => {
    prompt += `--- ${day.date} ---\n`;
    prompt += `Jídel: ${day.food.length}, Nápojů: ${day.drinks.length}, Káv: ${day.coffee.length}\n`;
    day.food.forEach(f => prompt += `  • ${f.description}\n`);
    prompt += '\n';
  });

  return prompt;
}

function getContainerMl(type?: string): number {
  const sizes: Record<string, number> = {
    small_glass: 250,
    large_glass: 500,
    glass: 250,
    mug: 300,
    bottle: 500,
    can: 330,
  };
  return sizes[type || 'glass'] || 250;
}

const dailyAnalysisTool = {
  type: 'function',
  function: {
    name: 'daily_nutrition_analysis',
    description: 'Denní analýza výživy s orientačním hodnocením',
    parameters: {
      type: 'object',
      properties: {
        calorie_range_low: { type: 'integer', description: 'Dolní odhad kalorií' },
        calorie_range_high: { type: 'integer', description: 'Horní odhad kalorií' },
        calorie_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Úroveň příjmu' },
        protein_sources: { type: 'array', items: { type: 'string' }, description: 'Zdroje bílkovin' },
        carb_sources: { type: 'array', items: { type: 'string' }, description: 'Zdroje sacharidů' },
        fat_sources: { type: 'array', items: { type: 'string' }, description: 'Zdroje tuků' },
        vegetables_fruits: { type: 'array', items: { type: 'string' }, description: 'Zelenina a ovoce' },
        ultra_processed: { type: 'array', items: { type: 'string' }, description: 'Ultra-processed potraviny' },
        protein_score: { type: 'integer', minimum: 0, maximum: 5 },
        vegetable_fiber_score: { type: 'integer', minimum: 0, maximum: 5 },
        carb_quality_score: { type: 'integer', minimum: 0, maximum: 5 },
        fat_quality_score: { type: 'integer', minimum: 0, maximum: 5 },
        meal_regularity_score: { type: 'integer', minimum: 0, maximum: 5 },
        hydration_score: { type: 'integer', minimum: 0, maximum: 5 },
        ultra_processed_score: { type: 'integer', minimum: 0, maximum: 5 },
        alcohol_sugar_score: { type: 'integer', minimum: 0, maximum: 5 },
        feedback_positive: { type: 'string', description: 'Co bylo dnes dobré (max 2 věty)' },
        feedback_improve: { type: 'string', description: 'Co by šlo zlepšit (max 2 věty)' },
        feedback_suggestions: { type: 'array', items: { type: 'string' }, description: '1-2 konkrétní návrhy změn' },
      },
      required: ['calorie_level', 'protein_score', 'hydration_score', 'feedback_positive', 'feedback_improve'],
    },
  },
};

const weeklyAnalysisTool = {
  type: 'function',
  function: {
    name: 'weekly_nutrition_summary',
    description: 'Týdenní shrnutí výživy',
    parameters: {
      type: 'object',
      properties: {
        avg_calorie_range_low: { type: 'integer' },
        avg_calorie_range_high: { type: 'integer' },
        calorie_trend: { type: 'string', enum: ['stable', 'increasing', 'decreasing', 'irregular'] },
        avg_quality_scores: { 
          type: 'object',
          properties: {
            protein: { type: 'number' },
            vegetables: { type: 'number' },
            hydration: { type: 'number' },
            regularity: { type: 'number' },
          }
        },
        quality_trend_summary: { type: 'string', description: 'Stručné shrnutí kvality stravy' },
        client_strengths: { type: 'array', items: { type: 'string' }, description: 'Silné stránky (max 3)' },
        client_weaknesses: { type: 'array', items: { type: 'string' }, description: 'Slabiny (max 3)' },
        client_recommendations: { type: 'array', items: { type: 'string' }, description: 'Doporučení pro klienta (max 3)' },
        trainer_risks: { type: 'array', items: { type: 'string' }, description: 'Rizika pro trenéra' },
        trainer_observations: { type: 'string', description: 'Klíčová pozorování' },
        trainer_conclusion: { type: 'string', description: 'Závěr a priority' },
      },
      required: ['calorie_trend', 'client_strengths', 'client_recommendations', 'trainer_conclusion'],
    },
  },
};

function getDefaultDailyAnalysis() {
  return {
    calorie_range_low: null,
    calorie_range_high: null,
    calorie_level: 'medium',
    protein_sources: [],
    carb_sources: [],
    fat_sources: [],
    vegetables_fruits: [],
    ultra_processed: [],
    protein_score: 3,
    vegetable_fiber_score: 3,
    carb_quality_score: 3,
    fat_quality_score: 3,
    meal_regularity_score: 3,
    hydration_score: 3,
    ultra_processed_score: 3,
    alcohol_sugar_score: 3,
    feedback_positive: 'Děkujeme za vyplnění jídelníčku.',
    feedback_improve: 'Pro detailnější analýzu zkuste přidat více informací.',
    feedback_suggestions: [],
  };
}

function getDefaultWeeklyAnalysis() {
  return {
    avg_calorie_range_low: null,
    avg_calorie_range_high: null,
    calorie_trend: 'stable',
    avg_quality_scores: { protein: 3, vegetables: 3, hydration: 3, regularity: 3 },
    quality_trend_summary: 'Nedostatek dat pro detailní analýzu.',
    client_strengths: ['Pravidelné záznamy'],
    client_weaknesses: [],
    client_recommendations: ['Pokračujte v zaznamenávání stravy'],
    trainer_risks: [],
    trainer_observations: 'Nedostatek dat.',
    trainer_conclusion: 'Pro komplexní hodnocení je třeba více záznamů.',
  };
}
