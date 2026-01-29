import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCareerMilestones } from '@/hooks/useCareerMilestones';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Trophy, Target, CheckCircle2, Dumbbell, Users, Banknote, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const TYPE_ICONS: Record<string, React.ElementType> = {
  trainings: Dumbbell,
  clients: Users,
  income: Banknote,
  hours: Clock,
};

const TYPE_COLORS: Record<string, string> = {
  trainings: 'text-primary',
  clients: 'text-accent',
  income: 'text-emerald-500',
  hours: 'text-warning',
};

export function CareerMilestonesTimeline() {
  const { data, isLoading } = useCareerMilestones();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Get last 5 reached milestones (most recent first)
  const reachedMilestones = data.milestones
    .filter(m => m.isReached)
    .slice(-5)
    .reverse();

  // Calculate progress to next milestone
  const nextMilestone = data.nextMilestone;
  let progressPercent = 0;
  let progressCurrent = 0;

  if (nextMilestone) {
    switch (nextMilestone.type) {
      case 'trainings':
        progressCurrent = data.currentStats.trainings;
        break;
      case 'clients':
        progressCurrent = data.currentStats.clients;
        break;
      case 'income':
        progressCurrent = data.currentStats.income;
        break;
      case 'hours':
        progressCurrent = data.currentStats.hours;
        break;
    }
    progressPercent = Math.min(100, (progressCurrent / nextMilestone.value) * 100);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Kariérní milníky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next milestone progress */}
        {nextMilestone && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Další cíl: {nextMilestone.label}</p>
                <p className="text-xs text-muted-foreground">
                  Chybí: {nextMilestone.type === 'income' 
                    ? formatCurrency(nextMilestone.value - progressCurrent, false)
                    : `${nextMilestone.value - progressCurrent}`
                  }
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>
                {nextMilestone.type === 'income' 
                  ? formatCurrency(progressCurrent, false)
                  : progressCurrent.toLocaleString('cs-CZ')
                }
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Reached milestones timeline */}
        {reachedMilestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Dosažené milníky
            </p>
            <div className="space-y-1">
              {reachedMilestones.map((milestone) => {
                const Icon = TYPE_ICONS[milestone.type] || Trophy;
                const colorClass = TYPE_COLORS[milestone.type] || 'text-muted-foreground';
                
                return (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <Icon className={cn("h-4 w-4", colorClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{milestone.label}</p>
                    </div>
                    {milestone.reachedAt && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {milestone.reachedAt}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* First training date */}
        {data.firstTrainingDate && (
          <p className="text-xs text-muted-foreground text-center border-t pt-3">
            Kariéra začala: {formatDate(data.firstTrainingDate, 'long')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
