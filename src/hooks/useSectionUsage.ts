/**
 * Hook for tracking and retrieving section usage for intelligent ordering
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SectionUsage {
  section_id: string;
  open_count: number;
  last_opened: string;
}

// Default section order (fallback when no usage data)
export const DEFAULT_SECTION_ORDER = [
  'performance',   // Výkon - prioritní sekce
  'communication', // Komunikace
  'health',        // Zdraví
  'body',          // Tělo
  'history',       // Historie
];

// Section to group mapping
export const SECTION_TO_GROUP: Record<string, string> = {
  prs: 'performance',
  'training-analytics': 'performance',
  feedback: 'performance',
  chat: 'communication',
  notes: 'communication',
  diagnostics: 'health',
  injuries: 'health',
  measurements: 'body',
  nutrition: 'body',
  media: 'body',
  timeline: 'history',
};

/**
 * Fetches section usage data for a specific client
 */
export function useSectionUsage(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['section-usage', clientId],
    queryFn: async () => {
      if (!clientId || !user?.id) return [];

      const { data, error } = await (supabase
        .from('client_section_usage' as any)
        .select('section_id, open_count, last_opened')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .order('open_count', { ascending: false }) as any);

      if (error) {
        console.error('Error fetching section usage:', error);
        return [];
      }

      return (data || []) as SectionUsage[];
    },
    enabled: !!clientId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to track when a section is opened
 */
export function useTrackSectionOpen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, sectionId }: { clientId: string; sectionId: string }) => {
      if (!user?.id) return null;

      // Upsert: increment count if exists, insert if not
      const { error } = await (supabase
        .from('client_section_usage' as any)
        .upsert(
          {
            user_id: user.id,
            client_id: clientId,
            section_id: sectionId,
            open_count: 1,
            last_opened: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,client_id,section_id',
          }
        ) as any);

      if (error) {
        // If conflict, do manual update with increment
        const { error: updateError } = await (supabase.rpc('increment_section_usage' as any, {
          p_user_id: user.id,
          p_client_id: clientId,
          p_section_id: sectionId,
        }) as any);

        // Fallback: manual select + update if RPC doesn't exist
        if (updateError) {
          const { data: existing } = await (supabase
            .from('client_section_usage' as any)
            .select('id, open_count')
            .eq('user_id', user.id)
            .eq('client_id', clientId)
            .eq('section_id', sectionId)
            .single() as any);

          if (existing) {
            await (supabase
              .from('client_section_usage' as any)
              .update({
                open_count: existing.open_count + 1,
                last_opened: new Date().toISOString(),
              })
              .eq('id', existing.id) as any);
          }
        }
      }

      return { clientId, sectionId };
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['section-usage', data.clientId] });
      }
    },
  });
}

/**
 * Helper function to get sorted groups based on usage
 */
export function getSortedGroups(usageData: SectionUsage[]): string[] {
  if (!usageData?.length) {
    return DEFAULT_SECTION_ORDER;
  }

  // Calculate group scores by summing section counts
  const groupScores: Record<string, number> = {};
  
  for (const usage of usageData) {
    const group = SECTION_TO_GROUP[usage.section_id];
    if (group) {
      groupScores[group] = (groupScores[group] || 0) + usage.open_count;
    }
  }

  // Sort groups by score (descending)
  const sortedGroups = Object.entries(groupScores)
    .sort((a, b) => b[1] - a[1])
    .map(([group]) => group);

  // Add any missing groups from default order
  for (const group of DEFAULT_SECTION_ORDER) {
    if (!sortedGroups.includes(group)) {
      sortedGroups.push(group);
    }
  }

  return sortedGroups;
}

/**
 * Gets the most used group for highlighting
 */
export function getMostUsedGroup(usageData: SectionUsage[]): string | null {
  if (!usageData?.length) return null;

  const groupScores: Record<string, number> = {};
  
  for (const usage of usageData) {
    const group = SECTION_TO_GROUP[usage.section_id];
    if (group) {
      groupScores[group] = (groupScores[group] || 0) + usage.open_count;
    }
  }

  const sorted = Object.entries(groupScores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}
