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

    console.log('Processing Garmin screenshot for OCR extraction...');

    // Send to Lovable AI for OCR extraction - using gemini-2.5-pro for complex image analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at extracting training data from Garmin Connect app screenshots.
Analyze this screenshot carefully and extract all visible training metrics.

Return ONLY a valid JSON object with these fields (use null for values not found):

{
  "activityType": "string - one of: running, cycling, swimming, strength, hiit, walking, hiking, other",
  "title": "string or null - activity name/title if visible",
  "date": "string or null - activity date in YYYY-MM-DD format",
  "durationSeconds": "number or null - total duration in seconds",
  "distanceMeters": "number or null - distance in meters",
  "pacePerKm": "number or null - pace in seconds per kilometer (for running/walking)",
  "speedKmh": "number or null - average speed in km/h (for cycling)",
  "avgHeartRate": "number or null - average heart rate in bpm",
  "maxHeartRate": "number or null - maximum heart rate in bpm",
  "calories": "number or null - calories burned",
  "cadence": "number or null - average cadence (steps/min for running, rpm for cycling)",
  "elevationGain": "number or null - total elevation gain in meters",
  "avgPower": "number or null - average power in watts (cycling/running power)",
  "trainingEffect": "number or null - Garmin training effect (1.0-5.0)",
  "vo2Max": "number or null - VO2 max if shown",
  "sets": "number or null - number of sets (for strength training)",
  "reps": "number or null - total reps (for strength training)",
  "exercises": "array or null - list of exercise names (for strength training)",
  "rawText": "string - all text visible in the screenshot for reference"
}

IMPORTANT parsing rules:
1. Time format "MM:SS" means minutes:seconds, convert to total seconds
2. Time format "HH:MM:SS" means hours:minutes:seconds, convert to total seconds
3. Pace like "5:30 /km" means 5 minutes 30 seconds per km = 330 seconds
4. Distance in km multiply by 1000 for meters
5. Handle both comma and dot as decimal separators
6. Look for Czech labels: Vzdálenost, Čas, Tempo, Tep, Kadence, Převýšení, Kalorie
7. Look for English labels: Distance, Time, Pace, Heart Rate, Cadence, Elevation, Calories

Analyze the image carefully - Garmin screenshots often have multiple panels with different metrics.
Return ONLY the JSON object, no markdown, no explanation.`,
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
      console.error('OCR API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to analyze image');
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    console.log('OCR raw response:', content?.substring(0, 500));

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

    console.log('Successfully extracted Garmin data:', JSON.stringify(extractedData, null, 2));

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Garmin OCR error:', error);
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
