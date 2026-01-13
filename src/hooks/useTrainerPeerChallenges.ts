import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';

export interface TrainerPeerChallenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: 'private' | 'duel' | 'public';
  primary_metric: string;
  scoring_type: string;
  start_at: string;
  end_at: string;
  status: 'active' | 'completed' | 'cancelled';
  trainer_comment: string | null;
  trainer_comment_at: string | null;
  created_at: string;
  created_by_client_name: string;
  created_by_client_id: string;
  participant_count: number;
  submission_count: number;
}

// Fetch all peer challenges for trainer's clients
export function useTrainerPeerChallenges() {
  const { user } = useUser();

  return useQuery({
    queryKey: ['trainer-peer-challenges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('peer_challenges')
        .select(`
          *,
          clients!peer_challenges_created_by_client_id_fkey(
            id, name
          ),
          peer_challenge_participants(count),
          peer_challenge_submissions(count)
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(c => ({
        ...c,
        created_by_client_name: (c.clients as any)?.name || 'Neznámý',
        created_by_client_id: (c.clients as any)?.id,
        participant_count: (c.peer_challenge_participants as any)?.[0]?.count || 0,
        submission_count: (c.peer_challenge_submissions as any)?.[0]?.count || 0,
      })) as TrainerPeerChallenge[];
    },
    enabled: !!user?.id,
  });
}

// Fetch single peer challenge with full details for trainer
export function useTrainerPeerChallengeDetail(challengeId: string | null) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['trainer-peer-challenge-detail', challengeId],
    queryFn: async () => {
      if (!challengeId || !user?.id) return null;

      // Get challenge
      const { data: challenge, error: chError } = await supabase
        .from('peer_challenges')
        .select(`
          *,
          clients!peer_challenges_created_by_client_id_fkey(
            id, name
          )
        `)
        .eq('id', challengeId)
        .eq('trainer_id', user.id)
        .single();

      if (chError) throw chError;

      // Get participants with client names
      const { data: participants, error: pError } = await supabase
        .from('peer_challenge_participants')
        .select(`
          *,
          clients(id, first_name, last_name)
        `)
        .eq('challenge_id', challengeId);

      if (pError) throw pError;

      // Get submissions with client names
      const { data: submissions, error: sError } = await supabase
        .from('peer_challenge_submissions')
        .select(`
          *,
          clients(id, first_name, last_name)
        `)
        .eq('challenge_id', challengeId)
        .order('score_primary', { 
          ascending: challenge.scoring_type === 'time_lower_better' 
        });

      if (sError) throw sError;

      // Get activity log
      const { data: activityLog, error: aError } = await supabase
        .from('peer_challenge_activity_log')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (aError) throw aError;

      return {
        ...challenge,
        created_by_client: challenge.clients,
        participants: participants || [],
        submissions: submissions || [],
        activity_log: activityLog || [],
      };
    },
    enabled: !!challengeId && !!user?.id,
  });
}

// Add trainer comment to peer challenge
export function useAddTrainerComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      challengeId,
      comment,
    }: {
      challengeId: string;
      comment: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('peer_challenges')
        .update({
          trainer_comment: comment,
          trainer_comment_at: new Date().toISOString(),
        })
        .eq('id', challengeId)
        .eq('trainer_id', user.id);

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'trainer',
        actor_id: user.id,
        action: 'commented',
        metadata: { comment_preview: comment.substring(0, 100) },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-peer-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-peer-challenge-detail', variables.challengeId] });
    },
  });
}

// Add clients to an existing peer challenge
export function useAddClientsToPeerChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      challengeId,
      clientIds,
    }: {
      challengeId: string;
      clientIds: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get challenge to verify ownership
      const { data: challenge, error: chError } = await supabase
        .from('peer_challenges')
        .select('id')
        .eq('id', challengeId)
        .eq('trainer_id', user.id)
        .single();

      if (chError || !challenge) throw new Error('Výzva nenalezena');

      // Check existing participants
      const { data: existing } = await supabase
        .from('peer_challenge_participants')
        .select('client_id')
        .eq('challenge_id', challengeId)
        .in('client_id', clientIds);

      const existingIds = new Set(existing?.map(e => e.client_id) || []);
      const newIds = clientIds.filter(id => !existingIds.has(id));

      if (newIds.length === 0) return;

      // Add new participants
      const participants = newIds.map(clientId => ({
        challenge_id: challengeId,
        client_id: clientId,
        role: 'participant' as const,
        status: 'pending' as const,
      }));

      const { error } = await supabase
        .from('peer_challenge_participants')
        .insert(participants);

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'trainer',
        actor_id: user.id,
        action: 'added_participant',
        metadata: { added_count: newIds.length },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-peer-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-peer-challenge-detail', variables.challengeId] });
    },
  });
}

// Cancel a peer challenge
export function useCancelPeerChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('peer_challenges')
        .update({ status: 'cancelled' })
        .eq('id', challengeId)
        .eq('trainer_id', user.id);

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'trainer',
        actor_id: user.id,
        action: 'cancelled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-peer-challenges'] });
    },
  });
}

// Export peer challenge results
export function useExportPeerChallengeResults() {
  return useMutation({
    mutationFn: async (challengeId: string) => {
      // Fetch full data
      const { data: challenge } = await supabase
        .from('peer_challenges')
        .select('title')
        .eq('id', challengeId)
        .single();

      const { data: submissions } = await supabase
        .from('peer_challenge_submissions')
        .select(`
          *,
          clients(first_name, last_name)
        `)
        .eq('challenge_id', challengeId)
        .order('score_primary', { ascending: false });

      if (!submissions) return;

      // Create CSV
      const headers = ['Pořadí', 'Jméno', 'Skóre', 'Poznámka', 'Datum'];
      const rows = submissions.map((s, i) => [
        i + 1,
        `${s.clients?.first_name || ''} ${s.clients?.last_name || ''}`.trim(),
        s.score_primary,
        s.note || '',
        new Date(s.submitted_at).toLocaleDateString('cs'),
      ]);

      const csv = [
        headers.join(';'),
        ...rows.map(r => r.join(';'))
      ].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peer-challenge-${challenge?.title || challengeId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
