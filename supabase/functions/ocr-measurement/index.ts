import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Send to Lovable AI for OCR extraction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this body composition measurement image and extract the following values. 
Return ONLY a valid JSON object with these fields (use null for values not found):

{
  "clientName": "string or null - name of the person if visible",
  "date": "string or null - measurement date in YYYY-MM-DD format if visible",
  "weight": "number or null - body weight in kg",
  "bodyFatPercentage": "number or null - body fat percentage",
  "muscleMass": "number or null - muscle mass in kg",
  "basalMetabolism": "number or null - basal metabolic rate in kcal",
  "visceralFat": "number or null - visceral fat level (usually 1-60)",
  "rawText": "string - all text visible in the image"
}

Look for these common labels in Czech and English:
- Weight/Váha/Hmotnost
- Body Fat/Tělesný tuk/Procento tuku
- Muscle Mass/Svalová hmota
- BMR/Bazální metabolismus/Klidový metabolismus
- Visceral Fat/Viscerální tuk/Útrobní tuk

Parse numbers carefully, handling both comma and dot as decimal separators.
Return ONLY the JSON object, no markdown or explanation.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error:', errorText);
      throw new Error('Failed to analyze image');
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OCR service');
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OCR response:', content);
      throw new Error('Failed to parse OCR result');
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
