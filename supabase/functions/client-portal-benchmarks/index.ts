import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, clientId, trainerId, exerciseName, metricType, groupKey, challengeId, minGroupSize } = await req.json();

    console.log(`[Benchmarks] Action: ${action}, ClientId: ${clientId}, Exercise: ${exerciseName}`);

    // Validate client has opt-in for benchmarks
    if (action === 'get_benchmark' || action === 'get_leaderboard') {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('allow_anonymous_benchmarks, allow_challenges_participation, gender')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('[Benchmarks] Client fetch error:', clientError);
        return new Response(
          JSON.stringify({ error: 'client_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!client.allow_anonymous_benchmarks && action === 'get_benchmark') {
        return new Response(
          JSON.stringify({ 
            error: 'opt_in_required', 
            message: 'Client has not opted in to anonymous benchmarks' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get trainer's comparison settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('user_id', trainerId)
      .eq('key', 'comparison_settings')
      .single();

    const comparisonSettings = settings?.value || {
      display_mode: 'both',
      min_group_size: 8,
      benchmark_groups_enabled: ['all']
    };

    const effectiveMinGroupSize = minGroupSize || comparisonSettings.min_group_size || 8;

    if (action === 'get_benchmark') {
      // Call the SQL function
      const { data, error } = await supabase.rpc('calculate_exercise_benchmark', {
        p_exercise_name: exerciseName,
        p_trainer_id: trainerId,
        p_client_id: clientId,
        p_metric_type: metricType || 'strength',
        p_group_key: groupKey || 'all',
        p_min_group_size: effectiveMinGroupSize
      });

      if (error) {
        console.error('[Benchmarks] RPC error:', error);
        return new Response(
          JSON.stringify({ error: 'calculation_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Benchmarks] Benchmark result:', data);

      return new Response(
        JSON.stringify({ 
          ...data,
          display_mode: comparisonSettings.display_mode,
          available_groups: comparisonSettings.benchmark_groups_enabled || ['all']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_leaderboard') {
      const { data, error } = await supabase.rpc('get_challenge_leaderboard', {
        p_challenge_id: challengeId,
        p_client_id: clientId,
        p_min_group_size: effectiveMinGroupSize
      });

      if (error) {
        console.error('[Benchmarks] Leaderboard RPC error:', error);
        return new Response(
          JSON.stringify({ error: 'leaderboard_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ...data,
          display_mode: comparisonSettings.display_mode
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_active_challenges') {
      const now = new Date().toISOString();
      
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'published')
        .eq('created_by_user_id', trainerId)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('start_at', { ascending: false });

      if (error) {
        console.error('[Benchmarks] Challenges fetch error:', error);
        return new Response(
          JSON.stringify({ error: 'fetch_failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client's submissions for these challenges
      const challengeIds = challenges?.map(c => c.id) || [];
      
      let submissions: any[] = [];
      if (challengeIds.length > 0) {
        const { data: subs } = await supabase
          .from('challenge_submissions')
          .select('*')
          .eq('client_id', clientId)
          .in('challenge_id', challengeIds)
          .order('submitted_at', { ascending: false });
        
        submissions = subs || [];
      }

      // Get participant counts for each challenge
      const participantCounts: Record<string, number> = {};
      for (const challenge of challenges || []) {
        const { count } = await supabase
          .from('challenge_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id)
          .eq('status', 'approved');
        
        participantCounts[challenge.id] = count || 0;
      }

      return new Response(
        JSON.stringify({
          challenges: challenges || [],
          clientSubmissions: submissions,
          participantCounts,
          display_mode: comparisonSettings.display_mode,
          min_group_size: effectiveMinGroupSize
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'submit_challenge') {
      const { score_primary, score_secondary, note, video_url } = await req.json();

      // Validate client can participate
      const { data: client } = await supabase
        .from('clients')
        .select('allow_challenges_participation')
        .eq('id', clientId)
        .single();

      // Get or create pseudonym
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      // Insert submission
      const { data: submission, error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challengeId,
          client_id: clientId,
          score_primary,
          score_secondary,
          note,
          video_url,
          status: 'approved' // Auto-approve for MVP
        })
        .select()
        .single();

      if (error) {
        console.error('[Benchmarks] Submission error:', error);
        return new Response(
          JSON.stringify({ error: 'submission_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Benchmarks] Submission created:', submission.id);

      return new Response(
        JSON.stringify({ success: true, submission }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'unknown_action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Benchmarks] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
