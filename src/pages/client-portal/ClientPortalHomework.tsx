import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAssignedWorkouts, useUpdateAssignedWorkoutStatus, AssignedWorkout } from '@/hooks/useAssignedWorkouts';
import { useClientPortalPlans, ClientPlanView } from '@/hooks/useClientPortalPlans';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Play, 
  SkipForward,
  Target,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const GOAL_LABELS: Record<string, string> = {
  strength: 'Síla',
  hypertrophy: 'Hypertrofie',
  endurance: 'Vytrvalost',
  ocr: 'OCR / Funkční',
  rehab: 'Rehabilitace',
  mixed: 'Kombinovaný',
};

const PHASE_LABELS: Record<string, string> = {
  base: 'Základní',
  build: 'Budovací',
  peak: 'Vrcholová',
  deload: 'Deload',
  rehab: 'Rehabilitační',
};

const STATUS_CONFIG: Record<AssignedWorkout['status'], { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Čeká', color: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'Probíhá', color: 'bg-accent/10 text-accent', icon: Play },
  completed: { label: 'Dokončeno', color: 'bg-success/10 text-success', icon: CheckCircle },
  skipped: { label: 'Přeskočeno', color: 'bg-warning/10 text-warning', icon: SkipForward },
};

function WorkoutCard({ workout, onUpdateStatus }: { 
  workout: AssignedWorkout; 
  onUpdateStatus: (id: string, status: AssignedWorkout['status'], notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(workout.clientNotes || '');
  
  const statusConfig = STATUS_CONFIG[workout.status];
  const StatusIcon = statusConfig.icon;
  const isOverdue = workout.dueDate && isPast(parseISO(workout.dueDate)) && workout.status === 'pending';
  const isScheduledToday = workout.scheduledFor && isToday(parseISO(workout.scheduledFor));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        "overflow-hidden",
        isScheduledToday && "ring-2 ring-primary",
        isOverdue && "ring-2 ring-destructive"
      )}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{workout.title}</h3>
              {workout.scheduledFor && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(workout.scheduledFor), 'd. MMMM', { locale: cs })}
                  {isScheduledToday && <Badge variant="default" className="ml-2 text-xs">Dnes</Badge>}
                </p>
              )}
            </div>
            <Badge className={cn("gap-1", statusConfig.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Description */}
          {workout.description && (
            <p className="text-sm text-muted-foreground mb-3">{workout.description}</p>
          )}

          {/* Exercises preview */}
          {workout.exercises.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Dumbbell className="w-4 h-4" />
                {workout.exercises.length} cviků
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1 pl-6">
                      {workout.exercises.map((ex: any, i: number) => (
                        <div key={i} className="text-sm py-1 border-b border-border/50 last:border-0">
                          <span className="font-medium">{ex.name || ex.exercise_name}</span>
                          {ex.sets && ex.reps && (
                            <span className="text-muted-foreground ml-2">
                              {ex.sets}×{ex.reps}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Trainer notes */}
          {workout.trainerNotes && (
            <div className="p-2 rounded-lg bg-muted/50 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Poznámka od trenéra:</p>
              <p className="text-sm">{workout.trainerNotes}</p>
            </div>
          )}

          {/* Actions */}
          {workout.status !== 'completed' && workout.status !== 'skipped' && (
            <div className="space-y-3 pt-3 border-t">
              <Textarea
                placeholder="Tvoje poznámky k tréninku..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                {workout.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateStatus(workout.id, 'in_progress', notes)}
                    className="gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Začít
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(workout.id, 'completed', notes)}
                  className="gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Dokončit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUpdateStatus(workout.id, 'skipped', notes)}
                  className="gap-1 text-muted-foreground"
                >
                  <SkipForward className="w-4 h-4" />
                  Přeskočit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PlanCard({ plan }: { plan: ClientPlanView }) {
  return (
    <Card className={cn(plan.isActive && "ring-2 ring-primary")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold">{plan.name}</h3>
          {plan.isActive && <Badge>Aktivní</Badge>}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="gap-1">
            <Target className="w-3 h-3" />
            {GOAL_LABELS[plan.primaryGoal] || plan.primaryGoal}
          </Badge>
          <Badge variant="outline">
            {PHASE_LABELS[plan.phase] || plan.phase}
          </Badge>
          <Badge variant="outline">
            {plan.daysPerWeek}× týdně
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {format(parseISO(plan.periodStart), 'd. MMM yyyy', { locale: cs })}
          {plan.periodEnd && ` – ${format(parseISO(plan.periodEnd), 'd. MMM yyyy', { locale: cs })}`}
        </p>

        {plan.notes && (
          <p className="text-sm mt-2 text-muted-foreground">{plan.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientPortalHomework() {
  const { clientId } = useClientPortal();
  const { data: workouts, isLoading: workoutsLoading } = useClientAssignedWorkouts(clientId ?? undefined);
  const { data: plans, isLoading: plansLoading } = useClientPortalPlans(clientId ?? undefined);
  const updateStatus = useUpdateAssignedWorkoutStatus();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_homework');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const handleUpdateStatus = (id: string, status: AssignedWorkout['status'], notes?: string) => {
    updateStatus.mutate({ id, status, clientNotes: notes });
  };

  const pendingWorkouts = workouts?.filter(w => w.status === 'pending' || w.status === 'in_progress') || [];
  const completedWorkouts = workouts?.filter(w => w.status === 'completed' || w.status === 'skipped') || [];
  const activePlan = plans?.find(p => p.isActive);

  if (workoutsLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Domácí tréninky</h1>
          <p className="text-muted-foreground">Tvoje zadané tréninky</p>
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Domácí tréninky</h1>
        <p className="text-muted-foreground">Tréninky od trenéra k samostatnému cvičení</p>
      </div>

      {/* Active Plan */}
      {activePlan && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Aktuální plán
          </h2>
          <PlanCard plan={activePlan} />
        </div>
      )}

      {/* Pending Workouts */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          K dokončení ({pendingWorkouts.length})
        </h2>
        
        {pendingWorkouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">Žádné čekající tréninky</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingWorkouts.map(workout => (
              <WorkoutCard 
                key={workout.id} 
                workout={workout} 
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Workouts */}
      {completedWorkouts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
            Dokončené ({completedWorkouts.length})
          </h2>
          <div className="space-y-2">
            {completedWorkouts.slice(0, 5).map(workout => (
              <div 
                key={workout.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <CheckCircle className="w-5 h-5 text-success" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{workout.title}</p>
                  {workout.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(workout.completedAt), 'd. MMM', { locale: cs })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Plans */}
      {plans && plans.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Všechny plány</h2>
          <div className="space-y-3">
            {plans.filter(p => !p.isActive).map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
