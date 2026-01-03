import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePendingSubmissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-submissions', user?.id],
    queryFn: async () => {
      if (!user) return { count: 0, submissions: [] };

      // Get all active challenges for this user
      const now = new Date().toISOString();
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('id')
        .eq('created_by_user_id', user.id)
        .eq('status', 'published')
        .gte('end_at', now);

      if (challengesError) {
        console.error('Error fetching challenges:', challengesError);
        return { count: 0, submissions: [] };
      }

      if (!challenges || challenges.length === 0) {
        return { count: 0, submissions: [] };
      }

      const challengeIds = challenges.map(c => c.id);

      // Get pending submissions for these challenges
      const { data: submissions, error: submissionsError } = await supabase
        .from('challenge_submissions')
        .select(`
          id,
          challenge_id,
          client_id,
          score_primary,
          submitted_at,
          status,
          clients(name)
        `)
        .in('challenge_id', challengeIds)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        return { count: 0, submissions: [] };
      }

      return {
        count: submissions?.length || 0,
        submissions: submissions || [],
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function usePendingSubmissionsCount() {
  const { data } = usePendingSubmissions();
  return data?.count || 0;
}
