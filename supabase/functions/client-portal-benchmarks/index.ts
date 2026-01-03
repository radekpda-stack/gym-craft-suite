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

    const body = await req.json();
    const { 
      action, clientId, trainerId, exerciseName, metricType, groupKey, 
      challengeId, minGroupSize, score_primary, score_secondary, note, 
      video_url, media_urls, teamName, inviteCode, teamId 
    } = body;

    console.log(`[Benchmarks] Action: ${action}, ClientId: ${clientId}, ChallengeId: ${challengeId}, Exercise: ${exerciseName}`);

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
      // Validate client can participate
      const { data: client } = await supabase
        .from('clients')
        .select('allow_challenges_participation')
        .eq('id', clientId)
        .single();

      // Get challenge to check if team challenge
      const { data: challenge } = await supabase
        .from('challenges')
        .select('is_team_challenge')
        .eq('id', challengeId)
        .single();

      // Get or create pseudonym
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      // Get client's team if this is a team challenge
      let clientTeamId = null;
      if (challenge?.is_team_challenge) {
        const { data: membership } = await supabase
          .from('challenge_team_members')
          .select('team_id')
          .eq('client_id', clientId)
          .maybeSingle();
        
        if (membership) {
          // Verify team belongs to this challenge
          const { data: team } = await supabase
            .from('challenge_teams')
            .select('id')
            .eq('id', membership.team_id)
            .eq('challenge_id', challengeId)
            .single();
          
          if (team) {
            clientTeamId = team.id;
          }
        }
      }

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
          media_urls: media_urls || null,
          team_id: clientTeamId,
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

    // TEAM ACTIONS
    if (action === 'create_team') {
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('challenge_teams')
        .insert({
          challenge_id: challengeId,
          team_name: teamName,
          captain_client_id: clientId,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (teamError) {
        console.error('[Benchmarks] Team creation error:', teamError);
        return new Response(
          JSON.stringify({ error: 'team_creation_failed', details: teamError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add captain as first member
      await supabase
        .from('challenge_team_members')
        .insert({
          team_id: team.id,
          client_id: clientId,
          role: 'captain',
        });

      // Ensure pseudonym exists
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      console.log('[Benchmarks] Team created:', team.id);

      return new Response(
        JSON.stringify({ success: true, team, invite_code: inviteCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'join_team') {
      // Find team by invite code
      const { data: team, error: teamError } = await supabase
        .from('challenge_teams')
        .select('*, challenge:challenges(*)')
        .eq('invite_code', inviteCode)
        .eq('challenge_id', challengeId)
        .single();

      if (teamError || !team) {
        return new Response(
          JSON.stringify({ error: 'team_not_found', message: 'Neplatný kód pozvánky' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if team is full
      const challenge = team.challenge as any;
      if (team.member_count >= (challenge.max_team_size || 4)) {
        return new Response(
          JSON.stringify({ error: 'team_full', message: 'Tým je již plný' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if client is already in a team for this challenge
      const { data: existingMembership } = await supabase
        .from('challenge_team_members')
        .select('id, team:challenge_teams!inner(challenge_id)')
        .eq('client_id', clientId)
        .eq('team.challenge_id', challengeId)
        .maybeSingle();

      if (existingMembership) {
        return new Response(
          JSON.stringify({ error: 'already_in_team', message: 'Již jsi v týmu pro tuto výzvu' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add member
      const { error: memberError } = await supabase
        .from('challenge_team_members')
        .insert({
          team_id: team.id,
          client_id: clientId,
          role: 'member',
        });

      if (memberError) {
        console.error('[Benchmarks] Join team error:', memberError);
        return new Response(
          JSON.stringify({ error: 'join_failed', details: memberError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure pseudonym exists
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      // Update member count
      await supabase
        .from('challenge_teams')
        .update({ member_count: team.member_count + 1 })
        .eq('id', team.id);

      console.log('[Benchmarks] Joined team:', team.id);

      return new Response(
        JSON.stringify({ success: true, team_id: team.id, team_name: team.team_name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leave_team') {
      // Get membership
      const { data: membership } = await supabase
        .from('challenge_team_members')
        .select('*, team:challenge_teams(*)')
        .eq('client_id', clientId)
        .eq('team_id', teamId)
        .single();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: 'not_in_team' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const team = membership.team as any;

      // If captain leaves, delete the whole team
      if (membership.role === 'captain') {
        await supabase
          .from('challenge_teams')
          .delete()
          .eq('id', teamId);

        console.log('[Benchmarks] Team deleted (captain left):', teamId);
      } else {
        // Remove member
        await supabase
          .from('challenge_team_members')
          .delete()
          .eq('id', membership.id);

        // Update member count
        await supabase
          .from('challenge_teams')
          .update({ member_count: Math.max(0, team.member_count - 1) })
          .eq('id', teamId);

        console.log('[Benchmarks] Left team:', teamId);
      }

      // Remove team_id from client's submissions
      await supabase
        .from('challenge_submissions')
        .update({ team_id: null })
        .eq('client_id', clientId)
        .eq('team_id', teamId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_team_leaderboard') {
      // Get all teams for this challenge sorted by score
      const { data: teams, error: teamsError } = await supabase
        .from('challenge_teams')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('total_score', { ascending: false });

      if (teamsError) {
        return new Response(
          JSON.stringify({ error: 'fetch_failed', details: teamsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find client's team
      const { data: clientMembership } = await supabase
        .from('challenge_team_members')
        .select('team_id')
        .eq('client_id', clientId)
        .maybeSingle();

      const clientTeamId = clientMembership?.team_id;

      const teamsWithRanks = (teams || []).map((team, index) => ({
        rank: index + 1,
        team_id: team.id,
        team_name: team.team_name,
        total_score: team.total_score || 0,
        member_count: team.member_count || 0,
        is_my_team: team.id === clientTeamId,
      }));

      const myTeamRank = teamsWithRanks.find(t => t.is_my_team)?.rank;

      return new Response(
        JSON.stringify({ teams: teamsWithRanks, my_team_rank: myTeamRank }),
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
