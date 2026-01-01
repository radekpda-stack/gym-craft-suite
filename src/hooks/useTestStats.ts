import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { TestSession, TestDefinition, TestStats, TestDueStatus } from '@/types/tests';

export function useTestStats(
  sessions: TestSession[] | undefined,
  definition: TestDefinition | undefined
): TestStats | null {
  return useMemo(() => {
    if (!sessions || !definition) return null;

    // Filter valid and comparable sessions for stats
    const validComparable = sessions.filter(s => s.is_valid && s.is_comparable);
    const validSessions = sessions.filter(s => s.is_valid);

    const lastResult = validSessions[0] || null;
    const lastComparable = validComparable[0] || null;

    // Calculate days since last test
    const daysSinceLastTest = lastComparable
      ? differenceInDays(new Date(), new Date(lastComparable.date_time))
      : null;

    // Calculate due status
    let dueStatus: TestDueStatus = 'ok';
    if (daysSinceLastTest === null) {
      dueStatus = 'due'; // Never tested
    } else if (daysSinceLastTest >= definition.recommended_frequency_days) {
      dueStatus = 'due';
    } else if (daysSinceLastTest >= definition.recommended_frequency_days * 0.8) {
      dueStatus = 'soon';
    }

    // Get primary metric key and direction
    const metricKey = definition.primary_metric_key;
    const lowerIsBetter = definition.primary_metric_better === 'lower_is_better';

    // Extract primary values from valid comparable sessions
    const valuesWithSessions = validComparable
      .map(s => ({
        value: getPrimaryValue(s, metricKey),
        date: s.date_time,
        session: s
      }))
      .filter(v => v.value !== null) as { value: number; date: string; session: TestSession }[];

    // Find PR
    let pr: TestStats['pr'] = null;
    if (valuesWithSessions.length > 0) {
      const prEntry = lowerIsBetter
        ? valuesWithSessions.reduce((min, v) => v.value < min.value ? v : min)
        : valuesWithSessions.reduce((max, v) => v.value > max.value ? v : max);
      
      pr = prEntry;
    }

    // Calculate trends
    let trendVsLast: TestStats['trendVsLast'] = null;
    let trendVsPr: TestStats['trendVsPr'] = null;

    if (valuesWithSessions.length >= 2) {
      const currentValue = valuesWithSessions[0].value;
      const previousValue = valuesWithSessions[1].value;
      
      const absoluteChange = currentValue - previousValue;
      const percentChange = previousValue !== 0 
        ? (absoluteChange / previousValue) * 100 
        : 0;
      
      trendVsLast = { absoluteChange, percentChange };
    }

    if (pr && valuesWithSessions.length > 0) {
      const currentValue = valuesWithSessions[0].value;
      const absoluteChange = currentValue - pr.value;
      const percentChange = pr.value !== 0 
        ? (absoluteChange / pr.value) * 100 
        : 0;
      
      trendVsPr = { absoluteChange, percentChange };
    }

    return {
      lastResult,
      pr,
      trendVsLast,
      trendVsPr,
      totalSessions: sessions.length,
      validComparableSessions: validComparable.length,
      dueStatus,
      daysSinceLastTest
    };
  }, [sessions, definition]);
}

function getPrimaryValue(session: TestSession, metricKey: string): number | null {
  const metrics = session.metrics_json;
  
  // Handle special cases for mobility tests
  if (metricKey === 'avg_cm' || metricKey === 'avg_deg') {
    const L = metrics.L_value;
    const R = metrics.R_value;
    if (L !== undefined && R !== undefined) {
      return (Number(L) + Number(R)) / 2;
    }
    return metrics[metricKey] !== undefined ? Number(metrics[metricKey]) : null;
  }

  // Handle HR drift
  if (metricKey === 'hr_drift') {
    if (metrics.hr_drift !== undefined) {
      return Number(metrics.hr_drift);
    }
    const hrFirst = metrics.avg_hr_first_10m;
    const hrLast = metrics.avg_hr_last_10m;
    if (hrFirst && hrLast) {
      return ((Number(hrLast) - Number(hrFirst)) / Number(hrFirst)) * 100;
    }
    return null;
  }

  const value = metrics[metricKey];
  return value !== undefined && value !== null ? Number(value) : null;
}

// Calculate due status for all tests for a client
export function calculateTestsDueStatus(
  definitions: TestDefinition[],
  sessions: TestSession[]
): Map<string, TestDueStatus> {
  const statusMap = new Map<string, TestDueStatus>();

  for (const def of definitions) {
    const testSessions = sessions.filter(
      s => s.test_definition_id === def.id && s.is_valid && s.is_comparable
    );

    if (testSessions.length === 0) {
      statusMap.set(def.id, 'due');
      continue;
    }

    const lastDate = new Date(testSessions[0].date_time);
    const daysSince = differenceInDays(new Date(), lastDate);

    if (daysSince >= def.recommended_frequency_days) {
      statusMap.set(def.id, 'due');
    } else if (daysSince >= def.recommended_frequency_days * 0.8) {
      statusMap.set(def.id, 'soon');
    } else {
      statusMap.set(def.id, 'ok');
    }
  }

  return statusMap;
}
