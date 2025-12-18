import { useState } from 'react';
import { Plus, Dumbbell, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutEntries, useSyncToClientStats, WorkoutEntry } from '@/hooks/useWorkoutEntries';
import { WorkoutExerciseForm } from './WorkoutExerciseForm';
import { WorkoutExerciseList } from './WorkoutExerciseList';
import { useToast } from '@/hooks/use-toast';

interface WorkoutExerciseManagerProps {
  trainingSessionId: string;
  clientId: string;
  trainingDate: string;
  isEditMode: boolean;
  trainingStatus: string;
}

export function WorkoutExerciseManager({
  trainingSessionId,
  clientId,
  trainingDate,
  isEditMode,
  trainingStatus,
}: WorkoutExerciseManagerProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const {
    groupedEntries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    deleteExercise,
  } = useWorkoutEntries(trainingSessionId);

  const syncToClientStats = useSyncToClientStats();

  const handleAddExercise = async (data: {
    exercise_id: string | null;
    exercise_name: string;
    sets: { weight_kg: number | null; reps: number | null; rpe: number | null }[];
  }) => {
    try {
      // Create entries for each set
      for (let i = 0; i < data.sets.length; i++) {
        await createEntry.mutateAsync({
          training_session_id: trainingSessionId,
          exercise_id: data.exercise_id,
          exercise_name: data.exercise_name,
          set_number: i + 1,
          weight_kg: data.sets[i].weight_kg,
          reps: data.sets[i].reps,
          rpe: data.sets[i].rpe,
        });
      }

      toast({
        title: 'Cvik přidán',
        description: `${data.exercise_name} byl přidán do tréninku.`,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleUpdateSet = async (entryId: string, updates: Partial<WorkoutEntry>) => {
    try {
      await updateEntry.mutateAsync({ id: entryId, ...updates });
    } catch (error) {
      console.error('Error updating set:', error);
    }
  };

  const handleDeleteSet = async (entryId: string) => {
    try {
      await deleteEntry.mutateAsync(entryId);
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  const handleDeleteExercise = async (exerciseName: string, exerciseId: string | null) => {
    try {
      await deleteExercise.mutateAsync({ exerciseName, exerciseId });
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleAddSet = async (exerciseName: string, exerciseId: string | null) => {
    try {
      // Get last set values for this exercise
      const exerciseGroup = groupedEntries.find(
        g => g.exercise_name === exerciseName && g.exercise_id === exerciseId
      );
      const lastSet = exerciseGroup?.sets[exerciseGroup.sets.length - 1];

      await createEntry.mutateAsync({
        training_session_id: trainingSessionId,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        weight_kg: lastSet?.weight_kg || null,
        reps: lastSet?.reps || null,
        rpe: null,
      });
    } catch (error) {
      console.error('Error adding set:', error);
    }
  };

  const handleSyncToStats = async () => {
    try {
      await syncToClientStats.mutateAsync({
        trainingSessionId,
        clientId,
        trainingDate,
      });
    } catch (error) {
      console.error('Error syncing to stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Cviky ({groupedEntries.length})
        </h3>
        <div className="flex gap-2">
          {trainingStatus === 'completed' && groupedEntries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncToStats}
              disabled={syncToClientStats.isPending}
            >
              {syncToClientStats.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Sync statistiky
            </Button>
          )}
          {(isEditMode || trainingStatus === 'scheduled') && !showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Přidat cvik
            </Button>
          )}
        </div>
      </div>

      {/* Add Exercise Form */}
      {showAddForm && (
        <WorkoutExerciseForm
          onAdd={handleAddExercise}
          onCancel={() => setShowAddForm(false)}
          isLoading={createEntry.isPending}
        />
      )}

      {/* Exercise List */}
      <WorkoutExerciseList
        groupedEntries={groupedEntries}
        isEditMode={isEditMode}
        onUpdateSet={handleUpdateSet}
        onDeleteSet={handleDeleteSet}
        onDeleteExercise={handleDeleteExercise}
        onAddSet={handleAddSet}
      />

      {/* Stats Summary */}
      {groupedEntries.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {groupedEntries.length}
              </p>
              <p className="text-xs text-muted-foreground">Cviků</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {groupedEntries.reduce((acc, g) => acc + g.sets.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Sérií</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {groupedEntries.reduce((acc, g) => {
                  return acc + g.sets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0);
                }, 0).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">kg Objem</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
