import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { getClientDisplayName } from '@/lib/anonymousNames';

export interface PeerChallenge {
  id: string;
  trainer_id: string;
  created_by_client_id: string;
  title: string;
  description: string | null;
  challenge_type: 'private' | 'duel' | 'public';
  source_type: 'custom' | 'from_trainer_challenge';
  source_challenge_id: string | null;
  primary_metric: 'time_seconds' | 'reps' | 'distance_m' | 'weight_kg';
  scoring_type: 'time_lower_better' | 'value_higher_better';
  target_value: number | null;
  unit_label: string | null;
  start_at: string;
  end_at: string;
  invite_code: string;
  max_participants: number | null;
  status: 'active' | 'completed' | 'cancelled';
  trainer_comment: string | null;
  trainer_comment_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeerChallengeParticipant {
  id: string;
  challenge_id: string;
  client_id: string;
  role: 'creator' | 'challenger' | 'participant';
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  joined_at: string | null;
}

export interface PeerChallengeSubmission {
  id: string;
  challenge_id: string;
  client_id: string;
  score_primary: number;
  score_display: string | null;
  note: string | null;
  media_urls: string[] | null;
  submitted_at: string;
}

export interface LeaderboardEntry {
  client_id: string;
  display_name: string;
  score: number;
  best_score: number;
  rank: number;
  is_current_user: boolean;
  is_me: boolean;
  submission_count: number;
}

export interface PeerChallengeInvitation {
  participant_id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_type: string;
  primary_metric: string;
  end_at: string;
  invited_by_name: string;
  participant_count: number;
}

export interface PeerChallengeWithDetails extends PeerChallenge {
  participant_count: number;
  my_submission: { score_primary: number } | null;
  my_rank: number | null;
  my_participation_status: string | null;
  leaderboard: LeaderboardEntry[];
}

// Alias exports for components
export { usePeerChallenge as usePeerChallengeDetail };
export { useSubmitPeerChallengeResult as useSubmitResult };

export function usePeerChallengeInvitations() {
  const { clientId } = useClientPortal();
  
  return useQuery({
    queryKey: ['peer-challenge-invitations', clientId],
    queryFn: async (): Promise<PeerChallengeInvitation[]> => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('peer_challenge_participants')
        .select(`
          id,
          challenge_id,
          peer_challenges(title, challenge_type, primary_metric, end_at)
        `)
        .eq('client_id', clientId)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        participant_id: d.id,
        challenge_id: d.challenge_id,
        challenge_title: (d.peer_challenges as any)?.title || '',
        challenge_type: (d.peer_challenges as any)?.challenge_type || '',
        primary_metric: (d.peer_challenges as any)?.primary_metric || '',
        end_at: (d.peer_challenges as any)?.end_at || '',
        invited_by_name: 'Klient',
        participant_count: 0,
      }));
    },
    enabled: !!clientId,
  });
}

// Fetch all peer challenges for the current client
export function usePeerChallenges() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['peer-challenges', clientId],
    queryFn: async () => {
      if (!clientId || !trainerId) return { challenges: [], invitations: [] };

      // Fetch challenges where user is participant or creator, or public challenges
      const { data: challenges, error } = await supabase
        .from('peer_challenges')
        .select(`
          *,
          peer_challenge_participants!inner(*)
        `)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch pending invitations
      const { data: invitations, error: invError } = await supabase
        .from('peer_challenge_participants')
        .select(`
          *,
          peer_challenges(*)
        `)
        .eq('client_id', clientId)
        .eq('status', 'pending');

      if (invError) throw invError;

      return {
        challenges: challenges || [],
        invitations: invitations || [],
      };
    },
    enabled: !!clientId && !!trainerId,
  });
}

// Fetch single peer challenge with details
export function usePeerChallenge(challengeId: string | null) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['peer-challenge', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;

      const { data, error } = await supabase
        .from('peer_challenges')
        .select(`
          *,
          peer_challenge_participants(*),
          peer_challenge_submissions(*)
        `)
        .eq('id', challengeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!challengeId && !!clientId,
  });
}

