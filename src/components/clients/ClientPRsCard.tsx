import { useState } from 'react';
import { Trophy, Dumbbell, Timer, Repeat, TrendingUp, Zap, Ruler, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { ExerciseHistorySheet } from '@/components/training-mode/ExerciseHistorySheet';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientPRsCardProps {
  clientId: string;
  clientName?: string;
}

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
  achievedAt,
  onClick
}: { 
  name: string; 
  value: string; 
  metricType: MetricType; 
  achievedAt: string;
  onClick?: () => void;
}) {
  const Icon = getMetricIcon(metricType);
  const colorClass = getMetricColor(metricType);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-left group",
        "bg-card/60 backdrop-blur-sm border border-border/30 shadow-sm",
        "hover:bg-secondary/50 hover:-translate-y-0.5 hover:shadow-md",
        "transition-all duration-200"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2 rounded-lg flex-shrink-0 shadow-sm", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(achievedAt), 'd. MMM yyyy', { locale: cs })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="secondary" className={cn("font-bold text-sm tabular-nums shadow-sm", colorClass.replace('/20', '/10'))}>
          {value}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

export function ClientPRsCard({ clientId, clientName }: ClientPRsCardProps) {
  const [selectedPR, setSelectedPR] = useState<ExercisePR | null>(null);
  
  // Fetch only exercise PRs (best performance per exercise)
  const { data: exercisePRs, isLoading } = useClientExercisePRs(clientId);

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

  // Only show exercise PRs - one best performance per exercise
  const prs = exercisePRs || [];

  if (prs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-warning" />
            Osobní rekordy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné záznamy cviků
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by best value (descending for weight/reps, ascending for time would need special handling)
  const sortedPRs = [...prs].sort((a, b) => b.bestValue - a.bestValue);

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-warning/10 shadow-sm shadow-warning/20">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              Osobní rekordy
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-secondary/50">
              {prs.length} {prs.length === 1 ? 'cvik' : prs.length < 5 ? 'cviky' : 'cviků'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedPRs.map((pr) => (
            <PRItem 
              key={pr.id} 
              name={pr.exerciseName}
              value={pr.bestDisplay}
              metricType={pr.metricType as MetricType}
              achievedAt={pr.achievedAt}
              onClick={() => setSelectedPR(pr)}
            />
          ))}
        </CardContent>
      </Card>
      
      {/* Exercise History Sheet with graph */}
      <ExerciseHistorySheet
        open={!!selectedPR}
        onOpenChange={(open) => !open && setSelectedPR(null)}
        pr={selectedPR}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}
