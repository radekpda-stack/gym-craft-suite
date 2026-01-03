/**
 * Challenge Actions Hook
 * 
 * Handles:
 * - Approve/reject submissions
 * - Award winners
 * - Duplicate challenges
 * - Auto-archive
 * - Export results
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Challenge } from './useChallenges';

interface ManageSubmissionsParams {
  action: 'approve' | 'reject' | 'award_winners';
  submissionIds?: string[];
  winners?: Array<{ submissionId: string; rank: number; xp: number }>;
  challengeId?: string;
}

export function useManageSubmissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ManageSubmissionsParams) => {
      if (params.action === 'approve' && params.submissionIds) {
        const { error } = await supabase
          .from('challenge_submissions')
          .update({ status: 'approved' })
          .in('id', params.submissionIds);
        if (error) throw error;
      }

      if (params.action === 'reject' && params.submissionIds) {
        const { error } = await supabase
          .from('challenge_submissions')
          .update({ status: 'rejected' })
          .in('id', params.submissionIds);
        if (error) throw error;
      }

      if (params.action === 'award_winners' && params.winners) {
        for (const winner of params.winners) {
          // Update submission with winner info
          const { error: subError } = await supabase
            .from('challenge_submissions')
            .update({
              is_winner: true,
              winner_rank: winner.rank,
              xp_awarded: winner.xp,
              awarded_at: new Date().toISOString(),
              status: 'approved',
            })
            .eq('id', winner.submissionId);

          if (subError) throw subError;

          // Get client_id for XP update
          const { data: submission } = await supabase
            .from('challenge_submissions')
            .select('client_id')
            .eq('id', winner.submissionId)
            .single();

          if (submission && winner.xp > 0) {
            // Update client XP
            const { data: existingXp } = await supabase
              .from('client_xp')
              .select('*')
              .eq('client_id', submission.client_id)
              .single();

            if (existingXp) {
              const newTotalXp = existingXp.total_xp + winner.xp;
              const newLevelXp = existingXp.level_xp + winner.xp;
              
              // Calculate level (100 XP per level)
              const xpPerLevel = 100;
              let level = existingXp.level;
              let levelXp = newLevelXp;
              
              while (levelXp >= xpPerLevel) {
                level += 1;
                levelXp -= xpPerLevel;
              }

              await supabase
                .from('client_xp')
                .update({
                  total_xp: newTotalXp,
                  level_xp: levelXp,
                  level,
                  xp_to_next: xpPerLevel - levelXp,
                  last_xp_date: new Date().toISOString().split('T')[0],
                })
                .eq('client_id', submission.client_id);
            } else {
              // Create new XP record
              await supabase
                .from('client_xp')
                .insert({
                  client_id: submission.client_id,
                  total_xp: winner.xp,
                  level_xp: winner.xp,
                  level: Math.floor(winner.xp / 100),
                  xp_to_next: 100 - (winner.xp % 100),
                  last_xp_date: new Date().toISOString().split('T')[0],
                });
            }

            // Create achievement for winner
            await supabase
              .from('client_achievements')
              .insert({
                client_id: submission.client_id,
                achievement_type: `challenge_winner_${winner.rank}`,
                achievement_data: {
                  challenge_id: params.challengeId,
                  rank: winner.rank,
                  xp: winner.xp,
                },
              });
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['client-xp'] });
    },
  });
}

export function useDuplicateChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challenge: Challenge) => {
      const { id, created_at, updated_at, ...rest } = challenge;
      
      // Create a copy with new dates
      const now = new Date();
      const duration = new Date(challenge.end_at).getTime() - new Date(challenge.start_at).getTime();
      
      const newChallenge = {
        ...rest,
        title: `${challenge.title} (kopie)`,
        status: 'draft' as const,
        start_at: now.toISOString(),
        end_at: new Date(now.getTime() + duration).toISOString(),
        created_by_user_id: user!.id,
      };

      const { data, error } = await supabase
        .from('challenges')
        .insert(newChallenge)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Výzva byla zkopírována');
    },
    onError: () => {
      toast.error('Nepodařilo se zkopírovat výzvu');
    },
  });
}

export function useArchiveExpiredChallenges() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('challenges')
        .update({ status: 'archived' })
        .eq('status', 'published')
        .eq('created_by_user_id', user!.id)
        .lt('end_at', now)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      if (data && data.length > 0) {
        toast.success(`${data.length} výzev automaticky archivováno`);
      }
    },
  });
}

export function useExportChallengeResults() {
  return useMutation({
    mutationFn: async (challengeId: string) => {
      // Fetch challenge and submissions
      const { data: challenge } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select(`
          *,
          clients:client_id (name, email)
        `)
        .eq('challenge_id', challengeId)
        .order('score_primary', { ascending: challenge?.scoring_type === 'time_lower_better' });

      if (!challenge || !submissions) throw new Error('Data not found');

      // Generate CSV
      const headers = ['Pořadí', 'Jméno', 'Email', 'Výsledek', 'Datum', 'Status', 'Vítěz', 'XP'];
      const rows = submissions.map((sub: any, index: number) => [
        index + 1,
        sub.clients?.name || '',
        sub.clients?.email || '',
        sub.score_primary,
        new Date(sub.submitted_at).toLocaleDateString('cs-CZ'),
        sub.status,
        sub.is_winner ? `${sub.winner_rank}. místo` : '',
        sub.xp_awarded || 0,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${challenge.title.replace(/\s+/g, '_')}_vysledky.csv`;
      link.click();
      URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Export stažen');
    },
    onError: () => {
      toast.error('Nepodařilo se exportovat');
    },
  });
}
