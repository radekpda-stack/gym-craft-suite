import { useState, useCallback } from 'react';
import { 
  saveOfflineTraining, 
  getOfflineTraining,
  getAllOfflineTrainings,
  deleteOfflineTraining,
  type OfflineTraining,
  type OfflineExercise,
  type OfflineSet,
} from '@/lib/offline';
import { haptic } from '@/lib/haptics';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Generate a unique local ID
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Hook for managing offline training data
 */
export function useOfflineTraining() {
  const { isOnline } = useOnlineStatus();
  const [currentTraining, setCurrentTraining] = useState<OfflineTraining | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Start a new offline training
   */
  const startOfflineTraining = useCallback(async (
    clientId: string,
    clientName: string,
    sessionId?: string
  ): Promise<OfflineTraining> => {
    const training: OfflineTraining = {
      id: '',
      localId: generateLocalId(),
      sessionId: sessionId ?? null,
      clientId,
      clientName,
      exercises: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(training);
    setCurrentTraining(training);
    haptic('light');
    
    return training;
  }, []);

  /**
   * Load an existing offline training
   */
  const loadOfflineTraining = useCallback(async (localId: string): Promise<OfflineTraining | null> => {
    setIsLoading(true);
    try {
      const training = await getOfflineTraining(localId);
      if (training) {
        setCurrentTraining(training);
      }
      return training ?? null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Add an exercise to the current training
   */
  const addExercise = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    initialSets: number = 3
  ): Promise<void> => {
    if (!currentTraining) return;

    const exercise: OfflineExercise = {
      id: generateLocalId(),
      exerciseId,
      exerciseName,
      sets: Array.from({ length: initialSets }, (_, i) => ({
        id: generateLocalId(),
        setNumber: i + 1,
        completed: false,
      })),
    };

    const updated: OfflineTraining = {
      ...currentTraining,
      exercises: [...currentTraining.exercises, exercise],
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(updated);
    haptic('light');
  }, [currentTraining]);

  /**
   * Update a set in the current training
   */
  const updateSet = useCallback(async (
    exerciseId: string,
    setId: string,
    updates: Partial<OfflineSet>
  ): Promise<void> => {
    if (!currentTraining) return;

    const updated: OfflineTraining = {
      ...currentTraining,
      exercises: currentTraining.exercises.map(ex => 
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map(set =>
                set.id === setId
                  ? { ...set, ...updates }
                  : set
              ),
            }
          : ex
      ),
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(updated);
  }, [currentTraining]);

  /**
   * Complete a set
   */
  const completeSet = useCallback(async (
    exerciseId: string,
    setId: string,
    data: { weight?: number; reps?: number; duration?: number; distance?: number }
  ): Promise<void> => {
    await updateSet(exerciseId, setId, {
      ...data,
      completed: true,
    });
    haptic('medium');
  }, [updateSet]);

  /**
   * Add a new set to an exercise
   */
  const addSet = useCallback(async (exerciseId: string): Promise<void> => {
    if (!currentTraining) return;

    const exercise = currentTraining.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) return;

    const newSet: OfflineSet = {
      id: generateLocalId(),
      setNumber: exercise.sets.length + 1,
      completed: false,
    };

    const updated: OfflineTraining = {
      ...currentTraining,
      exercises: currentTraining.exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, newSet] }
          : ex
      ),
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(updated);
    haptic('light');
  }, [currentTraining]);

  /**
   * Update exercise notes/RPE
   */
  const updateExercise = useCallback(async (
    exerciseId: string,
    updates: { notes?: string; rpe?: number }
  ): Promise<void> => {
    if (!currentTraining) return;

    const updated: OfflineTraining = {
      ...currentTraining,
      exercises: currentTraining.exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, ...updates }
          : ex
      ),
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(updated);
  }, [currentTraining]);

  /**
   * Remove an exercise
   */
  const removeExercise = useCallback(async (exerciseId: string): Promise<void> => {
    if (!currentTraining) return;

    const updated: OfflineTraining = {
      ...currentTraining,
      exercises: currentTraining.exercises.filter(ex => ex.id !== exerciseId),
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(updated);
    haptic('light');
  }, [currentTraining]);

  /**
   * Complete the training (mark for sync)
   */
  const completeTraining = useCallback(async (): Promise<void> => {
    if (!currentTraining) return;

    const updated: OfflineTraining = {
      ...currentTraining,
      status: isOnline ? 'pending_sync' : 'pending_sync',
      updatedAt: new Date().toISOString(),
    };

    await saveOfflineTraining(updated);
    setCurrentTraining(null);
    haptic('success');
  }, [currentTraining, isOnline]);

  /**
   * Discard the current training
   */
  const discardTraining = useCallback(async (): Promise<void> => {
    if (!currentTraining) return;

    await deleteOfflineTraining(currentTraining.localId);
    setCurrentTraining(null);
    haptic('light');
  }, [currentTraining]);

  /**
   * Get all offline trainings
   */
  const getAllTrainings = useCallback(async (): Promise<OfflineTraining[]> => {
    return getAllOfflineTrainings();
  }, []);

  return {
    currentTraining,
    isLoading,
    isOnline,
    startOfflineTraining,
    loadOfflineTraining,
    addExercise,
    updateSet,
    completeSet,
    addSet,
    updateExercise,
    removeExercise,
    completeTraining,
    discardTraining,
    getAllTrainings,
  };
}
