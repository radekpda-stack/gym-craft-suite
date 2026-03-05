import { useState, useMemo } from 'react';
import { Trophy, Dumbbell, Timer, Repeat, TrendingUp, Zap, Ruler, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { ExerciseHistorySheet } from '@/components/training-mode/ExerciseHistorySheet';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientPRsCardProps {
  clientId: string;
  clientName?: string;
}

type MetricType = 'weight' | 'time' | 'reps' | 'distance' | 'power' | 'score';

function getMetricIcon(metricType: MetricType) {
  switch (metricType) {
    case 'weight': return Dumbbell;
    case 'time': return Timer;
    case 'reps': return Repeat;
    case 'distance': return Ruler;
    case 'power': return Zap;
    default: return TrendingUp;
  }
}

function getMetricColor(metricType: MetricType) {
  switch (metricType) {
    case 'weight': return "bg-accent/20 text-accent";
    case 'time': return "bg-success/20 text-success";
    case 'reps': return "bg-primary/20 text-primary";
    case 'distance': return "bg-warning/20 text-warning";
    case 'power': return "bg-warning/20 text-warning";
    default: return "bg-muted text-muted-foreground";
  }
}

function getPrAgeBadge(achievedAt: string): { label: string; className: string } | null {
  const days = differenceInDays(new Date(), parseISO(achievedAt));
  if (days <= 7) return { label: 'Nový!', className: 'bg-success/15 text-success border-success/30' };
  if (days <= 30) return { label: 'Tento měsíc', className: 'bg-primary/15 text-primary border-primary/30' };
  if (days > 90) return { label: '3+ měs.', className: 'bg-muted text-muted-foreground border-border' };
  return null;
}

function PRItem({ name, value, metricType, achievedAt, onClick }: {
  name: string; value: string; metricType: MetricType; achievedAt: string; onClick?: () => void;
}) {
  const Icon = getMetricIcon(metricType);
  const colorClass = getMetricColor(metricType);
  const ageBadge = getPrAgeBadge(achievedAt);

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
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(achievedAt), 'd. MMM yyyy', { locale: cs })}
            </span>
            {ageBadge && (
              <Badge variant="outline" className={cn("text-[9px] py-0 px-1 h-4 border", ageBadge.className)}>
                {ageBadge.label}
              </Badge>
            )}
          </div>
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
  const { data: exercisePRs, isLoading } = useClientExercisePRs(clientId);

  // Summary stats
  const summary = useMemo(() => {
    if (!exercisePRs || exercisePRs.length === 0) return null;
    const now = new Date();
    const newThisMonth = exercisePRs.filter(pr => differenceInDays(now, parseISO(pr.achievedAt)) <= 30).length;
    const fresh = exercisePRs.filter(pr => differenceInDays(now, parseISO(pr.achievedAt)) <= 7).length;
    return { newThisMonth, fresh, total: exercisePRs.length };
  }, [exercisePRs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  const prs = exercisePRs || [];
  if (prs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-5 h-5 text-warning" />Osobní rekordy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Zatím žádné záznamy cviků</p>
        </CardContent>
      </Card>
    );
  }

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

          {/* Summary row */}
          {summary && (summary.newThisMonth > 0 || summary.fresh > 0) && (
            <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground border-t border-border/30 mt-3">
              {summary.fresh > 0 && (
                <span className="flex items-center gap-1 text-success">
                  <Sparkles className="w-3 h-3" />
                  {summary.fresh} {summary.fresh === 1 ? 'nový' : 'nové'} PR tento týden
                </span>
              )}
              {summary.newThisMonth > 0 && summary.fresh === 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {summary.newThisMonth} PR tento měsíc
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
