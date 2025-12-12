import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticData {
  clientName?: string;
  age?: number;
  gender?: string;
  handedness?: string;
  occupation?: string;
  sittingHours?: number;
  sportsHistory?: string;
  currentActivities?: string[];
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  diseases?: string[];
  surgeries?: string[];
  injuries?: string[];
  painAreas?: string[];
  allergies?: string[];
  shortTermGoals?: string;
  longTermGoals?: string;
  mobilityAnkles?: string;
  mobilityHips?: string;
  mobilityThoracic?: string;
  mobilityShoulders?: string;
  coreStability?: string;
  squatQuality?: string;
  lungeQuality?: string;
  pushQuality?: string;
  pullQuality?: string;
  hipHingeQuality?: string;
  painAnkle?: string;
  painKnee?: string;
  painHip?: string;
  painSi?: string;
  painLumbar?: string;
  painThoracic?: string;
  painShoulder?: string;
  painNeck?: string;
  motivationLevel?: number;
  disciplineLevel?: number;
  preferredTrainingStyle?: string;
  eatingRegularity?: string;
  supplements?: string[];
  dietaryRestrictions?: string[];
  trainerNotes?: string;
}

interface AnalysisRequest {
  type: 'form_hints' | 'image_analysis' | 'final_summary';
  diagnosticData?: DiagnosticData;
  imageBase64?: string;
  imageType?: 'posture_front' | 'posture_side' | 'posture_back' | 'movement_video';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { type, diagnosticData, imageBase64, imageType }: AnalysisRequest = await req.json();

    let systemPrompt = '';
    let userContent: any[] = [];

    if (type === 'form_hints') {
      systemPrompt = `Jsi AI asistent pro osobní trenéry. Analyzuješ diagnostické údaje klienta a poskytneš okamžitou zpětnou vazbu.

Tvým úkolem je:
1. Upozornit na chybějící důležité údaje
2. Identifikovat zdravotní rizika
3. Navrhnout doplňující otázky
4. Označit neobvyklé kombinace odpovědí

Odpověz ve formátu JSON:
{
  "warnings": ["seznam varování"],
  "missingCritical": ["chybějící důležité údaje"],
  "suggestedQuestions": ["doplňující otázky"],
  "riskFactors": ["identifikovaná rizika"],
  "notes": "krátká poznámka pro trenéra"
}`;

      userContent = [{ type: 'text', text: `Analyzuj tyto diagnostické údaje klienta:\n${JSON.stringify(diagnosticData, null, 2)}` }];

    } else if (type === 'image_analysis') {
      systemPrompt = `Jsi expert na biomechanickou analýzu postury a pohybu. Analyzuješ fotky/videa klientů osobních trenérů.

Analyzuj obrázek a identifikuj:
1. Asymetrie těla
2. Posturální odchylky (valgus kolen, lordóza, kyfóza, předsunutá hlava, atd.)
3. Rotace nebo vyosení segmentů
4. Potenciální problémy s mobilitou

Odpověz ve formátu JSON:
{
  "asymmetries": ["identifikované asymetrie"],
  "posturalIssues": ["posturální problémy"],
  "mobilityRecommendations": ["doporučení pro mobilitu"],
  "priorityAreas": ["prioritní oblasti pro práci"],
  "summary": "stručné shrnutí nálezu"
}`;

      const imageTypeDesc = {
        'posture_front': 'fotka postury zepředu',
        'posture_side': 'fotka postury z boku',
        'posture_back': 'fotka postury zezadu',
        'movement_video': 'screenshot z videa pohybu'
      };

      userContent = [
        { type: 'text', text: `Analyzuj tuto ${imageTypeDesc[imageType || 'posture_front']}:` },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ];

    } else if (type === 'final_summary') {
      systemPrompt = `Jsi expertní AI asistent pro osobní trenéry. Na základě kompletní diagnostiky vytvoř profesionální shrnutí.

Vytvoř strukturovaný report obsahující:
1. 3 největší rizikové faktory
2. 3 nejsilnější stránky klienta
3. 3 hlavní priority do tréninku
4. Doporučení pro mobilitu a aktivaci
5. Kontraindikace
6. Must-do cviky
7. Must-avoid cviky

Odpověz ve formátu JSON:
{
  "riskFactors": ["3 největší rizikové faktory"],
  "strengths": ["3 nejsilnější stránky"],
  "trainingPriorities": ["3 hlavní priority"],
  "mobilityRecommendations": "text s doporučeními pro mobilitu",
  "activationRecommendations": "text s doporučeními pro aktivaci",
  "technicalFixes": "text s doporučeními pro techniku",
  "contraindications": ["kontraindikace"],
  "mustDoExercises": ["must-do cviky"],
  "avoidExercises": ["cviky, kterým se vyhnout"],
  "overallSummary": "celkové shrnutí pro trenéra (2-3 věty)"
}`;

      userContent = [{ type: 'text', text: `Vytvoř kompletní diagnostický report pro tohoto klienta:\n${JSON.stringify(diagnosticData, null, 2)}` }];
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: type === 'image_analysis' ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch {
      parsedResult = { rawContent: content };
    }

    console.log('Diagnostic AI analysis completed:', type);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in diagnostic-ai function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
