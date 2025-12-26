import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface CompletedChallenge {
  id: string;
  title: string;
  endDate: string;
  bestScore: number;
  rank?: number;
  metric: string;
  unitLabel?: string;
}

interface Achievement {
  id: string;
  type: string;
  earnedAt: string;
  data?: Record<string, any>;
}

export function useClientChallengeHistory() {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-challenge-history', clientId],
    queryFn: async () => {
      if (!clientId) return { completedChallenges: [], achievements: [], streakCount: 0, prCount: 0 };

      // Fetch completed challenges (where end_at is in the past and client has submission)
      const { data: submissions, error: submissionsError } = await supabase
        .from('challenge_submissions')
        .select(`
          id,
          score_primary,
          challenge_id,
          challenges!inner (
            id,
            title,
            end_at,
            primary_metric,
            unit_label,
            scoring_type
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'approved');

      if (submissionsError) throw submissionsError;

      // Group by challenge and get best score
      const now = new Date();
      const challengeMap = new Map<string, CompletedChallenge>();

      for (const sub of submissions || []) {
        const challenge = sub.challenges as any;
        if (!challenge || new Date(challenge.end_at) > now) continue;

        const existing = challengeMap.get(challenge.id);
        const isBetter = challenge.scoring_type === 'time_lower_better'
          ? !existing || sub.score_primary < existing.bestScore
          : !existing || sub.score_primary > existing.bestScore;

        if (isBetter) {
          challengeMap.set(challenge.id, {
            id: challenge.id,
            title: challenge.title,
            endDate: challenge.end_at,
            bestScore: sub.score_primary,
            metric: challenge.primary_metric,
            unitLabel: challenge.unit_label,
          });
        }
      }

      const completedChallenges = Array.from(challengeMap.values())
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

      // Fetch achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('client_achievements')
        .select('*')
        .eq('client_id', clientId)
        .order('earned_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      const achievements: Achievement[] = (achievementsData || []).map(a => ({
        id: a.id,
        type: a.achievement_type,
        earnedAt: a.earned_at,
        data: a.achievement_data as Record<string, any> | undefined,
      }));

      // Count PRs from exercise_entries
      const { count: prCount } = await supabase
        .from('exercise_entries')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_pr', true);

      // Calculate streak (consecutive days with portal activity or training)
      const { data: activityData } = await supabase
        .from('client_portal_activity')
        .select('activity_date')
        .eq('client_id', clientId)
        .order('activity_date', { ascending: false })
        .limit(60);

      let streakCount = 0;
      if (activityData && activityData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const uniqueDates = [...new Set(activityData.map(a => a.activity_date))].sort().reverse();
        
        for (let i = 0; i < uniqueDates.length; i++) {
          const activityDate = new Date(uniqueDates[i]);
          activityDate.setHours(0, 0, 0, 0);
          
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);
          
          if (activityDate.getTime() === expectedDate.getTime()) {
            streakCount++;
          } else if (i === 0 && activityDate.getTime() === expectedDate.getTime() - 86400000) {
            // Yesterday counts if today not yet logged
            streakCount++;
          } else {
            break;
          }
        }
      }

      return {
        completedChallenges,
        achievements,
        streakCount,
        prCount: prCount || 0,
      };
    },
    enabled: !!clientId,
  });
}
