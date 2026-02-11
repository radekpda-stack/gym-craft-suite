/**
 * CohortBenchmarkView - Top-level comparison tab for Performance Hub
 * Combines MultiClientComparison with benchmark cards showing client vs average
 */
import { useState, useMemo } from 'react';
import { BarChart2, Users, TrendingUp, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MultiClientComparison } from './MultiClientComparison';
import { useAllClientsProgress } from '@/hooks/useClientProgressStats';
import { useCohortBenchmarks } from '@/hooks/useCohortBenchmarks';

export function CohortBenchmarkView() {
  const [benchmarkClientId, setBenchmarkClientId] = useState<string | null>(null);
  const { data: allClients = [], isLoading: clientsLoading } = useAllClientsProgress();
  const { data: benchmarks, isLoading: benchmarksLoading } = useCohortBenchmarks(benchmarkClientId);

  return (
    <div className="space-y-8">
      {/* Section 1: Benchmark Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-warning/15 shadow-lg shadow-warning/25">
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Benchmark vs průměr</h3>
            <p className="text-[10px] text-muted-foreground">
              Jak si klient vede ve srovnání s průměrem všech klientů
            </p>
          </div>
        </div>

        {/* Client selector for benchmarks */}
        <Select
          value={benchmarkClientId || ''}
          onValueChange={(v) => setBenchmarkClientId(v || null)}
        >
          <SelectTrigger className="w-full max-w-md bg-background/60">
            <SelectValue placeholder="Vyberte klienta pro benchmark..." />
          </SelectTrigger>
          <SelectContent>
            {clientsLoading ? (
              <div className="p-4"><Skeleton className="h-8 w-full" /></div>
            ) : allClients.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Žádní klienti</div>
            ) : (
              allClients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Benchmark results */}
        {benchmarkClientId && (
          <div className="space-y-3">
            {benchmarksLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : !benchmarks || benchmarks.exercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                Nedostatek dat pro benchmark. Klient potřebuje více záznamů.
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      Celkové srovnání ({benchmarks.exercises.length} cviků)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        vs {benchmarks.totalClients} klientů
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {benchmarks.aboveAvgCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Nad průměrem</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {benchmarks.atAvgCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Na průměru</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {benchmarks.belowAvgCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Pod průměrem</p>
                    </div>
                  </div>
                </div>

                {/* Exercise benchmark cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {benchmarks.exercises.map(ex => (
                    <BenchmarkExerciseCard key={ex.exerciseName} exercise={ex} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!benchmarkClientId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Vyberte klienta pro zobrazení benchmarků
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Section 2: Multi-Client Comparison (existing) */}
      <MultiClientComparison />
    </div>
  );
}

interface BenchmarkExerciseCardProps {
  exercise: {
    exerciseName: string;
    clientValue: number;
    avgValue: number;
    unit: string;
    diffPercent: number;
    clientCount: number;
  };
}

function BenchmarkExerciseCard({ exercise }: BenchmarkExerciseCardProps) {
  const isAbove = exercise.diffPercent > 5;
  const isBelow = exercise.diffPercent < -5;
  const barWidth = exercise.avgValue > 0
    ? Math.min(100, (exercise.clientValue / (exercise.avgValue * 1.5)) * 100)
    : 0;
  const avgBarWidth = exercise.avgValue > 0
    ? Math.min(100, (exercise.avgValue / (exercise.avgValue * 1.5)) * 100)
    : 0;

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {exercise.exerciseName}
        </span>
        <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
          {exercise.clientCount} kl.
        </Badge>
      </div>

      {/* Client value bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Klient</span>
          <span className="font-bold tabular-nums">
            {exercise.clientValue} {exercise.unit}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isAbove ? 'bg-primary' : isBelow ? 'bg-muted-foreground/50' : 'bg-accent'
            )}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Average value bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Průměr</span>
          <span className="tabular-nums text-muted-foreground">
            {exercise.avgValue} {exercise.unit}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-muted-foreground/30 transition-all duration-500"
            style={{ width: `${avgBarWidth}%` }}
          />
        </div>
      </div>

      {/* Diff indicator */}
      <div className="flex items-center justify-end gap-1 text-xs">
        {isAbove ? (
          <TrendingUp className="w-3 h-3 text-primary" />
        ) : isBelow ? (
          <TrendingUp className="w-3 h-3 text-muted-foreground rotate-180" />
        ) : (
          <Minus className="w-3 h-3 text-accent" />
        )}
        <span className={cn(
          'tabular-nums',
          isAbove ? 'text-primary' : isBelow ? 'text-muted-foreground' : 'text-accent'
        )}>
          {exercise.diffPercent > 0 ? '+' : ''}{exercise.diffPercent}%
        </span>
      </div>
    </div>
  );
}
