import { useState } from 'react';
import { 
  Trash2, 
  Edit2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Check,
  X,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GroupedWorkoutEntry, WorkoutEntry } from '@/hooks/useWorkoutEntries';
import { cn } from '@/lib/utils';

interface WorkoutExerciseListProps {
  groupedEntries: GroupedWorkoutEntry[];
  isEditMode: boolean;
  onUpdateSet: (entryId: string, updates: Partial<WorkoutEntry>) => void;
  onDeleteSet: (entryId: string) => void;
  onDeleteExercise: (exerciseName: string, exerciseId: string | null) => void;
  onAddSet: (exerciseName: string, exerciseId: string | null) => void;
}

interface EditingSet {
  id: string;
  weight_kg: string;
  reps: string;
  rpe: string;
}

export function WorkoutExerciseList({
  groupedEntries,
  isEditMode,
  onUpdateSet,
  onDeleteSet,
  onDeleteExercise,
  onAddSet,
}: WorkoutExerciseListProps) {
  const [openExercises, setOpenExercises] = useState<string[]>([]);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [deleteExercise, setDeleteExercise] = useState<{ name: string; id: string | null } | null>(null);

  const toggleExercise = (key: string) => {
    setOpenExercises(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
  };

  const handleStartEdit = (set: WorkoutEntry) => {
    setEditingSet({
      id: set.id,
      weight_kg: set.weight_kg?.toString() || '',
      reps: set.reps?.toString() || '',
      rpe: set.rpe?.toString() || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingSet) return;
    onUpdateSet(editingSet.id, {
      weight_kg: editingSet.weight_kg ? parseFloat(editingSet.weight_kg) : null,
      reps: editingSet.reps ? parseInt(editingSet.reps) : null,
      rpe: editingSet.rpe ? parseInt(editingSet.rpe) : null,
    });
    setEditingSet(null);
  };

  const handleCancelEdit = () => {
    setEditingSet(null);
  };

  const getExerciseKey = (group: GroupedWorkoutEntry) => 
    `${group.exercise_name}|${group.exercise_id || 'null'}`;

  const calculateTotalVolume = (sets: WorkoutEntry[]) => {
    return sets.reduce((acc, set) => {
      const volume = (set.weight_kg || 0) * (set.reps || 0);
      return acc + volume;
    }, 0);
  };

  if (groupedEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Zatím nebyly přidány žádné cviky.</p>
        {isEditMode && (
          <p className="text-sm mt-1">Klikněte na "Přidat cvik" pro přidání cviku.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedEntries.map((group, groupIndex) => {
        const key = getExerciseKey(group);
        const isOpen = openExercises.includes(key);
        const totalVolume = calculateTotalVolume(group.sets);
        const bestSet = group.sets.reduce((best, set) => {
          const currentVolume = (set.weight_kg || 0) * (set.reps || 0);
          const bestVolume = (best.weight_kg || 0) * (best.reps || 0);
          return currentVolume > bestVolume ? set : best;
        }, group.sets[0]);

        return (
          <Collapsible
            key={key}
            open={isOpen}
            onOpenChange={() => toggleExercise(key)}
          >
            <div className="glass rounded-xl overflow-hidden">
              {/* Exercise Header */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    )}
                    <div>
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        {group.exercise_name}
                        {bestSet.weight_kg && (
                          <Badge variant="secondary" className="text-xs">
                            {bestSet.weight_kg}kg × {bestSet.reps}
                          </Badge>
                        )}
                        {/* Show PR badge if any set has is_pr */}
                        {group.sets.some(s => s.is_pr) && (
                          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            PR
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {group.sets.length} {group.sets.length === 1 ? 'série' : group.sets.length < 5 ? 'série' : 'sérií'}
                        {totalVolume > 0 && ` • ${totalVolume.toFixed(0)} kg objem`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteExercise({ name: group.exercise_name, id: group.exercise_id });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Exercise Sets */}
              <CollapsibleContent>
                <div className="border-t border-border">
                  {/* Header */}
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 p-3 text-xs text-muted-foreground bg-secondary/30">
                    <span className="w-8 text-center">#</span>
                    <span>Váha</span>
                    <span>Opak.</span>
                    <span>RPE</span>
                    <span className="w-16"></span>
                  </div>

                  {/* Sets */}
                  {group.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className={cn(
                        "grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 p-3 items-center border-b border-border/50 last:border-b-0",
                        setIndex % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20'
                      )}
                    >
                      <span className="w-8 text-center text-sm text-muted-foreground">
                        {set.set_number}
                      </span>

                      {editingSet?.id === set.id ? (
                        // Editing mode
                        <>
                          <Input
                            type="number"
                            step="0.5"
                            value={editingSet.weight_kg}
                            onChange={(e) => setEditingSet({ ...editingSet, weight_kg: e.target.value })}
                            className="bg-secondary border-border h-8"
                          />
                          <Input
                            type="number"
                            value={editingSet.reps}
                            onChange={(e) => setEditingSet({ ...editingSet, reps: e.target.value })}
                            className="bg-secondary border-border h-8"
                          />
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={editingSet.rpe}
                            onChange={(e) => setEditingSet({ ...editingSet, rpe: e.target.value })}
                            className="bg-secondary border-border h-8"
                          />
                          <div className="flex gap-1 w-16">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-primary"
                              onClick={handleSaveEdit}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        // View mode
                        <>
                          <span className="font-medium flex items-center gap-1">
                            {set.weight_kg ? `${set.weight_kg} kg` : '-'}
                            {set.is_pr && (
                              <Trophy className="w-3 h-3 text-amber-500" />
                            )}
                          </span>
                          <span className="font-medium">
                            {set.reps ?? set.time_seconds ? `${set.time_seconds}s` : '-'}
                          </span>
                          <span className="text-muted-foreground">
                            {set.rpe ? `@${set.rpe}` : '-'}
                          </span>
                          {isEditMode && (
                            <div className="flex gap-1 w-16">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                                onClick={() => handleStartEdit(set)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-destructive hover:text-destructive"
                                onClick={() => onDeleteSet(set.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add Set Button */}
                  {isEditMode && (
                    <div className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onAddSet(group.exercise_name, group.exercise_id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Přidat sérii
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Delete Exercise Confirmation */}
      <AlertDialog open={!!deleteExercise} onOpenChange={() => setDeleteExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat cvik?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete odebrat cvik "{deleteExercise?.name}" včetně všech sérií? 
              Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteExercise) {
                  onDeleteExercise(deleteExercise.name, deleteExercise.id);
                  setDeleteExercise(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Odebrat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