// Fetch leaderboard for a peer challenge with anonymity support
export function usePeerChallengeLeaderboard(challengeId: string | null) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['peer-challenge-leaderboard', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];

      // Get challenge info for scoring type
      const { data: challenge, error: chError } = await supabase
        .from('peer_challenges')
        .select('scoring_type, primary_metric')
        .eq('id', challengeId)
        .single();

      if (chError) throw chError;

      // Get all accepted participants
      const { data: participants, error: pError } = await supabase
        .from('peer_challenge_participants')
        .select('client_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'accepted');

      if (pError) throw pError;

      const participantIds = participants?.map(p => p.client_id) || [];
      if (participantIds.length === 0) return [];

      // Get best submission for each participant
      const { data: submissions, error: sError } = await supabase
        .from('peer_challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .in('client_id', participantIds);

      if (sError) throw sError;

      // Get leaderboard settings for all participants
      const { data: settings, error: setError } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', participantIds);

      if (setError) throw setError;

      const settingsMap = new Map(settings?.map(s => [s.client_id, s]) || []);

      // Group submissions by client and find best
      const bestByClient = new Map<string, { score: number; count: number }>();
      
      for (const sub of submissions || []) {
        const current = bestByClient.get(sub.client_id);
        const isBetter = !current || (
          challenge.scoring_type === 'time_lower_better'
            ? sub.score_primary < current.score
            : sub.score_primary > current.score
        );
        
        if (isBetter) {
          bestByClient.set(sub.client_id, { 
            score: sub.score_primary, 
            count: current ? current.count + 1 : 1 
          });
        } else if (current) {
          bestByClient.set(sub.client_id, { 
            score: current.score, 
            count: current.count + 1 
          });
        } else {
          bestByClient.set(sub.client_id, { 
            score: sub.score_primary, 
            count: 1 
          });
        }
      }

      // Build leaderboard with display names
      const leaderboard: LeaderboardEntry[] = [];
      
      for (const pId of participantIds) {
        const best = bestByClient.get(pId);
        const setting = settingsMap.get(pId);
        
        const displayName = getClientDisplayName(
          pId,
          setting?.leaderboard_visible === true,
          setting?.leaderboard_nickname
        );

        leaderboard.push({
          client_id: pId,
          display_name: displayName,
          score: best?.score || 0,
          best_score: best?.score || 0,
          rank: 0, // Will be set after sorting
          is_current_user: pId === clientId,
          is_me: pId === clientId,
          submission_count: best?.count || 0,
        });
      }

      // Sort by score
      leaderboard.sort((a, b) => {
        if (challenge.scoring_type === 'time_lower_better') {
          return a.score - b.score;
        }
        return b.score - a.score;
      });

      // Assign ranks
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return leaderboard;
    },
    enabled: !!challengeId && !!clientId,
  });
}

// Create a new peer challenge
export function useCreatePeerChallenge() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      challenge_type: 'private' | 'duel' | 'public';
      source_type: 'custom' | 'from_trainer_challenge';
      source_challenge_id?: string;
      primary_metric: string;
      scoring_type: string;
      target_value?: number;
      unit_label?: string;
      end_at: string;
      invited_client_ids?: string[];
    }) => {
      if (!clientId || !trainerId) throw new Error('Not authenticated');

      // Map scoring_type from form value to DB value
      const dbScoringType = data.scoring_type === 'time_lower_better' 
        ? 'time_lower_better' 
        : 'value_higher_better';
      
      // Map primary_metric from form value to DB value
      const dbPrimaryMetric = data.primary_metric === 'time_lower_better' || data.primary_metric === 'time_higher_better'
        ? 'time_seconds'
        : data.primary_metric === 'distance'
          ? 'distance_m'
          : data.primary_metric === 'weight'
            ? 'weight_kg'
            : 'reps';

      // Create the challenge
      const { data: challenge, error } = await supabase
        .from('peer_challenges')
        .insert({
          trainer_id: trainerId,
          created_by_client_id: clientId,
          title: data.title,
          description: data.description,
          challenge_type: data.challenge_type,
          source_type: data.source_type,
          source_challenge_id: data.source_challenge_id,
          primary_metric: dbPrimaryMetric,
          scoring_type: dbScoringType,
          target_value: data.target_value,
          unit_label: data.unit_label,
          start_at: new Date().toISOString(),
          end_at: data.end_at,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('peer_challenge_participants')
        .insert({
          challenge_id: challenge.id,
          client_id: clientId,
          role: 'creator',
          status: 'accepted',
          joined_at: new Date().toISOString(),
        });

      // Add invited clients and send notifications
      if (data.invited_client_ids?.length) {
        const invites = data.invited_client_ids.map(id => ({
          challenge_id: challenge.id,
          client_id: id,
          role: data.challenge_type === 'duel' ? 'challenger' : 'participant',
          status: 'pending' as const,
        }));

        await supabase.from('peer_challenge_participants').insert(invites);

        // Send notifications to invited clients
        const notifications = data.invited_client_ids.map(id => ({
          client_id: id,
          type: 'peer_challenge_invited',
          title: data.challenge_type === 'duel' ? 'Nová výzva k duelu!' : 'Nová peer výzva!',
          message: `Byl jsi pozván do výzvy: ${data.title}`,
          metadata: {
            challenge_id: challenge.id,
            challenge_type: data.challenge_type,
          },
          action_url: '/client-portal/challenges?tab=challenges',
        }));

        await supabase.from('client_portal_notifications').insert(notifications);
      }

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challenge.id,
        actor_type: 'client',
        actor_id: clientId,
        action: 'created',
        metadata: { challenge_type: data.challenge_type },
      });

      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
    },
  });
}

