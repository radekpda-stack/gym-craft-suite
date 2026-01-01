import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { challenge_id, action } = await req.json();

    if (action === 'evaluate_winners') {
      // Get challenge details
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challenge_id)
        .single();

      if (challengeError || !challenge) {
        throw new Error('Challenge not found');
      }

      const isLowerBetter = challenge.scoring_type === 'time_lower_better';
      const rankingMode = challenge.ranking_mode || 'top3';
      const tieBreaker = challenge.tie_breaker || 'earliest_submission';

      // Get all submissions for this challenge
      const { data: submissions, error: subError } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challenge_id)
        .eq('status', 'approved');

      if (subError) throw subError;
      if (!submissions?.length) {
        return new Response(JSON.stringify({ message: 'No submissions to evaluate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get best per client
      const bestPerClient = new Map<string, typeof submissions[0]>();
      for (const sub of submissions) {
        const existing = bestPerClient.get(sub.client_id);
        if (!existing) {
          bestPerClient.set(sub.client_id, sub);
        } else {
          const isBetter = isLowerBetter
            ? (sub.result_value ?? sub.score_primary) < (existing.result_value ?? existing.score_primary)
            : (sub.result_value ?? sub.score_primary) > (existing.result_value ?? existing.score_primary);
          if (isBetter) {
            bestPerClient.set(sub.client_id, sub);
          }
        }
      }

      // Sort by result
      const ranked = Array.from(bestPerClient.values()).sort((a, b) => {
        const aVal = a.result_value ?? a.score_primary;
        const bVal = b.result_value ?? b.score_primary;
        
        // Primary sort by value
        const diff = isLowerBetter ? aVal - bVal : bVal - aVal;
        if (diff !== 0) return diff;
        
        // Tie-breaker
        if (tieBreaker === 'earliest_submission') {
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        } else if (tieBreaker === 'coach_confirmed_first') {
          if (a.confirmed_by === 'coach' && b.confirmed_by !== 'coach') return -1;
          if (b.confirmed_by === 'coach' && a.confirmed_by !== 'coach') return 1;
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        }
        return 0;
      });

      // XP rewards
      const xpRewards: Record<number, number> = { 1: 40, 2: 25, 3: 15 };
      const maxRank = rankingMode === 'top1' ? 1 : 3;
      const now = new Date().toISOString();

      // Reset all winners first
      await supabase
        .from('challenge_submissions')
        .update({ is_winner: false, winner_rank: null, xp_awarded: 0, awarded_at: null })
        .eq('challenge_id', challenge_id);

      // Update winners
      for (let i = 0; i < Math.min(ranked.length, maxRank); i++) {
        const sub = ranked[i];
        const rank = i + 1;
        const xp = xpRewards[rank] || 0;

        await supabase
          .from('challenge_submissions')
          .update({
            is_winner: true,
            winner_rank: rank,
            xp_awarded: xp,
            awarded_at: now,
          })
          .eq('id', sub.id);

        // Record XP event
        await supabase.from('xp_events').insert({
          client_id: sub.client_id,
          source_type: 'challenge_win',
          source_id: sub.id,
          xp_amount: xp,
          description: `${rank}. místo v challenge: ${challenge.title}`,
        });
      }

      // Give participation XP (10 XP) to all participants
      for (const sub of Array.from(bestPerClient.values())) {
        await supabase.from('xp_events').insert({
          client_id: sub.client_id,
          source_type: 'challenge_participation',
          source_id: sub.id,
          xp_amount: 10,
          description: `Účast v challenge: ${challenge.title}`,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          winners: ranked.slice(0, maxRank).map((s, i) => ({ 
            client_id: s.client_id, 
            rank: i + 1 
          })) 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
