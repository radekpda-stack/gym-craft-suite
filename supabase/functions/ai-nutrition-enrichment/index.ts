import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NutritionEnrichmentInput {
  entryId?: string;
  templateId?: string;
  description: string;
  portionSize?: string;
  clientId: string;
}

interface AIResponse {
  calories_low: number;
  calories_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  normalized_name: string;
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
      console.error('[ai-nutrition-enrichment] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input: NutritionEnrichmentInput = await req.json();
    const { entryId, templateId, description, portionSize = 'medium', clientId } = input;

    console.log('[ai-nutrition-enrichment] Processing:', { 
      description, 
      portionSize, 
      clientId, 
      templateId, 
      entryId,
      hasEntryId: !!entryId,
    });

    if (!description || !clientId) {
      console.error('[ai-nutrition-enrichment] Missing required fields:', { description, clientId });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get portion size description
    const portionDescriptions: Record<string, string> = {
      small: 'malá (~150g)',
      medium: 'střední (~250g)',
      large: 'velká (~400g)',
    };
    const portionDesc = portionDescriptions[portionSize] || 'střední (~250g)';

    // Call Lovable AI Gateway
    const systemPrompt = `Jsi nutriční expert. Analyzuj tento popis jídla a odhadni nutriční hodnoty.

Pravidla:
- Odhadni kalorie s rozmezím (low/high) pro danou velikost porce
- Bílkoviny, sacharidy, tuky v gramech
- Pokud je popis nejasný, použij průměrné hodnoty pro typické české jídlo
- Normalizuj název (oprav překlepy, sjednoť formát, první písmeno velké)
- Buď realističtý - běžné české jídlo má 300-600 kcal

Odpověz POUZE ve formátu JSON bez dalšího textu:
{
  "calories_low": number,
  "calories_high": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "normalized_name": "string",
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `Jídlo: "${description}"
Velikost porce: ${portionDesc}`;

    console.log('[ai-nutrition-enrichment] Calling AI with prompt:', userPrompt);

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
      console.error('[ai-nutrition-enrichment] AI API error:', aiResponse.status, errorText);
      
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
      console.error('[ai-nutrition-enrichment] No content in AI response');
      return new Response(JSON.stringify({ error: 'No AI response content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from AI response (handle possible markdown code blocks)
    let nutritionData: AIResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      nutritionData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[ai-nutrition-enrichment] Failed to parse AI response:', content, parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ai-nutrition-enrichment] AI result:', nutritionData);

    // Calculate average calories
    const avgCalories = Math.round((nutritionData.calories_low + nutritionData.calories_high) / 2);

    // PRIORITY 1: Update the specific food entry with nutrition data (most important)
    let entryUpdated = false;
    if (entryId) {
      console.log('[ai-nutrition-enrichment] Updating entry:', entryId, 'with calories:', avgCalories);
      
      const { data: updatedEntry, error: entryUpdateError } = await supabase
        .from('nutrition_food_entries')
        .update({
          calories: avgCalories,
          protein_g: nutritionData.protein_g,
          carbs_g: nutritionData.carbs_g,
          fat_g: nutritionData.fat_g,
          fiber_g: nutritionData.fiber_g || null,
          ai_enriched: true,
          ai_enriched_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select('id')
        .maybeSingle();

      if (entryUpdateError) {
        console.error('[ai-nutrition-enrichment] Failed to update entry:', entryUpdateError.message, entryUpdateError.details);
      } else if (updatedEntry) {
        console.log('[ai-nutrition-enrichment] ✅ Successfully updated entry:', entryId);
        entryUpdated = true;
      } else {
        console.warn('[ai-nutrition-enrichment] Entry not found or not updated:', entryId);
      }
    } else {
      console.warn('[ai-nutrition-enrichment] No entryId provided, skipping entry update');
    }

    // PRIORITY 2: Find or update meal template (secondary)
    let targetTemplateId = templateId;

    if (!targetTemplateId) {
      // Find template by description (case-insensitive search with partial match)
      const normalizedDesc = description.toLowerCase().trim();
      const { data: existingTemplate } = await supabase
        .from('nutrition_meal_templates')
        .select('id')
        .eq('client_id', clientId)
        .ilike('description', `%${normalizedDesc}%`)
        .maybeSingle();

      targetTemplateId = existingTemplate?.id;
    }

    if (targetTemplateId) {
      const { error: updateError } = await supabase
        .from('nutrition_meal_templates')
        .update({
          calories_per_portion: avgCalories,
          protein_g: nutritionData.protein_g,
          carbs_g: nutritionData.carbs_g,
          fat_g: nutritionData.fat_g,
          fiber_g: nutritionData.fiber_g || null,
          normalized_name: nutritionData.normalized_name,
          ai_enriched: true,
          ai_enriched_at: new Date().toISOString(),
        })
        .eq('id', targetTemplateId);

      if (updateError) {
        console.error('[ai-nutrition-enrichment] Failed to update template:', updateError);
      } else {
        console.log('[ai-nutrition-enrichment] Successfully updated template:', targetTemplateId);
      }
    } else {
      console.log('[ai-nutrition-enrichment] No template found to update for:', description);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: nutritionData,
      templateId: targetTemplateId,
      entryUpdated,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-nutrition-enrichment] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
