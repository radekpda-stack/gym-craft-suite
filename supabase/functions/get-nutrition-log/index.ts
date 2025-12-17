import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_CONTAINER_SIZES = {
  default_glass_ml: 250,
  default_mug_ml: 300,
  default_bottle_ml: 500,
  default_can_ml: 330,
};

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session by token
    const { data: session, error: sessionError } = await supabase
      .from('nutrition_log_sessions')
      .select('*')
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({
      session,
      food: foodRes.data || [],
      drinks: drinksRes.data || [],
      coffee: coffeeRes.data || [],
      containerSizes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
