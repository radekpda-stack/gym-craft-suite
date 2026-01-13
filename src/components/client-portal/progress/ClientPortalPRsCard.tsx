import { Trophy, Dumbbell, Timer, Repeat, TrendingUp, Zap, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientPRs } from '@/hooks/useClientPRs';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type MetricType = 'weight' | 'time' | 'reps' | 'distance' | 'power' | 'score';

function getMetricIcon(metricType: MetricType) {
  switch (metricType) {
    case 'weight':
      return Dumbbell;
    case 'time':
      return Timer;
    case 'reps':
      return Repeat;
    case 'distance':
      return Ruler;
    case 'power':
      return Zap;
    default:
      return TrendingUp;
  }
}

function getMetricColor(metricType: MetricType) {
  switch (metricType) {
    case 'weight':
      return "bg-accent/20 text-accent";
    case 'time':
      return "bg-success/20 text-success";
    case 'reps':
      return "bg-primary/20 text-primary";
    case 'distance':
      return "bg-warning/20 text-warning";
    case 'power':
      return "bg-warning/20 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function PRItem({ 
  name, 
  value, 
  metricType, 
  achievedAt 
}: { 
  name: string; 
  value: string; 
  metricType: MetricType; 
  achievedAt: string;
}) {
  const Icon = getMetricIcon(metricType);
  const colorClass = getMetricColor(metricType);
  
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2 rounded-lg flex-shrink-0", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(achievedAt), 'd. MMM yyyy', { locale: cs })}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className={cn("font-bold text-sm flex-shrink-0", colorClass.replace('/20', '/10'))}>
        {value}
      </Badge>
    </div>
  );
}

export function ClientPortalPRsCard() {
  const { clientId } = useClientPortal();
  
  // Fetch from client_prs table (challenge/predefined PRs)
  const { data: clientPRs, isLoading: prsLoading } = useClientPRs(clientId ?? undefined);
  // Fetch from exercise_entries (workout PRs)
  const { data: exercisePRs, isLoading: exerciseLoading } = useClientExercisePRs(clientId);

  const isLoading = prsLoading || exerciseLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Combine PRs from both sources
  const allPRs: Array<{
    id: string;
    name: string;
    value: string;
    metricType: MetricType;
    achievedAt: string;
    sortDate: Date;
  }> = [];

  // Add predefined PRs (from challenges, etc.)
  if (clientPRs) {
    for (const pr of clientPRs) {
      if (pr.pr_definitions) {
        allPRs.push({
          id: pr.id,
          name: pr.pr_definitions.name,
          value: pr.best_display,
          metricType: pr.pr_definitions.metric_type as MetricType,
          achievedAt: pr.achieved_at,
          sortDate: new Date(pr.achieved_at),
        });
      }
    }
  }

  // Add exercise PRs
  if (exercisePRs) {
    for (const pr of exercisePRs) {
      allPRs.push({
        id: pr.id,
        name: pr.exerciseName,
        value: pr.bestDisplay,
        metricType: pr.metricType as MetricType,
        achievedAt: pr.achievedAt,
        sortDate: new Date(pr.achievedAt),
      });
    }
  }

  // Sort by date (newest first)
  allPRs.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  if (allPRs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Moje osobní rekordy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Zatím nemáš žádné zaznamenané rekordy. Pokračuj v tréninku! 💪
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Moje osobní rekordy
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {allPRs.length} {allPRs.length === 1 ? 'rekord' : allPRs.length < 5 ? 'rekordy' : 'rekordů'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tvé nejlepší výkony u jednotlivých cviků. Překonej sám sebe!
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {allPRs.map((pr) => (
          <PRItem 
            key={pr.id} 
            name={pr.name}
            value={pr.value}
            metricType={pr.metricType}
            achievedAt={pr.achievedAt}
          />
        ))}
      </CardContent>
    </Card>
  );
}
