import { useState } from 'react';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  GenerationParams,
  GOAL_OPTIONS_EXTENDED,
  LEVEL_OPTIONS,
  EQUIPMENT_OPTIONS,
  DURATION_OPTIONS,
  SPLIT_OPTIONS,
  FOCUS_AREAS,
  PAIN_AREAS,
  PlanGoal,
  ClientLevel,
  TrainingSplit,
} from '@/lib/planGenerator/types';
import { generatePlan } from '@/lib/planGenerator/templates';
import { usePlanWeeks, usePlanDays, usePlanWorkouts, usePlanExercises } from '@/hooks/useTrainingPlans';
import { useToast } from '@/hooks/use-toast';

interface GeneratePlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  hasExistingContent: boolean;
  currentWeeksCount: number;
  currentDaysPerWeek: number;
  currentGoal: string;
  currentEquipment: string[];
}

export function GeneratePlanSheet({
  open,
  onOpenChange,
  planId,
  hasExistingContent,
  currentWeeksCount,
  currentDaysPerWeek,
  currentGoal,
  currentEquipment,
}: GeneratePlanSheetProps) {
  const { toast } = useToast();
  const { createWeek, deleteWeek } = usePlanWeeks(planId);
  const { createDay } = usePlanDays(planId);
  const { createWorkout } = usePlanWorkouts(planId);
  const { createExercise } = usePlanExercises(planId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  
  const [params, setParams] = useState<GenerationParams>({
    goal: (currentGoal as PlanGoal) || 'strength',
    sessionsPerWeek: currentDaysPerWeek || 3,
    weeksCount: currentWeeksCount || 4,
    level: 'intermediate',
    equipment: currentEquipment.length > 0 ? currentEquipment : ['barbell', 'dumbbell', 'bodyweight'],
    sessionDuration: 60,
    split: 'full_body',
    focusAreas: [],
    painAreas: [],
    painNotes: '',
    conditioningFrequency: 0,
  });

  const handleEquipmentToggle = (value: string) => {
    setParams(prev => ({
      ...prev,
      equipment: prev.equipment.includes(value)
        ? prev.equipment.filter(e => e !== value)
        : [...prev.equipment, value],
    }));
  };

  const handleFocusToggle = (value: string) => {
    setParams(prev => ({
      ...prev,
      focusAreas: prev.focusAreas?.includes(value)
        ? prev.focusAreas.filter(f => f !== value)
        : [...(prev.focusAreas || []), value],
    }));
  };

  const handlePainToggle = (value: string) => {
    setParams(prev => ({
      ...prev,
      painAreas: prev.painAreas?.includes(value)
        ? prev.painAreas.filter(p => p !== value)
        : [...(prev.painAreas || []), value],
    }));
  };

  const handleGenerate = async () => {
    if (hasExistingContent) {
      setShowOverwriteDialog(true);
      return;
    }
    await executeGeneration();
  };

  const executeGeneration = async () => {
    setIsGenerating(true);
    setShowOverwriteDialog(false);

    try {
      // Generate the plan structure
      const generatedPlan = generatePlan(params);
      
      // Create weeks, days, workouts, exercises in sequence
      for (const week of generatedPlan.weeks) {
        const weekResult = await createWeek.mutateAsync({
          training_plan_id: planId,
          week_number: week.week_number,
          focus_note: week.focus_note || null,
          deload_flag: week.is_deload,
        });

        for (const day of week.days) {
          const dayResult = await createDay.mutateAsync({
            plan_week_id: weekResult.id,
            day_number: day.day_number,
            intended_focus: day.focus || null,
            optional_flag: false,
          });

          for (const workout of day.workouts) {
            const workoutResult = await createWorkout.mutateAsync({
              plan_day_id: dayResult.id,
              workout_name: workout.name,
              workout_type: params.goal === 'conditioning' ? 'conditioning' : 'strength',
              estimated_duration: workout.estimated_duration,
              notes: workout.focus,
              sort_order: 0,
            });

            for (const exercise of workout.exercises) {
              await createExercise.mutateAsync({
                plan_workout_id: workoutResult.id,
                exercise_id: null,
                exercise_name: exercise.exercise_name,
                target_sets: exercise.sets,
                target_reps_min: exercise.reps_min,
                target_reps_max: exercise.reps_max,
                target_rpe: exercise.rpe || null,
                target_rir: exercise.rir || null,
                tempo: exercise.tempo || null,
                rest_seconds: exercise.rest_seconds,
                progression_type: 'load',
                alternative_exercise_id: null,
                notes: exercise.notes || null,
                sort_order: exercise.sort_order,
              });
            }
          }
        }
      }

      toast({
        title: 'Plán vygenerován',
        description: `Vytvořeno ${generatedPlan.weeks.length} týdnů s ${params.sessionsPerWeek} tréninky týdně.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Chyba generování',
        description: 'Nepodařilo se vygenerovat plán. Zkuste to znovu.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generovat tréninkový plán
            </SheetTitle>
            <SheetDescription>
              Nastavte parametry a vygenerujte profesionální tréninkový plán
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 py-4">
              {/* Goal */}
              <div className="space-y-2">
                <Label>Cíl plánu *</Label>
                <Select
                  value={params.goal}
                  onValueChange={(v) => setParams(p => ({ ...p, goal: v as PlanGoal }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS_EXTENDED.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sessions per week */}
              <div className="space-y-2">
                <Label>Tréninky za týden *</Label>
                <Select
                  value={params.sessionsPerWeek.toString()}
                  onValueChange={(v) => setParams(p => ({ ...p, sessionsPerWeek: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}× týdně
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Weeks count */}
              <div className="space-y-2">
                <Label>Délka plánu *</Label>
                <Select
                  value={params.weeksCount.toString()}
                  onValueChange={(v) => setParams(p => ({ ...p, weeksCount: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 6, 8, 10, 12].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} týdnů
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level */}
              <div className="space-y-2">
                <Label>Úroveň klienta *</Label>
                <Select
                  value={params.level}
                  onValueChange={(v) => setParams(p => ({ ...p, level: v as ClientLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session duration */}
              <div className="space-y-2">
                <Label>Délka tréninku *</Label>
                <Select
                  value={params.sessionDuration.toString()}
                  onValueChange={(v) => setParams(p => ({ ...p, sessionDuration: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Split preference */}
              {params.sessionsPerWeek >= 4 && (
                <div className="space-y-2">
                  <Label>Preference rozložení</Label>
                  <Select
                    value={params.split || 'full_body'}
                    onValueChange={(v) => setParams(p => ({ ...p, split: v as TrainingSplit }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Equipment */}
              <div className="space-y-2">
                <Label>Dostupné vybavení *</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={params.equipment.includes(opt.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleEquipmentToggle(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Focus areas (optional) */}
              <div className="space-y-2">
                <Label>Prioritní partie (volitelné)</Label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={params.focusAreas?.includes(opt.value) ? 'secondary' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleFocusToggle(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Pain areas (optional) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Omezení / bolesti (volitelné)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_AREAS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={params.painAreas?.includes(opt.value) ? 'destructive' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handlePainToggle(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
                {params.painAreas && params.painAreas.length > 0 && (
                  <Textarea
                    value={params.painNotes || ''}
                    onChange={(e) => setParams(p => ({ ...p, painNotes: e.target.value }))}
                    placeholder="Upřesnění omezení..."
                    rows={2}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Conditioning frequency for strength/hypertrophy */}
              {['strength', 'hypertrophy'].includes(params.goal) && (
                <div className="space-y-2">
                  <Label>Frekvence kondice (týdně)</Label>
                  <Select
                    value={(params.conditioningFrequency || 0).toString()}
                    onValueChange={(v) => setParams(p => ({ ...p, conditioningFrequency: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Žádná</SelectItem>
                      <SelectItem value="1">1× (nízká)</SelectItem>
                      <SelectItem value="2">2× (střední)</SelectItem>
                      <SelectItem value="3">3× (vysoká)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Zrušit
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || params.equipment.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generuji...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generovat plán
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Overwrite confirmation */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plán již obsahuje data</AlertDialogTitle>
            <AlertDialogDescription>
              Tento plán již obsahuje týdny a cviky. Generováním nového plánu přidáte nový obsah k existujícímu.
              Pro úplné přepsání nejprve smažte existující týdny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={executeGeneration}>
              Přidat nový obsah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
