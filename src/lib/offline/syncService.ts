/**
 * Offline Sync Service
 * Handles synchronization of offline data with the server
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  getSyncQueue,
  updateSyncQueueItem,
  removeSyncQueueItem,
  getPendingSyncTrainings,
  markTrainingAsSynced,
  type SyncQueueItem,
  type OfflineTraining,
} from './database';
import { haptic } from '@/lib/haptics';

type TrainingSessionInsert = Database['public']['Tables']['training_sessions']['Insert'];
type ExerciseEntryInsert = Database['public']['Tables']['exercise_entries']['Insert'];

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Process the sync queue - sync all pending items
 */
export async function processSyncQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // First, sync pending trainings
  const pendingTrainings = await getPendingSyncTrainings();
  for (const training of pendingTrainings) {
    try {
      await syncTraining(training);
      result.synced++;
    } catch (error) {
      result.failed++;
      result.success = false;
      result.errors.push(`Training ${training.localId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Then process the sync queue
  const queueItems = await getSyncQueue();
  for (const item of queueItems) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      // Skip items that have exceeded max retries
      continue;
    }

    try {
      await processSyncQueueItem(item);
      await removeSyncQueueItem(item.id);
      result.synced++;
    } catch (error) {
      result.failed++;
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${item.type}: ${errorMessage}`);
      
      await updateSyncQueueItem(item.id, {
        attempts: item.attempts + 1,
        lastAttempt: new Date().toISOString(),
        error: errorMessage,
      });
    }
  }

  // Haptic feedback on completion
  if (result.synced > 0) {
    haptic(result.failed === 0 ? 'success' : 'warning');
  }

  return result;
}

/**
 * Sync a single offline training to the server
 */
async function syncTraining(training: OfflineTraining): Promise<void> {
  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // If session exists, update it; otherwise create new
  if (training.sessionId) {
    // Update existing session
    const { error } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        completed_at: training.updatedAt,
      })
      .eq('id', training.sessionId);

    if (error) throw error;

    // Sync exercises
    for (const exercise of training.exercises) {
      await syncExercise(training.sessionId, exercise, user.id, training.clientId);
    }

    await markTrainingAsSynced(training.localId, training.sessionId);
  } else {
    // Create new training session
    const sessionData: TrainingSessionInsert = {
      user_id: user.id,
      status: 'completed',
      date: training.createdAt.split('T')[0],
    };
    
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert(sessionData)
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    // Add participant
    await supabase.from('training_session_participants').insert({
      training_session_id: session.id,
      client_id: training.clientId,
    });

    // Sync exercises
    for (const exercise of training.exercises) {
      await syncExercise(session.id, exercise, user.id, training.clientId);
    }

    await markTrainingAsSynced(training.localId, session.id);
  }
}

/**
 * Sync a single exercise to the server
 */
async function syncExercise(
  sessionId: string,
  exercise: OfflineTraining['exercises'][0],
  userId: string,
  clientId: string
): Promise<void> {
  for (const set of exercise.sets) {
    if (!set.completed) continue;

    const entryData: ExerciseEntryInsert = {
      training_session_id: sessionId,
      exercise_id: exercise.exerciseId,
      exercise_name: exercise.exerciseName,
      client_id: clientId,
      user_id: userId,
      sets: set.setNumber,
      weight_kg: set.weight ?? null,
      reps: set.reps ?? null,
      time_seconds: set.duration ?? null,
      distance_meters: set.distance ?? null,
      rpe: exercise.rpe ?? null,
      notes: exercise.notes ?? null,
      date: new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase
      .from('exercise_entries')
      .insert(entryData);

    if (error) throw error;
  }
}

/**
 * Process a single sync queue item
 */
async function processSyncQueueItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case 'create_training':
      // Handled by syncTraining above
      break;
    
    case 'update_training':
      const updatePayload = item.payload as { sessionId: string; updates: Record<string, unknown> };
      const { error: updateError } = await supabase
        .from('training_sessions')
        .update(updatePayload.updates)
        .eq('id', updatePayload.sessionId);
      if (updateError) throw updateError;
      break;

    case 'add_exercise': {
      const addPayload = item.payload as ExerciseEntryInsert;
      const { error: addError } = await supabase
        .from('exercise_entries')
        .insert(addPayload);
      if (addError) throw addError;
      break;
    }

    case 'update_exercise':
      const exercisePayload = item.payload as { id: string; updates: Record<string, unknown> };
      const { error: exerciseError } = await supabase
        .from('exercise_entries')
        .update(exercisePayload.updates)
        .eq('id', exercisePayload.id);
      if (exerciseError) throw exerciseError;
      break;

    case 'delete_exercise':
      const deletePayload = item.payload as { id: string };
      const { error: deleteError } = await supabase
        .from('exercise_entries')
        .delete()
        .eq('id', deletePayload.id);
      if (deleteError) throw deleteError;
      break;

    default:
      console.warn(`Unknown sync queue item type: ${item.type}`);
  }
}

/**
 * Schedule sync to run when connection is restored
 */
export function scheduleSyncOnReconnect(callback?: (result: SyncResult) => void): () => void {
  const handleOnline = async () => {
    // Wait a bit to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    
    const result = await processSyncQueue();
    callback?.(result);
  };

  window.addEventListener('online', handleOnline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Check if there's pending data to sync
 */
export async function hasPendingSync(): Promise<boolean> {
  const pending = await getPendingSyncTrainings();
  const queue = await getSyncQueue();
  return pending.length > 0 || queue.length > 0;
}
