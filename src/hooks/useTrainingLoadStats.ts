import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';

export interface TrainingLoadStats {
  avgCoachRPE7d: number | null;
  avgCoachRPE28d: number | null;
  avgClientRPE7d: number | null;
  avgClientRPE28d: number | null;
  totalLoad7d: number;
  totalLoad28d: number;
  rpeDiscrepancy: number | null; // avg(coach - client)
  loadTrend: 'increasing' | 'stable' | 'decreasing';
  coachRPEOverTime: { date: string; value: number }[];
  clientRPEOverTime: { date: string; value: number }[];
  loadOverTime: { date: string; value: number }[];
  byType: { type: string; avgRPE: number; count: number }[];
  totalSessions7d: number;
  totalSessions28d: number;
}

export function useTrainingLoadStats(clientId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['training-load-stats', clientId, user?.id],
    queryFn: async (): Promise<TrainingLoadStats> => {
      const now = new Date();
      const date7dAgo = format(subDays(now, 7), 'yyyy-MM-dd');
      const date28dAgo = format(subDays(now, 28), 'yyyy-MM-dd');

      // Načíst tréninky za posledních 28 dní
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, date, training_type, rpe, client_rpe, training_load, duration, status')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('date', date28dAgo)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching training load stats:', error);
        throw error;
      }

      const allSessions = sessions || [];
      
      // Rozdělit na 7d a 28d
      const sessions7d = allSessions.filter((s) => s.date >= date7dAgo);
      const sessions28d = allSessions;

      // Výpočty pro 7 dní
      const coachRPE7d = sessions7d.filter((s) => s.rpe != null).map((s) => s.rpe!);
      const clientRPE7d = sessions7d.filter((s) => s.client_rpe != null).map((s) => s.client_rpe!);
      const load7d = sessions7d.filter((s) => s.training_load != null).reduce((sum, s) => sum + s.training_load!, 0);

      // Výpočty pro 28 dní
      const coachRPE28d = sessions28d.filter((s) => s.rpe != null).map((s) => s.rpe!);
      const clientRPE28d = sessions28d.filter((s) => s.client_rpe != null).map((s) => s.client_rpe!);
      const load28d = sessions28d.filter((s) => s.training_load != null).reduce((sum, s) => sum + s.training_load!, 0);

      // Průměry
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      const avgCoachRPE7dVal = avg(coachRPE7d);
      const avgCoachRPE28dVal = avg(coachRPE28d);
      const avgClientRPE7dVal = avg(clientRPE7d);
      const avgClientRPE28dVal = avg(clientRPE28d);

      // Diskrepance
      const sessionsWithBothRPE = sessions28d.filter((s) => s.rpe != null && s.client_rpe != null);
      const discrepancy = sessionsWithBothRPE.length > 0
        ? sessionsWithBothRPE.reduce((sum, s) => sum + (s.rpe! - s.client_rpe!), 0) / sessionsWithBothRPE.length
        : null;

      // Trend (porovnat první a druhou polovinu 28 dní)
      const midpoint = Math.floor(sessions28d.length / 2);
      const firstHalf = sessions28d.slice(0, midpoint);
      const secondHalf = sessions28d.slice(midpoint);
      
      const loadFirstHalf = firstHalf.filter((s) => s.training_load).reduce((sum, s) => sum + (s.training_load || 0), 0);
      const loadSecondHalf = secondHalf.filter((s) => s.training_load).reduce((sum, s) => sum + (s.training_load || 0), 0);
      
      let loadTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (loadSecondHalf > loadFirstHalf * 1.15) loadTrend = 'increasing';
      else if (loadSecondHalf < loadFirstHalf * 0.85) loadTrend = 'decreasing';

      // Time series data
      const coachRPEOverTime = sessions28d
        .filter((s) => s.rpe != null)
        .map((s) => ({ date: s.date, value: s.rpe! }));

      const clientRPEOverTime = sessions28d
        .filter((s) => s.client_rpe != null)
        .map((s) => ({ date: s.date, value: s.client_rpe! }));

      const loadOverTime = sessions28d
        .filter((s) => s.training_load != null)
        .map((s) => ({ date: s.date, value: s.training_load! }));

      // Agregace podle typu
      const typeMap = new Map<string, { total: number; count: number }>();
      sessions28d.forEach((s) => {
        if (!s.training_type || s.rpe == null) return;
        const existing = typeMap.get(s.training_type) || { total: 0, count: 0 };
        typeMap.set(s.training_type, {
          total: existing.total + s.rpe,
          count: existing.count + 1,
        });
      });

      const byType = Array.from(typeMap.entries()).map(([type, { total, count }]) => ({
        type,
        avgRPE: total / count,
        count,
      }));

      return {
        avgCoachRPE7d: avgCoachRPE7dVal ? Math.round(avgCoachRPE7dVal * 10) / 10 : null,
        avgCoachRPE28d: avgCoachRPE28dVal ? Math.round(avgCoachRPE28dVal * 10) / 10 : null,
        avgClientRPE7d: avgClientRPE7dVal ? Math.round(avgClientRPE7dVal * 10) / 10 : null,
        avgClientRPE28d: avgClientRPE28dVal ? Math.round(avgClientRPE28dVal * 10) / 10 : null,
        totalLoad7d: load7d,
        totalLoad28d: load28d,
        rpeDiscrepancy: discrepancy ? Math.round(discrepancy * 10) / 10 : null,
        loadTrend,
        coachRPEOverTime,
        clientRPEOverTime,
        loadOverTime,
        byType,
        totalSessions7d: sessions7d.length,
        totalSessions28d: sessions28d.length,
      };
    },
    enabled: !!clientId && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minut
  });
}
