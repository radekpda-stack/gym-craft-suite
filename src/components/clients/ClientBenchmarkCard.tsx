import { Medal, TrendingUp, TrendingDown, Trophy, Users } from 'lucide-react';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ClientBenchmarkCardProps {
  clientId: string;
}

export function ClientBenchmarkCard({ clientId }: ClientBenchmarkCardProps) {
  const { data, isLoading } = usePerformanceBenchmarks(clientId);

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-3" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!data || data.percentiles.length === 0) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Medal className="w-4 h-4 text-warning" />
          <h4 className="font-medium text-sm text-foreground">Výkonnostní srovnání</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Nedostatek dat pro srovnání. Klient potřebuje více záznamů cviků.
        </p>
      </div>
    );
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-success';
    if (percentile >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Nad průměr';
    if (percentile >= 25) return 'Průměr';
    return 'Pod průměrem';
  };

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Medal className="w-4 h-4 text-warning" />
          <h4 className="font-medium text-sm text-foreground">Výkonnostní srovnání</h4>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>vs {data.totalClients} klientů</span>
        </div>
      </div>

      {/* Overall percentile */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Celkové umístění</span>
          <span className={cn('text-lg font-bold', getPercentileColor(data.overallPercentile))}>
            {getPercentileLabel(data.overallPercentile)}
          </span>
        </div>
        <Progress value={data.overallPercentile} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">
          Lepší než {data.overallPercentile}% ostatních klientů
        </p>
      </div>

      {/* PR Rank */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <span className="text-xs text-muted-foreground">Žebříček PR</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">
            #{data.prRank}
          </span>
          <span className="text-xs text-muted-foreground"> / {data.totalClients}</span>
          <p className="text-[10px] text-muted-foreground">{data.prCount} PR celkem</p>
        </div>
      </div>

      {/* Strongest & Weakest */}
      <div className="grid grid-cols-2 gap-2">
        {data.strongestExercise && (
          <div className="p-2 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-[10px] text-muted-foreground">Nejsilnější</span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">
              {data.strongestExercise.name}
            </p>
            <p className="text-[10px] text-success">
              Top {100 - data.strongestExercise.percentile}%
            </p>
          </div>
        )}
        {data.weakestExercise && (
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">K zlepšení</span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">
              {data.weakestExercise.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {data.weakestExercise.percentile}. percentil
            </p>
          </div>
        )}
      </div>

      {/* Top exercises list */}
      {data.percentiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Srovnání top cviků
          </p>
          {data.percentiles.slice(0, 3).map((p) => (
            <div key={p.exerciseId} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground truncate flex-1">{p.exercise}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{p.clientValue} kg</span>
                <span className={cn('text-[10px]', getPercentileColor(p.percentile))}>
                  {p.percentile}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
