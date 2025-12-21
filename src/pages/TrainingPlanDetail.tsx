import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Target,
  Dumbbell,
  MoreVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  usePlanDetail,
  usePlanWeeks,
  usePlanDays,
  usePlanWorkouts,
  usePlanExercises,
  GOAL_OPTIONS,
  PHASE_OPTIONS,
  FOCUS_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  PlanWeek,
  PlanDay,
  PlanWorkout,
  PlanExercise,
} from '@/hooks/useTrainingPlans';
import { useClients } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GeneratePlanSheet } from '@/components/plans/GeneratePlanSheet';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function TrainingPlanDetail() {
  usePageTracking('training_plan_detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePlanDetail(id);
  const { data: clients = [] } = useClients();
  const { exercises } = useExercises();
  const { createWeek, deleteWeek } = usePlanWeeks(id);
  const { createDay } = usePlanDays(id);
  const { createWorkout, deleteWorkout } = usePlanWorkouts(id);
  const { createExercise, updateExercise, deleteExercise } = usePlanExercises(id);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showAddWorkout, setShowAddWorkout] = useState<string | null>(null);
  const [showAddExercise, setShowAddExercise] = useState<string | null>(null);
  const [showGenerateSheet, setShowGenerateSheet] = useState(false);
  const [newWorkout, setNewWorkout] = useState({ name: '', type: 'strength', duration: 60 });
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    exercise_name: '',
    target_sets: 3,
    target_reps_min: 8,
    target_reps_max: 12,
    target_rpe: 7,
    rest_seconds: 90,
    progression_type: 'load',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Plán nenalezen</p>
        <Button variant="link" onClick={() => navigate('/training-plans')}>
          Zpět na seznam
        </Button>
      </div>
    );
  }

  const { plan, weeks, days, workouts, exercises: planExercises } = data;
  const client = clients.find((c) => c.id === plan.client_id);

  const getGoalLabel = (value: string) => GOAL_OPTIONS.find((o) => o.value === value)?.label || value;
  const getPhaseLabel = (value: string) => PHASE_OPTIONS.find((o) => o.value === value)?.label || value;
  const getFocusLabel = (value: string) => FOCUS_OPTIONS.find((o) => o.value === value)?.label || value;

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  };

  const handleAddWeek = async () => {
    const nextWeekNumber = weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) + 1 : 1;
    await createWeek.mutateAsync({
      training_plan_id: plan.id,
      week_number: nextWeekNumber,
      focus_note: null,
      deload_flag: false,
    });
  };

  const handleAddDay = async (weekId: string) => {
    const weekDays = days.filter((d) => d.plan_week_id === weekId);
    const nextDayNumber = weekDays.length > 0 ? Math.max(...weekDays.map((d) => d.day_number)) + 1 : 1;
    await createDay.mutateAsync({
      plan_week_id: weekId,
      day_number: nextDayNumber,
      intended_focus: null,
      optional_flag: false,
    });
  };

  const handleAddWorkout = async () => {
    if (!showAddWorkout || !newWorkout.name) return;
    await createWorkout.mutateAsync({
      plan_day_id: showAddWorkout,
      workout_name: newWorkout.name,
      workout_type: newWorkout.type,
      estimated_duration: newWorkout.duration,
      notes: null,
      sort_order: 0,
    });
    setShowAddWorkout(null);
    setNewWorkout({ name: '', type: 'strength', duration: 60 });
  };

  const handleAddExercise = async () => {
    if (!showAddExercise || !newExercise.exercise_name) return;
    await createExercise.mutateAsync({
      plan_workout_id: showAddExercise,
      exercise_id: newExercise.exercise_id || null,
      exercise_name: newExercise.exercise_name,
      target_sets: newExercise.target_sets,
      target_reps_min: newExercise.target_reps_min,
      target_reps_max: newExercise.target_reps_max,
      target_rpe: newExercise.target_rpe,
      target_rir: null,
      tempo: null,
      rest_seconds: newExercise.rest_seconds,
      progression_type: newExercise.progression_type,
      alternative_exercise_id: null,
      notes: null,
      sort_order: 0,
    });
    setShowAddExercise(null);
    setNewExercise({
      exercise_id: '',
      exercise_name: '',
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
      target_rpe: 7,
      rest_seconds: 90,
      progression_type: 'load',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/training-plans')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
          <p className="text-muted-foreground text-sm">{client?.name}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setShowGenerateSheet(true)}>
          <Sparkles className="w-4 h-4" />
          Generovat plán
        </Button>
      </div>

      {/* Plan Info */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cíl</p>
              <Badge variant="secondary">{getGoalLabel(plan.primary_goal)}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fáze</p>
              <Badge variant="outline">{getPhaseLabel(plan.phase)}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Období</p>
              <p className="text-sm">
                {format(new Date(plan.period_start), 'd. M. yyyy', { locale: cs })}
                {plan.period_end && ` - ${format(new Date(plan.period_end), 'd. M. yyyy', { locale: cs })}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Frekvence</p>
              <p className="text-sm">{plan.days_per_week}× týdně</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weeks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Týdny</h2>
          <Button onClick={handleAddWeek} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Přidat týden
          </Button>
        </div>

        {weeks.length === 0 ? (
          <Card className="glass">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Zatím žádné týdny</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {weeks.map((week) => {
              const weekDays = days.filter((d) => d.plan_week_id === week.id);
              const isExpanded = expandedWeeks.has(week.id);

              return (
                <Collapsible key={week.id} open={isExpanded} onOpenChange={() => toggleWeek(week.id)}>
                  <Card className="glass">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <CardTitle className="text-base">
                              Týden {week.week_number}
                              {week.deload_flag && (
                                <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500/50">
                                  Deload
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {weekDays.length} {weekDays.length === 1 ? 'den' : 'dnů'}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAddDay(week.id)}>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Přidat den
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteWeek.mutate(week.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Smazat týden
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        {weekDays.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-2">Žádné dny</p>
                            <Button variant="outline" size="sm" onClick={() => handleAddDay(week.id)}>
                              <Plus className="w-4 h-4 mr-1" />
                              Přidat den
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {weekDays.map((day) => {
                              const dayWorkouts = workouts.filter((w) => w.plan_day_id === day.id);

                              return (
                                <div key={day.id} className="border border-border/50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">Den {day.day_number}</span>
                                      {day.intended_focus && (
                                        <Badge variant="secondary" className="text-xs">
                                          {getFocusLabel(day.intended_focus)}
                                        </Badge>
                                      )}
                                      {day.optional_flag && (
                                        <Badge variant="outline" className="text-xs">
                                          Volitelný
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowAddWorkout(day.id)}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Trénink
                                    </Button>
                                  </div>

                                  {dayWorkouts.length > 0 && (
                                    <div className="space-y-2">
                                      {dayWorkouts.map((workout) => {
                                        const workoutExercises = planExercises.filter(
                                          (e) => e.plan_workout_id === workout.id
                                        );

                                        return (
                                          <div
                                            key={workout.id}
                                            className="bg-accent/30 rounded-md p-2"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium">
                                                  {workout.workout_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  {workout.estimated_duration} min
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={() => setShowAddExercise(workout.id)}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 text-destructive"
                                                  onClick={() => deleteWorkout.mutate(workout.id)}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>

                                            {workoutExercises.length > 0 && (
                                              <div className="space-y-1">
                                                {workoutExercises.map((ex) => (
                                                  <div
                                                    key={ex.id}
                                                    className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1"
                                                  >
                                                    <span>{ex.exercise_name}</span>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                      <span>
                                                        {ex.target_sets}×
                                                        {ex.target_reps_min}
                                                        {ex.target_reps_max && ex.target_reps_max !== ex.target_reps_min
                                                          ? `-${ex.target_reps_max}`
                                                          : ''}
                                                      </span>
                                                      {ex.target_rpe && (
                                                        <Tooltip>
                                                          <TooltipTrigger>
                                                            <span className="text-primary">
                                                              RPE {ex.target_rpe}
                                                            </span>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            Cílové RPE
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      )}
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 text-destructive"
                                                        onClick={() => deleteExercise.mutate(ex.id)}
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Workout Dialog */}
      <Dialog open={!!showAddWorkout} onOpenChange={() => setShowAddWorkout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat trénink</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Název tréninku</Label>
              <Input
                value={newWorkout.name}
                onChange={(e) => setNewWorkout((p) => ({ ...p, name: e.target.value }))}
                placeholder="např. Silový trénink A"
              />
            </div>
            <div>
              <Label>Typ</Label>
              <Select
                value={newWorkout.type}
                onValueChange={(v) => setNewWorkout((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Odhadovaná délka (min)</Label>
              <Input
                type="number"
                value={newWorkout.duration}
                onChange={(e) => setNewWorkout((p) => ({ ...p, duration: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWorkout(null)}>
              Zrušit
            </Button>
            <Button onClick={handleAddWorkout}>Přidat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={!!showAddExercise} onOpenChange={() => setShowAddExercise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat cvik</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cvik</Label>
              <Select
                value={newExercise.exercise_id}
                onValueChange={(v) => {
                  const ex = exercises.find((e) => e.id === v);
                  setNewExercise((p) => ({
                    ...p,
                    exercise_id: v,
                    exercise_name: ex?.name || '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cvik" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Série</Label>
                <Input
                  type="number"
                  value={newExercise.target_sets}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, target_sets: parseInt(e.target.value) || 3 }))
                  }
                />
              </div>
              <div>
                <Label>Opak. min</Label>
                <Input
                  type="number"
                  value={newExercise.target_reps_min}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, target_reps_min: parseInt(e.target.value) || 8 }))
                  }
                />
              </div>
              <div>
                <Label>Opak. max</Label>
                <Input
                  type="number"
                  value={newExercise.target_reps_max}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, target_reps_max: parseInt(e.target.value) || 12 }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cílové RPE</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newExercise.target_rpe}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, target_rpe: parseInt(e.target.value) || 7 }))
                  }
                />
              </div>
              <div>
                <Label>Odpočinek (s)</Label>
                <Input
                  type="number"
                  value={newExercise.rest_seconds}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, rest_seconds: parseInt(e.target.value) || 90 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Typ progrese</Label>
              <Select
                value={newExercise.progression_type}
                onValueChange={(v) => setNewExercise((p) => ({ ...p, progression_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="load">Zátěž (+kg)</SelectItem>
                  <SelectItem value="reps">Opakování (+rep)</SelectItem>
                  <SelectItem value="density">Hustota</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExercise(null)}>
              Zrušit
            </Button>
            <Button onClick={handleAddExercise}>Přidat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Plan Sheet */}
      <GeneratePlanSheet
        open={showGenerateSheet}
        onOpenChange={setShowGenerateSheet}
        planId={plan.id}
        hasExistingContent={weeks.length > 0}
        currentWeeksCount={4}
        currentDaysPerWeek={plan.days_per_week}
        currentGoal={plan.primary_goal}
        currentEquipment={plan.equipment || []}
      />
    </div>
  );
}
