import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Equipment {
  id: string;
  name: string;
  name_cz: string;
  category: 'free_weights' | 'machines' | 'bodyweight' | 'cardio' | 'accessories';
  is_active: boolean;
}

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  free_weights: 'Volné váhy',
  machines: 'Stroje',
  bodyweight: 'Vlastní váha',
  cardio: 'Kardio',
  accessories: 'Příslušenství',
};

export function useEquipment() {
  const { data: equipment = [], isLoading, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('is_active', true)
        .order('name_cz');
      
      if (error) throw error;
      return data as Equipment[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - reference data rarely changes
  });

  const groupedByCategory = equipment.reduce((acc, eq) => {
    if (!acc[eq.category]) acc[eq.category] = [];
    acc[eq.category].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const getEquipmentByName = (name: string): Equipment | undefined => {
    return equipment.find(eq => eq.name === name || eq.name_cz === name);
  };

  return {
    equipment,
    groupedByCategory,
    getEquipmentByName,
    isLoading,
    error,
  };
}