// Join a challenge via invite code
export function useJoinPeerChallenge() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!clientId || !trainerId) throw new Error('Not authenticated');

      // Find challenge by invite code
      const { data: challenge, error } = await supabase
        .from('peer_challenges')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
        .single();

      if (error || !challenge) throw new Error('Výzva nenalezena');

      // Check if already participant
      const { data: existing } = await supabase
        .from('peer_challenge_participants')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('client_id', clientId)
        .single();

      if (existing) throw new Error('Již jsi účastníkem této výzvy');

      // Check max participants
      if (challenge.max_participants) {
        const { count } = await supabase
          .from('peer_challenge_participants')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id)
          .eq('status', 'accepted');

        if ((count || 0) >= challenge.max_participants) {
          throw new Error('Výzva je již plná');
        }
      }

      // Add as participant
      await supabase.from('peer_challenge_participants').insert({
        challenge_id: challenge.id,
        client_id: clientId,
        role: 'participant',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      });

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challenge.id,
        actor_type: 'client',
        actor_id: clientId,
        action: 'joined',
      });

      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
    },
  });
}

// Respond to an invitation (accept/decline)
export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();

  return useMutation({
    mutationFn: async ({ 
      challengeId, 
      accept 
    }: { 
      challengeId: string; 
      accept: boolean;
    }) => {
      if (!clientId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('peer_challenge_participants')
        .update({
          status: accept ? 'accepted' : 'declined',
          joined_at: accept ? new Date().toISOString() : null,
        })
        .eq('challenge_id', challengeId)
        .eq('client_id', clientId);

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'client',
        actor_id: clientId,
        action: accept ? 'joined' : 'declined',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
    },
  });
}

// Submit a result
export function useSubmitPeerChallengeResult() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();

  return useMutation({
    mutationFn: async ({
      challengeId,
      score,
      scoreDisplay,
      note,
      mediaUrls,
    }: {
      challengeId: string;
      score: number;
      scoreDisplay?: string;
      note?: string;
      mediaUrls?: string[];
    }) => {
      if (!clientId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('peer_challenge_submissions')
        .insert({
          challenge_id: challengeId,
          client_id: clientId,
          score_primary: score,
          score_display: scoreDisplay,
          note,
          media_urls: mediaUrls,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'client',
        actor_id: clientId,
        action: 'submitted',
        metadata: { score },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['peer-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['peer-challenge-leaderboard', variables.challengeId] });
    },
  });
}

// Get public challenges from other clients
export function usePublicPeerChallenges() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['public-peer-challenges', trainerId],
    queryFn: async () => {
      if (!trainerId || !clientId) return [];

      const { data, error } = await supabase
        .from('peer_challenges')
        .select(`
          *,
          peer_challenge_participants(count)
        `)
        .eq('trainer_id', trainerId)
        .eq('challenge_type', 'public')
        .eq('status', 'active')
        .gt('end_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out challenges where user is already a participant
      const { data: myParticipations } = await supabase
        .from('peer_challenge_participants')
        .select('challenge_id')
        .eq('client_id', clientId);

      const myIds = new Set(myParticipations?.map(p => p.challenge_id) || []);
      
      return (data || []).filter(c => !myIds.has(c.id));
    },
    enabled: !!trainerId && !!clientId,
  });
}

// Get my active peer challenges (where I'm creator or accepted participant)
export function useMyPeerChallenges() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['my-peer-challenges', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('peer_challenge_participants')
        .select(`
          *,
          peer_challenges(*)
        `)
        .eq('client_id', clientId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Filter active challenges
      const now = new Date();
      return (data || [])
        .filter(p => p.peer_challenges && new Date(p.peer_challenges.end_at) > now && p.peer_challenges.status === 'active')
        .map(p => ({
          ...p.peer_challenges,
          my_role: p.role,
        }));
    },
    enabled: !!clientId,
  });
}

