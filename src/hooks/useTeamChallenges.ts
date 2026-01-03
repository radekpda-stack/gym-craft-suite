import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface Team {
  id: string;
  challenge_id: string;
  team_name: string;
  captain_client_id: string;
  invite_code: string;
  total_score: number;
  member_count: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  client_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  pseudonym?: string;
  best_score?: number | null;
}

// Hook to get client's team for a specific challenge
export function useClientTeam(challengeId: string | null) {
  const { clientId } = useClientPortal();

  return useQuery({
    queryKey: ['client-team', challengeId, clientId],
    queryFn: async () => {
      if (!challengeId || !clientId) return null;

      // First get the team membership
      const { data: membership, error: membershipError } = await supabase
        .from('challenge_team_members')
        .select(`
          *,
          team:challenge_teams(*)
        `)
        .eq('client_id', clientId)
        .eq('team.challenge_id', challengeId)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from('challenge_team_members')
        .select('*')
        .eq('team_id', (membership.team as any).id);

      if (membersError) throw membersError;

      return {
        team: membership.team as Team,
        members: members as TeamMember[],
        myRole: membership.role as 'captain' | 'member',
      };
    },
    enabled: !!challengeId && !!clientId,
  });
}

// Hook to create a team
export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async ({ 
      challengeId, 
      teamName 
    }: { 
      challengeId: string; 
      teamName: string;
    }) => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'create_team',
          clientId,
          trainerId,
          challengeId,
          teamName,
        },
      });

      if (response.error) throw response.error;
      return response.data as { team: Team; invite_code: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-team', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
    },
  });
}

// Hook to join a team
export function useJoinTeam() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async ({ 
      challengeId,
      inviteCode 
    }: { 
      challengeId: string;
      inviteCode: string;
    }) => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'join_team',
          clientId,
          trainerId,
          challengeId,
          inviteCode,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-team', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
    },
  });
}

// Hook to leave a team
export function useLeaveTeam() {
  const queryClient = useQueryClient();
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useMutation({
    mutationFn: async ({ 
      challengeId,
      teamId 
    }: { 
      challengeId: string;
      teamId: string;
    }) => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'leave_team',
          clientId,
          trainerId,
          challengeId,
          teamId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-team', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
    },
  });
}

// Hook to get team leaderboard
export function useTeamLeaderboard(challengeId: string | null) {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;

  return useQuery({
    queryKey: ['team-leaderboard', challengeId, clientId],
    queryFn: async () => {
      const response = await supabase.functions.invoke('client-portal-benchmarks', {
        body: {
          action: 'get_team_leaderboard',
          clientId,
          trainerId,
          challengeId,
        },
      });

      if (response.error) throw response.error;
      return response.data as {
        teams: Array<{
          rank: number;
          team_id: string;
          team_name: string;
          total_score: number;
          member_count: number;
          is_my_team: boolean;
          members?: Array<{
            client_id: string;
            pseudonym: string;
            role: 'captain' | 'member';
            best_score: number | null;
          }>;
        }>;
        my_team_rank?: number;
      };
    },
    enabled: !!challengeId && !!clientId && !!trainerId,
  });
}

// Hook for trainer to get team leaderboard
export function useTrainerTeamLeaderboard(challengeId: string | null) {
  return useQuery({
    queryKey: ['trainer-team-leaderboard', challengeId],
    queryFn: async () => {
      if (!challengeId) return { teams: [] };

      // Get all teams for this challenge
      const { data: teams, error: teamsError } = await supabase
        .from('challenge_teams')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('total_score', { ascending: false });

      if (teamsError) throw teamsError;

      // Get all team members with their pseudonyms and best scores
      const teamsWithMembers = await Promise.all(
        (teams || []).map(async (team, index) => {
          const { data: members } = await supabase
            .from('challenge_team_members')
            .select(`
              client_id,
              role,
              participant:challenge_participants!inner(pseudonym)
            `)
            .eq('team_id', team.id);

          // Get best scores for each member
          const membersWithScores = await Promise.all(
            (members || []).map(async (member: any) => {
              const { data: submissions } = await supabase
                .from('challenge_submissions')
                .select('score_primary')
                .eq('challenge_id', challengeId)
                .eq('client_id', member.client_id)
                .eq('status', 'approved')
                .order('score_primary', { ascending: false })
                .limit(1);

              return {
                client_id: member.client_id,
                role: member.role,
                pseudonym: member.participant?.pseudonym || 'Anonym',
                best_score: submissions?.[0]?.score_primary ?? null,
              };
            })
          );

          return {
            rank: index + 1,
            team_id: team.id,
            team_name: team.team_name,
            total_score: team.total_score || 0,
            member_count: team.member_count || 0,
            members: membersWithScores,
          };
        })
      );

      return { teams: teamsWithMembers };
    },
    enabled: !!challengeId,
  });
}
