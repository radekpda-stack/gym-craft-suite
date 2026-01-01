import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientWorkoutLogs, useCreateWorkoutLog, useDeleteWorkoutLog, WorkoutExercise } from '@/hooks/useClientWorkoutLogs';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Plus, 
  Dumbbell, 
  Calendar, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Target,
  MessageSquare,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ExerciseInput {
  exercise_name: string;
  sets: string;
  reps: string;
  weight_kg: string;
  duration_seconds: string;
  rpe: string;
  notes: string;
}

const emptyExercise: ExerciseInput = {
  exercise_name: '',
  sets: '',
  reps: '',
  weight_kg: '',
  duration_seconds: '',
  rpe: '',
  notes: '',
};

export default function ClientPortalWorkoutDiary() {
  const { clientId, clientProfile, clientAccount } = useClientPortal();
  const { data: logs, isLoading } = useClientWorkoutLogs(clientId);
  const createLog = useCreateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_workout_diary');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([{ ...emptyExercise }]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

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

  const handleSaveWorkout = async () => {
    if (!clientId || !clientAccount?.trainer_id) return;

    const validExercises = exercises
      .filter(ex => ex.exercise_name.trim())
      .map((ex, idx) => ({
        exercise_name: ex.exercise_name.trim(),
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps ? parseInt(ex.reps) : null,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        duration_seconds: ex.duration_seconds ? parseInt(ex.duration_seconds) * 60 : null,
        rpe: ex.rpe ? parseInt(ex.rpe) : null,
        notes: ex.notes || null,
        sort_order: idx,
      }));

    if (validExercises.length === 0) {
      return;
    }

    await createLog.mutateAsync({
      client_id: clientId,
      trainer_id: clientAccount.trainer_id,
      date: workoutDate,
      notes: workoutNotes || undefined,
      exercises: validExercises,
    });

    trackPortalEvent('workout_logged', { exercise_count: validExercises.length });

    // Reset form
    setDialogOpen(false);
    setWorkoutDate(format(new Date(), 'yyyy-MM-dd'));
    setWorkoutNotes('');
    setExercises([{ ...emptyExercise }]);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!clientId) return;
    await deleteLog.mutateAsync({ logId, clientId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tréninkový deník</h1>
          <p className="text-muted-foreground text-sm">
            Zaznamenávejte své tréninky mimo fitko
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat trénink
        </Button>
      </div>

      {/* Workout Logs */}
      {logs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">Zatím žádné záznamy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Začněte zaznamenávat své tréninky
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Přidat první trénink
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs?.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const exerciseCount = log.exercises?.length || 0;
            const totalSets = log.exercises?.reduce((sum, ex) => sum + (ex.sets || 0), 0) || 0;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleLogExpanded(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(parseISO(log.date), 'EEEE d. MMMM', { locale: cs })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{exerciseCount} cviků</span>
                            <span>•</span>
                            <span>{totalSets} sérií</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 border-t pt-4 space-y-3">
                          {log.notes && (
                            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                              <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                              <span>{log.notes}</span>
                            </div>
                          )}

                          {log.exercises?.map((ex, idx) => (
                            <div
                              key={ex.id || idx}
                              className="p-3 bg-secondary/30 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{ex.exercise_name}</span>
                                {ex.rpe && (
                                  <Badge variant="outline" className="text-xs">
                                    RPE {ex.rpe}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                {ex.sets && (
                                  <span className="flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5" />
                                    {ex.sets} sérií
                                  </span>
                                )}
                                {ex.reps && (
                                  <span>{ex.reps} opakování</span>
                                )}
                                {ex.weight_kg && (
                                  <span className="font-medium text-foreground">
                                    {ex.weight_kg} kg
                                  </span>
                                )}
                                {ex.duration_seconds && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {Math.round(ex.duration_seconds / 60)} min
                                  </span>
                                )}
                              </div>
                              {ex.notes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Workout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Nový trénink
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="workout-date">Datum</Label>
              <Input
                id="workout-date"
                type="date"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
              />
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

                  <Input
                    placeholder="Název cviku *"
                    value={ex.exercise_name}
                    onChange={(e) => updateExercise(idx, 'exercise_name', e.target.value)}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleSaveWorkout}
              disabled={createLog.isPending || !exercises.some(ex => ex.exercise_name.trim())}
            >
              {createLog.isPending ? 'Ukládám...' : 'Uložit trénink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
