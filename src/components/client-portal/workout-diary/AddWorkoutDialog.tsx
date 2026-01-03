import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Plus, Dumbbell, X } from 'lucide-react';
import { WorkoutTypeSelector } from './WorkoutTypeSelector';
import { EnergyRating } from './EnergyRating';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';

export interface ExerciseInput {
  exercise_name: string;
  exercise_id?: string;
  sets: string;
  reps: string;
  weight_kg: string;
  duration_seconds: string;
  rpe: string;
  notes: string;
}

export const emptyExercise: ExerciseInput = {
  exercise_name: '',
  sets: '',
  reps: '',
  weight_kg: '',
  duration_seconds: '',
  rpe: '',
  notes: '',
};

interface AddWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Form state
  isDetailedMode: boolean;
  setIsDetailedMode: (mode: boolean) => void;
  workoutDate: string;
  setWorkoutDate: (date: string) => void;
  workoutType: string | null;
  setWorkoutType: (type: string) => void;
  durationMinutes: string;
  setDurationMinutes: (duration: string) => void;
  workoutRpe: number | null;
  setWorkoutRpe: (rpe: number | null) => void;
  energyBefore: number | null;
  setEnergyBefore: (energy: number | null) => void;
  energyAfter: number | null;
  setEnergyAfter: (energy: number | null) => void;
  workoutNotes: string;
  setWorkoutNotes: (notes: string) => void;
  exercises: ExerciseInput[];
  setExercises: React.Dispatch<React.SetStateAction<ExerciseInput[]>>;
  // Mode indicators
  editingPlannedWorkoutId: string | null;
  editingExistingLogId: string | null;
  // Actions
  onSave: () => void;
  isSaving: boolean;
}

export function AddWorkoutDialog({
  open,
  onOpenChange,
  isDetailedMode,
  setIsDetailedMode,
  workoutDate,
  setWorkoutDate,
  workoutType,
  setWorkoutType,
  durationMinutes,
  setDurationMinutes,
  workoutRpe,
  setWorkoutRpe,
  energyBefore,
  setEnergyBefore,
  energyAfter,
  setEnergyAfter,
  workoutNotes,
  setWorkoutNotes,
  exercises,
  setExercises,
  editingPlannedWorkoutId,
  editingExistingLogId,
  onSave,
  isSaving,
}: AddWorkoutDialogProps) {
  const addExercise = () => {
    setExercises(prev => [...prev, { ...emptyExercise }]);
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof ExerciseInput, value: string) => {
    setExercises(prev => prev.map((ex, i) => 
      i === index ? { ...ex, [field]: value } : ex
    ));
  };

  const updateExerciseName = (index: number, name: string, exerciseId?: string) => {
    setExercises(prev => prev.map((ex, i) => 
      i === index ? { ...ex, exercise_name: name, exercise_id: exerciseId } : ex
    ));
  };

  const canSave = () => {
    if (isSaving) return false;
    if (isDetailedMode && !exercises.some(ex => ex.exercise_name.trim())) return false;
    if (!isDetailedMode && !editingExistingLogId && !workoutType) return false;
    return true;
  };

  const getSaveButtonText = () => {
    if (isSaving) return 'Ukládám...';
    if (editingPlannedWorkoutId) return 'Označit jako splněný';
    if (editingExistingLogId) return '✓ Uložit změny';
    return '✓ Uložit';
  };

  const getDialogTitle = () => {
    if (editingPlannedWorkoutId) return 'Splnit plánovaný trénink';
    if (editingExistingLogId) return 'Upravit trénink';
    return 'Nový trénink';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Mode - Simple Form */}
          {!isDetailedMode && !editingPlannedWorkoutId ? (
            <>
              {/* Workout Type */}
              <div className="space-y-2">
                <Label>Co jsi dělal/a?</Label>
                <WorkoutTypeSelector value={workoutType} onChange={setWorkoutType} />
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="quick-workout-date">Kdy?</Label>
                <Input
                  id="quick-workout-date"
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="workout-duration">Jak dlouho? (minuty)</Label>
                <Input
                  id="workout-duration"
                  type="number"
                  placeholder="45"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              {/* Energy after */}
              <EnergyRating 
                value={energyAfter} 
                onChange={setEnergyAfter}
                label="Jak se cítíš po tréninku?"
              />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="workout-notes">Poznámka (volitelné)</Label>
                <Textarea
                  id="workout-notes"
                  placeholder="Co šlo dobře? Co tě potěšilo?"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Toggle to detailed mode */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setIsDetailedMode(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Přidat cviky a více detailů
              </Button>
            </>
          ) : (
            /* Detailed Mode - Full Form */
            <>
              {/* Workout Type */}
              <div className="space-y-2">
                <Label>Typ tréninku</Label>
                <WorkoutTypeSelector value={workoutType} onChange={setWorkoutType} />
              </div>

              {/* Date and Duration */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="workout-date">Datum</Label>
                  <Input
                    id="workout-date"
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workout-duration">Délka (min)</Label>
                  <Input
                    id="workout-duration"
                    type="number"
                    placeholder="60"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>

              {/* Energy before/after */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EnergyRating 
                  value={energyBefore} 
                  onChange={setEnergyBefore}
                  label="Energie před"
                />
                <EnergyRating 
                  value={energyAfter} 
                  onChange={setEnergyAfter}
                  label="Pocit po"
                />
              </div>

              {/* RPE Slider */}
              <div className="space-y-3">
                <Label>Celková náročnost (RPE)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={workoutRpe ? [workoutRpe] : [5]}
                    onValueChange={(val) => setWorkoutRpe(val[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold w-8 text-center">{workoutRpe || 5}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  1 = velmi lehké, 10 = maximální úsilí
                </p>
              </div>

              {/* Exercises */}
              <div className="space-y-3">
                <Label>Cviky</Label>
                {exercises.map((ex, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-3 relative">
                    {exercises.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeExercise(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}

                    <ExerciseAutocomplete
                      value={ex.exercise_name}
                      onChange={(name, exerciseId) => updateExerciseName(idx, name, exerciseId)}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Série</Label>
                        <Input
                          type="number"
                          placeholder="3"
                          value={ex.sets}
                          onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Opakování</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={ex.reps}
                          onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Váha (kg)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="50"
                          value={ex.weight_kg}
                          onChange={(e) => updateExercise(idx, 'weight_kg', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Čas (min)</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={ex.duration_seconds}
                          onChange={(e) => updateExercise(idx, 'duration_seconds', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">RPE (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          placeholder="7"
                          value={ex.rpe}
                          onChange={(e) => updateExercise(idx, 'rpe', e.target.value)}
                        />
                      </div>
                    </div>

                    <Input
                      placeholder="Poznámka k cviku"
                      value={ex.notes}
                      onChange={(e) => updateExercise(idx, 'notes', e.target.value)}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addExercise}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat další cvik
                </Button>
              </div>

              {/* Workout Notes */}
              <div className="space-y-2">
                <Label htmlFor="workout-notes">Poznámky k tréninku</Label>
                <Textarea
                  id="workout-notes"
                  placeholder="Jak se cítíš? Co šlo dobře?"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Toggle back to quick mode */}
              {!editingPlannedWorkoutId && !editingExistingLogId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setIsDetailedMode(false)}
                >
                  Zpět na rychlý záznam
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={onSave} disabled={!canSave()}>
            {getSaveButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}