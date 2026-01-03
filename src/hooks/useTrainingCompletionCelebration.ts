import { useState, useCallback } from 'react';
import { useTrainingSummary } from '@/hooks/useTrainingSummary';

interface UseTrainingCompletionCelebrationOptions {
  trainingSessionId: string;
  clientId: string;
  clientName: string;
}

export function useTrainingCompletionCelebration() {
  const [showSummary, setShowSummary] = useState(false);
  const [completionData, setCompletionData] = useState<UseTrainingCompletionCelebrationOptions | null>(null);

  const triggerCelebration = useCallback((options: UseTrainingCompletionCelebrationOptions) => {
    setCompletionData(options);
    // Delay to allow the completion to process
    setTimeout(() => {
      setShowSummary(true);
    }, 500);
  }, []);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
    setCompletionData(null);
  }, []);

  return {
    showSummary,
    completionData,
    triggerCelebration,
    closeSummary,
  };
}
