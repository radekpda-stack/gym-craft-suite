import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WorkoutExercise {
  exercise_name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_meters?: number;
}

interface WorkoutCaloriesInput {
  workoutLogId: string;
  workoutType?: string;
  durationMinutes?: number;
  exercises?: WorkoutExercise[];
  clientWeight?: number;
}

interface AIResponse {
  calories_burned: number;
  breakdown: { activity: string; calories: number }[];
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('[ai-workout-calories] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input: WorkoutCaloriesInput = await req.json();
    const { workoutLogId, workoutType, durationMinutes, exercises = [], clientWeight = 70 } = input;

    console.log('[ai-workout-calories] Processing:', { workoutLogId, workoutType, durationMinutes, exerciseCount: exercises.length, clientWeight });

    if (!workoutLogId) {
      return new Response(JSON.stringify({ error: 'Missing workoutLogId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Format exercises for AI
    const exerciseDescriptions = exercises.map(ex => {
      const parts = [ex.exercise_name];
      if (ex.sets && ex.reps) parts.push(`${ex.sets}×${ex.reps}`);
      if (ex.weight_kg) parts.push(`${ex.weight_kg}kg`);
      if (ex.duration_seconds) parts.push(`${Math.round(ex.duration_seconds / 60)} min`);
      if (ex.distance_meters) parts.push(`${ex.distance_meters}m`);
      return parts.join(' ');
    }).join(', ');

    // Call Lovable AI Gateway
    const systemPrompt = `Jsi fitness expert. Vypočítej kalorický výdej tréninku.

Použij MET hodnoty pro různé aktivity:
- Běh 8 km/h = 8.3 MET
- Běh 10 km/h = 10 MET
- Silový trénink = 6.0 MET
- HIIT = 8.0 MET
- Jóga = 3.0 MET
- Cyklistika = 7.5 MET
- Plavání = 7.0 MET
- Chůze = 3.5 MET
- Posilování = 5.0 MET
- Kardio obecně = 7.0 MET

Vzorec: Kalorie = MET × váha(kg) × čas(h)

Odpověz POUZE ve formátu JSON bez dalšího textu:
{
  "calories_burned": number,
  "breakdown": [{ "activity": "string", "calories": number }],
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `Typ tréninku: ${workoutType || 'obecný'}
Délka: ${durationMinutes || 45} minut
Váha klienta: ${clientWeight} kg
Cviky: ${exerciseDescriptions || 'obecný trénink'}`;

    console.log('[ai-workout-calories] Calling AI with prompt:', userPrompt);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ai-workout-calories] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI request failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[ai-workout-calories] No content in AI response');
      return new Response(JSON.stringify({ error: 'No AI response content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from AI response (handle possible markdown code blocks)
    let caloriesData: AIResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      caloriesData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[ai-workout-calories] Failed to parse AI response:', content, parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ai-workout-calories] AI result:', caloriesData);

    // Update the workout log with calories
    const { error: updateError } = await supabase
      .from('client_workout_logs')
      .update({
        calories_burned: caloriesData.calories_burned,
        ai_enriched: true,
        ai_enriched_at: new Date().toISOString(),
      })
      .eq('id', workoutLogId);

    if (updateError) {
      console.error('[ai-workout-calories] Failed to update workout log:', updateError);
    } else {
      console.log('[ai-workout-calories] Successfully updated workout log:', workoutLogId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: caloriesData,
      workoutLogId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-workout-calories] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
