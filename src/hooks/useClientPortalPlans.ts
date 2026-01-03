import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientPlanView {
  id: string;
  name: string;
  primaryGoal: string;
  phase: string;
  periodStart: string;
  periodEnd: string | null;
  daysPerWeek: number;
  isActive: boolean;
  notes: string | null;
}

export function useClientPortalPlans(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-plans', clientId],
    queryFn: async (): Promise<ClientPlanView[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('training_plans')
        .select('id, name, primary_goal, phase, period_start, period_end, days_per_week, is_active, notes')
        .eq('client_id', clientId)
        .order('is_active', { ascending: false })
        .order('period_start', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        primaryGoal: p.primary_goal,
        phase: p.phase,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        daysPerWeek: p.days_per_week,
        isActive: p.is_active,
        notes: p.notes,
      }));
    },
    enabled: !!clientId,
  });
}

export function useActiveClientPlan(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-active-plan', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('training_plans')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}
