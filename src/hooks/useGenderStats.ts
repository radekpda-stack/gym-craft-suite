import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, format } from 'date-fns';

interface GenderStats {
  prsByGender: {
    male: number;
    female: number;
    unknown: number;
  };
  exercisesByGender: {
    male: number;
    female: number;
    unknown: number;
  };
}

export function useGenderStats() {
  return useQuery({
    queryKey: ['gender-stats'],
    queryFn: async (): Promise<GenderStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = startOfYear(new Date());
      const startStr = format(startDate, 'yyyy-MM-dd');

      // Fetch clients with gender
      const { data: clients } = await supabase
        .from('clients')
        .select('id, gender')
        .eq('user_id', user.id);

      // Fetch exercise entries with PR info
      const { data: exerciseEntries } = await supabase
        .from('exercise_entries')
        .select('id, client_id, is_pr')
        .eq('user_id', user.id)
        .gte('date', startStr);

      const clientsMap = new Map(
        (clients || []).map(c => [c.id, c.gender])
      );

      // Calculate PRs by gender
      const prsByGender = { male: 0, female: 0, unknown: 0 };
      const exercisesByGender = { male: 0, female: 0, unknown: 0 };

      (exerciseEntries || []).forEach(entry => {
        const gender = clientsMap.get(entry.client_id);
        const genderKey = gender === 'male' ? 'male' : 
                          gender === 'female' ? 'female' : 'unknown';
        
        exercisesByGender[genderKey]++;
        
        if (entry.is_pr) {
          prsByGender[genderKey]++;
        }
      });

      return {
        prsByGender,
        exercisesByGender,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
