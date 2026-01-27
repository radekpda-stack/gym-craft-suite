import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RxWorkout, RxScoringMode, RxWorkoutExercise } from '@/hooks/useRxWorkouts';
import { useUpdateRxWorkout } from '@/hooks/useRxWorkoutsV2';
import { 
  Loader2, 
  Pencil, 
  GripVertical, 
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface RxWorkoutEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: RxWorkout;
}

interface EditableExercise {
  id: string;
  exercise_name: string;
  reps_min: number | null;
  rx_distance_m: number | null;
  rx_weight_kg: number | null;
  incline_percent: number | null;
  damper_resistance: number | null;
  speed_setting: string | null;
  load_format: string | null;
  time_seconds: number | null;
  notes: string | null;
  sort_order: number;
}

export function RxWorkoutEditDialog({ open, onOpenChange, workout }: RxWorkoutEditDialogProps) {
  const updateWorkout = useUpdateRxWorkout();
  
  const [name, setName] = useState(workout.name);
  const [description, setDescription] = useState(workout.description || '');
  const [scoringMode, setScoringMode] = useState<RxScoringMode>(
    (workout.scoring_mode || 'for_time') as RxScoringMode
  );
  const [rounds, setRounds] = useState(workout.rounds || 1);
  const [timeCap, setTimeCap] = useState(
    workout.time_cap_seconds ? Math.floor(workout.time_cap_seconds / 60) : 0
  );
  const [exercises, setExercises] = useState<EditableExercise[]>([]);

  useEffect(() => {
    if (open && workout.exercises) {
      setExercises(
        workout.exercises
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ex) => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            reps_min: ex.reps_min,
            rx_distance_m: ex.rx_distance_m,
            rx_weight_kg: ex.rx_weight_kg,
            incline_percent: (ex as any).incline_percent || null,
            damper_resistance: (ex as any).damper_resistance || null,
            speed_setting: (ex as any).speed_setting || null,
            load_format: (ex as any).load_format || null,
            time_seconds: ex.time_seconds,
            notes: ex.notes,
            sort_order: ex.sort_order,
          }))
      );
    }
  }, [open, workout]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Název je povinný');
      return;
    }

    try {
      await updateWorkout.mutateAsync({
        workoutId: workout.id,
        template: {
          name,
          description: description || null,
          scoring_mode: scoringMode,
          rounds,
          time_cap_seconds: timeCap > 0 ? timeCap * 60 : null,
        },
        exercises: exercises.map((ex, idx) => ({
          ...ex,
          sort_order: idx,
        })),
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const updateExercise = (index: number, updates: Partial<EditableExercise>) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === exercises.length - 1)
    ) {
      return;
    }

    setExercises(prev => {
      const updated = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const addExercise = () => {
    const newExercise: EditableExercise = {
      id: `new-${Date.now()}`,
      exercise_name: 'Nový cvik',
      reps_min: null,
      rx_distance_m: null,
      rx_weight_kg: null,
      incline_percent: null,
      damper_resistance: null,
      speed_setting: null,
      load_format: null,
      time_seconds: null,
      notes: null,
      sort_order: exercises.length,
    };
    setExercises(prev => [...prev, newExercise]);
  };

  const scoringModeLabels: Record<RxScoringMode, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_load: 'Max Load',
    rounds_reps: 'Rounds + Reps',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Upravit workout
          </DialogTitle>
          <DialogDescription>
            Upravte parametry RX workoutu
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Název</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Název workoutu"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Popis</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Popis workoutu..."
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Typ hodnocení</Label>
                <Select 
                  value={scoringMode} 
                  onValueChange={(v) => setScoringMode(v as RxScoringMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(scoringModeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Počet kol</Label>
                <Input
                  type="number"
                  min={1}
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time Cap (min)</Label>
                <Input
                  type="number"
                  min={0}
                  value={timeCap}
                  onChange={(e) => setTimeCap(parseInt(e.target.value) || 0)}
                  placeholder="0 = bez limitu"
                />
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Cviky</Label>
                <Button variant="outline" size="sm" onClick={addExercise}>
                  <Plus className="h-4 w-4 mr-1" />
                  Přidat
                </Button>
              </div>

              <div className="space-y-2">
                {exercises.map((ex, index) => (
                  <div 
                    key={ex.id} 
                    className="border rounded-lg p-3 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <Input
                        value={ex.exercise_name}
                        onChange={(e) => updateExercise(index, { exercise_name: e.target.value })}
                        className="flex-1"
                        placeholder="Název cviku"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveExercise(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveExercise(index, 'down')}
                        disabled={index === exercises.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExercise(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 ml-8">
                      <div className="space-y-1">
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          value={ex.reps_min || ''}
                          onChange={(e) => updateExercise(index, { 
                            reps_min: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          placeholder="-"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vzdálenost (m)</Label>
                        <Input
                          type="number"
                          value={ex.rx_distance_m || ''}
                          onChange={(e) => updateExercise(index, { 
                            rx_distance_m: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          placeholder="-"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Váha (kg)</Label>
                        <Input
                          type="number"
                          value={ex.rx_weight_kg || ''}
                          onChange={(e) => updateExercise(index, { 
                            rx_weight_kg: e.target.value ? parseFloat(e.target.value) : null 
                          })}
                          placeholder="-"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Load format</Label>
                        <Input
                          value={ex.load_format || ''}
                          onChange={(e) => updateExercise(index, { 
                            load_format: e.target.value || null 
                          })}
                          placeholder="2x8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sklon (%)</Label>
                        <Input
                          type="number"
                          value={ex.incline_percent || ''}
                          onChange={(e) => updateExercise(index, { 
                            incline_percent: e.target.value ? parseFloat(e.target.value) : null 
                          })}
                          placeholder="-"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Damper</Label>
                        <Input
                          type="number"
                          value={ex.damper_resistance || ''}
                          onChange={(e) => updateExercise(index, { 
                            damper_resistance: e.target.value ? parseInt(e.target.value) : null 
                          })}
                          placeholder="-"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Rychlost</Label>
                        <Input
                          value={ex.speed_setting || ''}
                          onChange={(e) => updateExercise(index, { 
                            speed_setting: e.target.value || null 
                          })}
                          placeholder="individual"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={updateWorkout.isPending}>
            {updateWorkout.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
