import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format } from 'date-fns';

// Types
export interface PRDefinition {
  id: string;
  name: string;
  description: string | null;
  metric_type: 'time' | 'weight' | 'reps' | 'distance' | 'power' | 'score';
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  scope: 'challenge' | 'workout' | 'both';
  is_active: boolean;
}

export interface ClientPR {
  id: string;
  client_id: string;
  pr_definition_id: string;
  best_value: number;
  best_display: string;
  achieved_at: string;
  source_type: 'challenge' | 'workout';
  source_id: string | null;
  pr_definitions?: PRDefinition;
}

export interface PRHistoryEntry {
  id: string;
  client_id: string;
  pr_definition_id: string;
  value: number;
  display: string;
  achieved_at: string;
  source_type: 'challenge' | 'workout';
  source_id: string | null;
  xp_awarded: number;
}

// Helper: Format time value to mm:ss
export function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper: Format value based on metric type
export function formatPRValue(value: number, metricType: string, unit: string): string {
  switch (metricType) {
    case 'time':
      return formatTimeDisplay(value);
    case 'weight':
      return `${value} ${unit}`;
    case 'reps':
      return `${value} ${unit}`;
    case 'distance':
      return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
    case 'power':
      return `${value} ${unit}`;
    default:
      return `${value} ${unit}`;
  }
}

// Helper: Parse mm:ss to seconds
export function parseTimeInput(input: string): number | null {
  if (!input) return null;
  
  // Check for mm:ss format
  const mmssMatch = input.match(/^(\d+):(\d{1,2})$/);
  if (mmssMatch) {
    const mins = parseInt(mmssMatch[1], 10);
    const secs = parseInt(mmssMatch[2], 10);
    if (secs < 60) {
      return mins * 60 + secs;
    }
  }
  
  // Check for plain number (seconds)
  const num = parseFloat(input);
  if (!isNaN(num) && num >= 0) {
    return num;
  }
  
  return null;
}

// Check if new value is a PR
export function isPRImprovement(
  newValue: number, 
  currentBest: number | null, 
  direction: 'lower_is_better' | 'higher_is_better'
): boolean {
  if (currentBest === null) return true;
  return direction === 'lower_is_better' 
    ? newValue < currentBest 
    : newValue > currentBest;
}

// Fetch all PR definitions
export function usePRDefinitions() {
  return useQuery({
    queryKey: ['pr-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pr_definitions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as PRDefinition[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Fetch client's PRs
export function useClientPRs(clientId?: string) {
  return useQuery({
    queryKey: ['client-prs', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_prs')
        .select(`
          *,
          pr_definitions (*)
        `)
        .eq('client_id', clientId)
        .order('achieved_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientPR[];
    },
    enabled: !!clientId,
  });
}

// Fetch PR history for a specific definition
export function usePRHistory(clientId?: string, prDefinitionId?: string) {
  return useQuery({
    queryKey: ['pr-history', clientId, prDefinitionId],
    queryFn: async () => {
      if (!clientId || !prDefinitionId) return [];
      
      const { data, error } = await supabase
        .from('pr_history')
        .select('*')
        .eq('client_id', clientId)
        .eq('pr_definition_id', prDefinitionId)
        .order('achieved_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PRHistoryEntry[];
    },
    enabled: !!clientId && !!prDefinitionId,
  });
}

// Get PR stats for a client
export function useClientPRStats(clientId?: string) {
  const { data: prs, isLoading } = useClientPRs(clientId);
  
  const stats = {
    totalPRs: prs?.length || 0,
    latestPR: prs?.[0] || null,
    prsByType: {} as Record<string, ClientPR[]>,
  };
  
  if (prs) {
    prs.forEach(pr => {
      const type = pr.pr_definitions?.metric_type || 'other';
      if (!stats.prsByType[type]) {
        stats.prsByType[type] = [];
      }
      stats.prsByType[type].push(pr);
    });
  }
  
  return { stats, isLoading };
}

// Hook for client portal to view their PRs
export function useMyPRs() {
  const { clientId } = useClientPortal();
  return useClientPRs(clientId ?? undefined);
}

// Get XP events for leaderboard calculation
export function useClientXPEvents(clientId?: string) {
  return useQuery({
    queryKey: ['xp-events', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

// Challenge winner info
export interface ChallengeWinnerInfo {
  challenge_id: string;
  challenge_title: string;
  winner_rank: number;
  xp_awarded: number;
  awarded_at: string;
}

// Get challenge wins for a client
export function useClientChallengeWins(clientId?: string) {
  return useQuery({
    queryKey: ['client-challenge-wins', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          challenge_id,
          winner_rank,
          xp_awarded,
          awarded_at,
          challenges:challenge_id (title)
        `)
        .eq('client_id', clientId)
        .eq('is_winner', true)
        .not('winner_rank', 'is', null)
        .order('awarded_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(d => ({
        challenge_id: d.challenge_id,
        challenge_title: (d.challenges as any)?.title || 'Challenge',
        winner_rank: d.winner_rank!,
        xp_awarded: d.xp_awarded,
        awarded_at: d.awarded_at!,
      })) as ChallengeWinnerInfo[];
    },
    enabled: !!clientId,
  });
}
