import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize response time to prevent timing attacks
const MIN_RESPONSE_TIME_MS = 150;

async function normalizeResponseTime<T>(startTime: number, response: T): Promise<T> {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
  }
  return response;
}

const DEFAULT_CONTAINER_SIZES = {
  default_glass_ml: 250,
  default_mug_ml: 300,
  default_bottle_ml: 500,
  default_can_ml: 330,
};

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both GET (query params) and POST (JSON body)
    let token: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    } else {
      const body = await req.json();
      token = body.token;
    }

    if (!token) {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Token required', code: 'MISSING_TOKEN' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Invalid token', code: 'INVALID_TOKEN' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching nutrition log for token: ${token.substring(0, 8)}...`);

    // Get session by token
    const { data: session, error: sessionError } = await supabase
      .from('nutrition_log_sessions')
      .select('*')
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      // Use consistent response for not found (prevents token enumeration)
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Invalid token', code: 'NOT_FOUND' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // Get entries and settings in parallel
    const [foodRes, drinksRes, coffeeRes, settingsRes] = await Promise.all([
      supabase.from('nutrition_food_entries').select('*').eq('session_id', session.id).order('entry_date').order('entry_time'),
      supabase.from('nutrition_drink_entries').select('*').eq('session_id', session.id).order('entry_date').order('entry_time'),
      supabase.from('nutrition_coffee_entries').select('*').eq('session_id', session.id).order('entry_date').order('entry_time'),
      supabase.from('app_settings').select('value').eq('user_id', session.user_id).eq('key', 'nutrition_settings').maybeSingle(),
    ]);

    // Merge user settings with defaults
    const containerSizes = {
      ...DEFAULT_CONTAINER_SIZES,
      ...(settingsRes.data?.value as Record<string, number> || {}),
    };

    return await normalizeResponseTime(startTime, new Response(
      JSON.stringify({
        session,
        food: foodRes.data || [],
        drinks: drinksRes.data || [],
        coffee: coffeeRes.data || [],
        containerSizes,
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    ));

  } catch (error) {
    console.error('Error:', error);
    return await normalizeResponseTime(Date.now(), new Response(
      JSON.stringify({ error: 'Unable to load data', code: 'INTERNAL_ERROR' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    ));
  }
});
