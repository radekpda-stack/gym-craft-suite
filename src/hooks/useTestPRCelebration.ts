import { useEffect, useCallback } from 'react';
import { useCelebrations } from '@/contexts/CelebrationContext';
import type { TestSession, TestDefinition } from '@/types/tests';
import { formatDuration } from '@/lib/utils';

interface UseTestPRCelebrationOptions {
  sessions: TestSession[] | undefined;
  definition: TestDefinition | undefined;
  latestSession: TestSession | null;
}

export function useTestPRCelebration({ sessions, definition, latestSession }: UseTestPRCelebrationOptions) {
  const { showPR } = useCelebrations();
  
  const checkForPR = useCallback(() => {
    if (!sessions || !definition || !latestSession) return;
    
    // Only check valid and comparable sessions
    if (!latestSession.is_valid || !latestSession.is_comparable) return;
    
    const primaryKey = definition.primary_metric_key;
    const latestValue = latestSession.metrics_json[primaryKey] as number;
    if (latestValue == null) return;
    
    const isBetterLower = definition.primary_metric_better === 'lower_is_better';
    const isTimeMetric = primaryKey.includes('time') || primaryKey === 'time_s';
    
    // Get all previous valid comparable sessions (excluding the latest)
    const previousSessions = sessions.filter(s => 
      s.id !== latestSession.id && 
      s.is_valid && 
      s.is_comparable &&
      s.metrics_json[primaryKey] != null
    );
    
    if (previousSessions.length === 0) {
      // First test - it's a PR by default, but don't celebrate
      return;
    }
    
    // Find the best previous value
    const previousValues = previousSessions.map(s => s.metrics_json[primaryKey] as number);
    const previousBest = isBetterLower
      ? Math.min(...previousValues)
      : Math.max(...previousValues);
    
    // Check if the latest is a new PR
    const isNewPR = isBetterLower
      ? latestValue < previousBest
      : latestValue > previousBest;
    
    if (isNewPR) {
      const testName = definition.name_cs || definition.name;
      const valueDisplay = isTimeMetric 
        ? formatDuration(latestValue)
        : definition.primary_metric_key.includes('pct')
          ? `${latestValue.toFixed(1)}%`
          : latestValue.toFixed(2);
      
      // Calculate XP bonus based on improvement
      const improvement = isBetterLower
        ? ((previousBest - latestValue) / previousBest) * 100
        : ((latestValue - previousBest) / previousBest) * 100;
      
      const xpBonus = Math.min(100, Math.round(improvement * 5) + 25); // 25-100 XP based on improvement
      
      showPR(testName, valueDisplay, xpBonus);
    }
  }, [sessions, definition, latestSession, showPR]);
  
  return { checkForPR };
}

// Hook to use in the test creation flow
export function useTriggerTestPRCheck() {
  const { showPR } = useCelebrations();
  
  const triggerPRCheck = useCallback(async (
    newSession: TestSession,
    definition: TestDefinition,
    previousSessions: TestSession[]
  ) => {
    if (!newSession.is_valid || !newSession.is_comparable) return false;
    
    const primaryKey = definition.primary_metric_key;
    const latestValue = newSession.metrics_json[primaryKey] as number;
    if (latestValue == null) return false;
    
    const isBetterLower = definition.primary_metric_better === 'lower_is_better';
    const isTimeMetric = primaryKey.includes('time') || primaryKey === 'time_s';
    
    const validPrevious = previousSessions.filter(s =>
      s.is_valid &&
      s.is_comparable &&
      s.metrics_json[primaryKey] != null
    );
    
    if (validPrevious.length === 0) return false;
    
    const previousValues = validPrevious.map(s => s.metrics_json[primaryKey] as number);
    const previousBest = isBetterLower
      ? Math.min(...previousValues)
      : Math.max(...previousValues);
    
    const isNewPR = isBetterLower
      ? latestValue < previousBest
      : latestValue > previousBest;
    
    if (isNewPR) {
      const testName = definition.name_cs || definition.name;
      const valueDisplay = isTimeMetric
        ? formatDuration(latestValue)
        : definition.primary_metric_key.includes('pct')
          ? `${latestValue.toFixed(1)}%`
          : latestValue.toFixed(2);
      
      const improvement = isBetterLower
        ? ((previousBest - latestValue) / previousBest) * 100
        : ((latestValue - previousBest) / previousBest) * 100;
      
      const xpBonus = Math.min(100, Math.round(improvement * 5) + 25);
      
      // Delay to let the dialog close first
      setTimeout(() => {
        showPR(testName, valueDisplay, xpBonus);
      }, 500);
      
      return true;
    }
    
    return false;
  }, [showPR]);
  
  return { triggerPRCheck };
}
