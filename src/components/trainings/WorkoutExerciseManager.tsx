import { useState } from 'react';
import { Plus, Dumbbell, RefreshCw, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutEntries, useSyncToClientStats, WorkoutEntry } from '@/hooks/useWorkoutEntries';
import { WorkoutExerciseForm } from './WorkoutExerciseForm';
import { WorkoutExerciseList } from './WorkoutExerciseList';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoTagFromExercise } from '@/hooks/useAutoTagFromExercise';

export interface Participant {
  client_id: string;
  name: string;
}

interface WorkoutExerciseManagerProps {
  trainingSessionId: string;
  clientId: string;
  trainingDate: string;
  trainingStatus: string;
  participants?: Participant[];
}

export function WorkoutExerciseManager({
  trainingSessionId,
  clientId,
  trainingDate,
  trainingStatus,
  participants = [],
}: WorkoutExerciseManagerProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const {
    groupedEntries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    deleteExercise,
  } = useWorkoutEntries(trainingSessionId);

  const syncToClientStats = useSyncToClientStats();
  const { autoTagFromExercise } = useAutoTagFromExercise();
  
  // Check if this is a group training (more than 1 participant)
  const isGroupTraining = participants.length > 1;
  
  // Get the current participant for adding exercises
  const currentParticipantId = isGroupTraining ? activeParticipantId : (participants[0]?.client_id || clientId);
  const currentParticipantName = participants.find(p => p.client_id === currentParticipantId)?.name || 'Klient';

  // Filter entries by participant for display
  const getEntriesForParticipant = (participantId: string | null) => {
    if (!participantId) return groupedEntries;
    return groupedEntries.filter(g => 
      g.participant_client_id === participantId || 
      (!g.participant_client_id && participantId === (participants[0]?.client_id || clientId))
    );
  };

  const handleAddExercise = async (data: {
    exercise_id: string | null;
    exercise_name: string;
    sets: { 
      weight_kg: number | null; 
      reps: number | null; 
      rpe: number | null;
      time_seconds?: number | null;
      distance_meters?: number | null;
      avg_watts?: number | null;
      calories?: number | null;
    }[];
    assistance_bands?: string[] | null;
  }) => {
    try {
      // Create entries for each set with participant_client_id for group trainings
      for (let i = 0; i < data.sets.length; i++) {
        await createEntry.mutateAsync({
          training_session_id: trainingSessionId,
          exercise_id: data.exercise_id,
          exercise_name: data.exercise_name,
          set_number: i + 1,
          weight_kg: data.sets[i].weight_kg,
          reps: data.sets[i].reps,
          rpe: data.sets[i].rpe,
          time_seconds: data.sets[i].time_seconds,
          distance_meters: data.sets[i].distance_meters,
          watts: data.sets[i].avg_watts,
          calories: data.sets[i].calories,
          // Add participant_client_id for group trainings
          participant_client_id: isGroupTraining ? currentParticipantId : null,
          // Add assistance bands (same for all sets of this exercise)
          assistance_bands: data.assistance_bands || null,
        });
      }

      // Auto-tag training session based on exercise body parts
      if (data.exercise_id) {
        await autoTagFromExercise(trainingSessionId, data.exercise_id);
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

  const handleAddSet = async (exerciseName: string, exerciseId: string | null, participantClientId?: string | null) => {
    try {
      // Get last set values for this exercise (and participant if applicable)
      const exerciseGroup = groupedEntries.find(
        g => g.exercise_name === exerciseName && 
             g.exercise_id === exerciseId &&
             (isGroupTraining ? g.participant_client_id === participantClientId : true)
      );
      const lastSet = exerciseGroup?.sets[exerciseGroup.sets.length - 1];

      await createEntry.mutateAsync({
        training_session_id: trainingSessionId,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        weight_kg: lastSet?.weight_kg || null,
        reps: lastSet?.reps || null,
        rpe: null,
        time_seconds: lastSet?.time_seconds || null,
        distance_meters: lastSet?.distance_meters || null,
        watts: lastSet?.watts || null,
        calories: lastSet?.calories || null,
        participant_client_id: participantClientId || null,
        // Copy assistance bands from last set
        assistance_bands: lastSet?.assistance_bands || null,
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
          {isGroupTraining && (
            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" />
              {participants.length} účastníků
            </span>
          )}
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
        </div>
      </div>

      {/* Group training: Tabs for each participant */}
      {isGroupTraining ? (
        <Tabs 
          value={activeParticipantId || participants[0]?.client_id || ''} 
          onValueChange={setActiveParticipantId}
          className="w-full"
        >
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-secondary/50 p-1">
            {participants.map((p) => (
              <TabsTrigger 
                key={p.client_id} 
                value={p.client_id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {p.name}
                <span className="ml-1 text-xs opacity-70">
                  ({getEntriesForParticipant(p.client_id).length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {participants.map((p) => (
            <TabsContent key={p.client_id} value={p.client_id} className="mt-4 space-y-4">
              {/* Add button for this participant */}
              {!showAddForm && (
                <Button
                  onClick={() => {
                    setActiveParticipantId(p.client_id);
                    setShowAddForm(true);
                  }}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Přidat cvik pro {p.name}
                </Button>
              )}
              
              {/* Add Form - only show when this tab is active */}
              {showAddForm && activeParticipantId === p.client_id && (
                <WorkoutExerciseForm
                  onAdd={handleAddExercise}
                  onCancel={() => setShowAddForm(false)}
                  isLoading={createEntry.isPending}
                />
              )}
              
              {/* Exercises for this participant */}
              <WorkoutExerciseList
                groupedEntries={getEntriesForParticipant(p.client_id)}
                onUpdateSet={handleUpdateSet}
                onDeleteSet={handleDeleteSet}
                onDeleteExercise={handleDeleteExercise}
                onAddSet={(name, id) => handleAddSet(name, id, p.client_id)}
                participantName={p.name}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <>
          {/* Single participant: Original layout */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Přidat cvik
            </Button>
          )}
          
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
            onUpdateSet={handleUpdateSet}
            onDeleteSet={handleDeleteSet}
            onDeleteExercise={handleDeleteExercise}
            onAddSet={(name, id) => handleAddSet(name, id, null)}
          />
        </>
      )}

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
