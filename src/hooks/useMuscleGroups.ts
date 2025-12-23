import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MuscleGroup {
  id: string;
  name: string;
  name_cz: string;
  name_en: string;
  region: 'dolni_koncetiny' | 'horni_koncetiny' | 'trup';
  side_relevant: boolean;
  display_order: number;
}

export interface MuscleGroupAlias {
  id: string;
  alias: string;
  muscle_group_id: string;
}

export const REGION_LABELS: Record<string, string> = {
  dolni_koncetiny: 'Dolní končetiny',
  horni_koncetiny: 'Horní končetiny',
  trup: 'Trup',
};

export function useMuscleGroups() {
  const { data: muscleGroups = [], isLoading, error } = useQuery({
    queryKey: ['muscle-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_groups')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as MuscleGroup[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - reference data rarely changes
  });

  const { data: aliases = [] } = useQuery({
    queryKey: ['muscle-group-aliases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_group_aliases')
        .select('*');
      
      if (error) throw error;
      return data as MuscleGroupAlias[];
    },
    staleTime: 1000 * 60 * 60,
  });

  // Create a lookup map for resolving aliases to muscle group IDs
  const aliasMap = new Map<string, string>();
  aliases.forEach(a => aliasMap.set(a.alias.toLowerCase(), a.muscle_group_id));
  
  // Create a lookup map for muscle groups by name
  const muscleGroupMap = new Map<string, MuscleGroup>();
  muscleGroups.forEach(mg => {
    muscleGroupMap.set(mg.name, mg);
    muscleGroupMap.set(mg.name_cz.toLowerCase(), mg);
    muscleGroupMap.set(mg.name_en.toLowerCase(), mg);
  });

  const resolveMuscleGroup = (nameOrAlias: string): MuscleGroup | undefined => {
    const normalized = nameOrAlias.toLowerCase();
    
    // Try direct match first
    const direct = muscleGroupMap.get(normalized);
    if (direct) return direct;
    
    // Try alias
    const muscleGroupId = aliasMap.get(normalized);
    if (muscleGroupId) {
      return muscleGroups.find(mg => mg.id === muscleGroupId);
    }
    
    return undefined;
  };

  const groupedByRegion = muscleGroups.reduce((acc, mg) => {
    if (!acc[mg.region]) acc[mg.region] = [];
    acc[mg.region].push(mg);
    return acc;
  }, {} as Record<string, MuscleGroup[]>);

  return {
    muscleGroups,
    aliases,
    groupedByRegion,
    resolveMuscleGroup,
    isLoading,
    error,
  };
}
