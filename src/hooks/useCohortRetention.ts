import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/contexts/DemoContext';
import { startOfWeek, startOfMonth, subWeeks, subMonths, format, differenceInWeeks, differenceInMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

export type CohortGranularity = 'week' | 'month';

export interface CohortRow {
  cohortLabel: string;
  cohortStart: Date;
  initialClients: number;
  retentionByPeriod: number[]; // retention % for each period (0, 1, 2, ...)
}

export interface CohortRetentionData {
  rows: CohortRow[];
  periodLabels: string[]; // "0", "1", "2", ... or "T", "T+1", "T+2"
  avgRetentionByPeriod: number[];
  overallRetention: number;
}

// Generate demo cohort data
const generateDemoCohortData = (granularity: CohortGranularity): CohortRetentionData => {
  const periods = granularity === 'week' ? 8 : 6;
  const rows: CohortRow[] = [];
  
  for (let i = periods - 1; i >= 0; i--) {
    const cohortStart = granularity === 'week' 
      ? subWeeks(new Date(), i) 
      : subMonths(new Date(), i);
    
    const cohortLabel = granularity === 'week'
      ? `T ${format(cohortStart, 'w', { locale: cs })}`
      : format(cohortStart, 'LLL yy', { locale: cs });

    const initialClients = 5 + Math.floor(Math.random() * 10);
    const retention: number[] = [100];
    
    // Generate decreasing retention over time
    let currentRetention = 100;
    for (let p = 1; p < periods - i; p++) {
      // Retention drops by 5-20% each period
      const drop = 5 + Math.random() * 15;
      currentRetention = Math.max(0, currentRetention - drop);
      retention.push(Math.round(currentRetention));
    }
    
    rows.push({
      cohortLabel,
      cohortStart,
      initialClients,
      retentionByPeriod: retention,
    });
  }

  // Calculate averages
  const avgRetentionByPeriod: number[] = [];
  for (let p = 0; p < periods; p++) {
    const values = rows
      .filter(r => r.retentionByPeriod[p] !== undefined)
      .map(r => r.retentionByPeriod[p]);
    avgRetentionByPeriod.push(
      values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
    );
  }

  return {
    rows,
    periodLabels: Array.from({ length: periods }, (_, i) => i === 0 ? 'Start' : `+${i}`),
    avgRetentionByPeriod,
    overallRetention: avgRetentionByPeriod[avgRetentionByPeriod.length - 1] || 0,
  };
};

export function useCohortRetention(granularity: CohortGranularity = 'month') {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ['cohort-retention', granularity, isDemo],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<CohortRetentionData> => {
      if (isDemo) {
        return generateDemoCohortData(granularity);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const periods = granularity === 'week' ? 8 : 6;

      // Get all training sessions
      const lookbackDate = granularity === 'week' 
        ? subWeeks(now, periods * 2) 
        : subMonths(now, periods * 2);

      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('date', lookbackDate.toISOString());

      if (error) throw error;

      // Group sessions by client and period
      const clientFirstPeriod: Map<string, Date> = new Map();
      const clientPeriods: Map<string, Set<string>> = new Map();

      for (const session of sessions || []) {
        const date = new Date(session.date);
        const periodStart = granularity === 'week' 
          ? startOfWeek(date, { weekStartsOn: 1 })
          : startOfMonth(date);
        const periodKey = periodStart.toISOString();

        // Track first appearance
        if (!clientFirstPeriod.has(session.client_id)) {
          clientFirstPeriod.set(session.client_id, periodStart);
        }

        // Track all periods
        if (!clientPeriods.has(session.client_id)) {
          clientPeriods.set(session.client_id, new Set());
        }
        clientPeriods.get(session.client_id)!.add(periodKey);
      }

      // Build cohorts
      const cohorts: Map<string, { start: Date; clients: Set<string> }> = new Map();
      
      for (const [clientId, firstPeriod] of clientFirstPeriod.entries()) {
        const key = firstPeriod.toISOString();
        if (!cohorts.has(key)) {
          cohorts.set(key, { start: firstPeriod, clients: new Set() });
        }
        cohorts.get(key)!.clients.add(clientId);
      }

      // Sort cohorts by date and take last N
      const sortedCohorts = [...cohorts.entries()]
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-periods);

      const rows: CohortRow[] = sortedCohorts.map(([key, cohort]) => {
        const cohortLabel = granularity === 'week'
          ? `T ${format(cohort.start, 'w', { locale: cs })}`
          : format(cohort.start, 'LLL yy', { locale: cs });

        const initialClients = cohort.clients.size;
        const retentionByPeriod: number[] = [];

        // Calculate retention for each subsequent period
        for (let p = 0; p < periods; p++) {
          const targetPeriod = granularity === 'week'
            ? startOfWeek(subWeeks(now, periods - 1 - p), { weekStartsOn: 1 })
            : startOfMonth(subMonths(now, periods - 1 - p));

          if (targetPeriod < cohort.start) {
            continue;
          }

          const periodDiff = granularity === 'week'
            ? differenceInWeeks(targetPeriod, cohort.start)
            : differenceInMonths(targetPeriod, cohort.start);

          if (periodDiff < 0) continue;

          const targetKey = targetPeriod.toISOString();
          const activeInPeriod = [...cohort.clients].filter(clientId => 
            clientPeriods.get(clientId)?.has(targetKey)
          ).length;

          const retention = initialClients > 0 
            ? Math.round((activeInPeriod / initialClients) * 100)
            : 0;

          // Fill gaps in retention array
          while (retentionByPeriod.length < periodDiff) {
            retentionByPeriod.push(retentionByPeriod[retentionByPeriod.length - 1] || 0);
          }
          retentionByPeriod[periodDiff] = retention;
        }

        // Ensure first period is always 100%
        if (retentionByPeriod.length === 0 || retentionByPeriod[0] !== 100) {
          retentionByPeriod.unshift(100);
        }

        return {
          cohortLabel,
          cohortStart: cohort.start,
          initialClients,
          retentionByPeriod,
        };
      });

      // Calculate averages
      const avgRetentionByPeriod: number[] = [];
      for (let p = 0; p < periods; p++) {
        const values = rows
          .filter(r => r.retentionByPeriod[p] !== undefined)
          .map(r => r.retentionByPeriod[p]);
        avgRetentionByPeriod.push(
          values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
        );
      }

      return {
        rows,
        periodLabels: Array.from({ length: periods }, (_, i) => i === 0 ? 'Start' : `+${i}`),
        avgRetentionByPeriod,
        overallRetention: avgRetentionByPeriod[avgRetentionByPeriod.length - 1] || 0,
      };
    },
  });
}
