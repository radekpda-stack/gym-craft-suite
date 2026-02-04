import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCelebrations } from '@/contexts/SmartCelebrationContext';

interface NutritionXPResult {
  success: boolean;
  xp_awarded: number;
  events: Array<{
    source_type: string;
    xp_amount: number;
    description: string;
  }>;
  new_total_xp?: number;
  level?: number;
  leveled_up?: boolean;
  streak?: number;
}

export function useNutritionXP() {
  const queryClient = useQueryClient();
  const { showLevelUp } = useCelebrations();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      date, 
      entryType 
    }: { 
      clientId: string; 
      date: string; 
      entryType: 'food' | 'drink' | 'coffee';
    }): Promise<NutritionXPResult> => {
      const { data, error } = await supabase.functions.invoke('calculate-nutrition-xp', {
        body: { 
          client_id: clientId, 
          date,
          entry_type: entryType,
        },
      });

      if (error) throw error;
      return data as NutritionXPResult;
    },
    onSuccess: (data) => {
      if (data.xp_awarded > 0) {
        // Show toast for XP gained
        const totalXP = data.events.reduce((sum, e) => sum + e.xp_amount, 0);
        
        if (data.events.length === 1) {
          toast.success(`+${totalXP} XP`, {
            description: data.events[0].description,
            duration: 2000,
          });
        } else if (data.events.length > 1) {
          const descriptions = data.events.map(e => e.description).join(', ');
          toast.success(`+${totalXP} XP`, {
            description: descriptions,
            duration: 3000,
          });
        }

        // Show level up celebration
        if (data.leveled_up && data.level) {
          showLevelUp(data.level);
        }

        // Invalidate XP-related queries
        queryClient.invalidateQueries({ queryKey: ['xp-history'] });
        queryClient.invalidateQueries({ queryKey: ['client-xp'] });
        queryClient.invalidateQueries({ queryKey: ['client-badges'] });
      }
    },
    onError: (error) => {
      console.error('Failed to calculate nutrition XP:', error);
    },
  });
}
