import { useTrainingModeContext } from '@/contexts/TrainingModeContext';

/**
 * Hook for accessing Training Mode state and actions.
 * Training Mode is a focused UI for managing trainings during gym sessions.
 */
export function useTrainingMode() {
  return useTrainingModeContext();
}