// Get completed peer challenges for current client
export function useCompletedPeerChallenges() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['completed-peer-challenges', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('peer_challenge_participants')
        .select(`
          *,
          peer_challenges(*)
        `)
        .eq('client_id', clientId)
        .eq('status', 'accepted');

      if (error) throw error;

      // Filter completed challenges
      return (data || [])
        .filter(p => p.peer_challenges && (
          p.peer_challenges.status === 'completed' || 
          new Date(p.peer_challenges.end_at) <= new Date()
        ))
        .map(p => ({
          ...p.peer_challenges,
          my_role: p.role,
          my_rank: p.final_rank,
          xp_result: p.xp_result,
          xp_bet: p.xp_bet,
          participant_count: 0, // Will need separate query if needed
        }))
        .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime());
    },
    enabled: !!clientId,
  });
}

// Cancel a peer challenge (client version - creator only)
export function useClientCancelPeerChallenge() {
  const queryClient = useQueryClient();
  const { clientId } = useClientPortal();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!clientId) throw new Error('Not authenticated');

      // Verify client is the creator
      const { data: challenge, error: chError } = await supabase
        .from('peer_challenges')
        .select('created_by_client_id')
        .eq('id', challengeId)
        .single();

      if (chError || !challenge) throw new Error('Výzva nenalezena');
      if (challenge.created_by_client_id !== clientId) {
        throw new Error('Pouze tvůrce může zrušit výzvu');
      }

      // Check if there are any submissions
      const { count } = await supabase
        .from('peer_challenge_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challengeId);

      if (count && count > 0) {
        throw new Error('Nelze zrušit výzvu, která má již odeslané výsledky');
      }

      const { error } = await supabase
        .from('peer_challenges')
        .update({ status: 'cancelled' })
        .eq('id', challengeId)
        .eq('created_by_client_id', clientId);

      if (error) throw error;

      // Log activity
      await supabase.from('peer_challenge_activity_log').insert({
        challenge_id: challengeId,
        actor_type: 'client',
        actor_id: clientId,
        action: 'cancelled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peer-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['my-peer-challenges'] });
    },
  });
}

// Get duel opponent info (for DuelCard)
export function useDuelOpponent(challengeId: string | null) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['duel-opponent', challengeId, clientId],
    queryFn: async () => {
      if (!challengeId || !clientId) return null;

      // Get all accepted participants except me
      const { data: participants, error: pError } = await supabase
        .from('peer_challenge_participants')
        .select('client_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'accepted')
        .neq('client_id', clientId);

      if (pError) throw pError;

      const opponent = participants?.[0];
      if (!opponent) return null;

      // Get opponent's best score
      const { data: submissions } = await supabase
        .from('peer_challenge_submissions')
        .select('score_primary')
        .eq('challenge_id', challengeId)
        .eq('client_id', opponent.client_id)
        .order('score_primary', { ascending: false })
        .limit(1);

      // Get opponent's leaderboard settings for display name
      const { data: settings } = await supabase
        .from('client_leaderboard_settings')
        .select('leaderboard_visible, leaderboard_nickname')
        .eq('client_id', opponent.client_id)
        .maybeSingle();

      const displayName = getClientDisplayName(
        opponent.client_id,
        settings?.leaderboard_visible === true,
        settings?.leaderboard_nickname
      );

      return {
        client_id: opponent.client_id,
        display_name: displayName,
        best_score: submissions?.[0]?.score_primary ?? null,
      };
    },
    enabled: !!challengeId && !!clientId,
  });
}

// Get pending invitations count
export function usePendingInvitationsCount() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['pending-peer-invitations-count', clientId],
    queryFn: async () => {
      if (!clientId) return 0;

      const { count, error } = await supabase
        .from('peer_challenge_participants')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!clientId,
  });
}
