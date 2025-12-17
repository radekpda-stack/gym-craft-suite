import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Medal, ChevronRight, TrendingUp, Calendar, Trophy } from 'lucide-react';
import { usePRMetrics, PRPeriod, PRType } from '@/hooks/usePRMetrics';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const PERIOD_OPTIONS: { value: PRPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měs.' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const PR_TYPE_OPTIONS: { value: PRType; label: string }[] = [
  { value: '1rm', label: '1RM (odhad)' },
  { value: 'maxWeight', label: 'Max váha' },
];

export function PRTimelineCard() {
  const [period, setPeriod] = useState<PRPeriod>('3months');
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);
  const [prType, setPRType] = useState<PRType>('1rm');

  const { data, isLoading } = usePRMetrics(period, exerciseFilter, prType);

  const showBestChart = exerciseFilter !== null;

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const hasData = data && data.totalPRCount > 0;
  const hasEnoughDataForChart = data && data.prCountTimeline.some(p => p.prCount > 0);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-warning" />
          <h4 className="font-semibold text-foreground">Vývoj PR v čase</h4>
        </div>
        
        <div className="flex gap-1 p-0.5 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-[10px] px-2 h-6',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Summary */}
      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">PR za období</span>
            </div>
            <p className="text-xl font-bold text-foreground">{data.totalPRCount}</p>
          </div>
          
          {data.biggestPR && (
            <div className="p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">Největší PR</span>
              </div>
              <p className="text-sm font-bold text-foreground truncate">
                {data.biggestPR.estimated1RM} kg
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {data.biggestPR.exerciseName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <Select 
          value={exerciseFilter || 'all'} 
          onValueChange={(v) => setExerciseFilter(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Všechny cviky" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny cviky</SelectItem>
            {data?.exerciseOptions.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name} ({ex.prCount} PR)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={prType} onValueChange={(v) => setPRType(v as PRType)}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PR_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Charts */}
      {hasEnoughDataForChart ? (
        <div className="space-y-4">
          {/* PR Count Bar Chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Počet PR</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.prCountTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [`${value} PR`, 'Počet']}
                  />
                  <Bar
                    dataKey="prCount"
                    fill="hsl(var(--warning))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Best PR Line Chart (only when exercise filtered) */}
          {showBestChart && data?.prBestTimeline && data.prBestTimeline.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {prType === '1rm' ? 'Nejlepší 1RM' : 'Max váha'} (kg)
              </p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.prBestTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} kg`,
                        props.payload.exerciseName
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: 'hsl(var(--success))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top PR List (when all exercises selected) */}
          {!showBestChart && data?.topPRsInPeriod && data.topPRsInPeriod.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Top PR v období</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {data.topPRsInPeriod.slice(0, 5).map((pr, i) => (
                  <div key={pr.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                        i === 0 ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'
                      )}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{pr.exerciseName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(pr.date), 'd. MMM', { locale: cs })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-success">{pr.estimated1RM} kg</p>
                      <p className="text-[10px] text-muted-foreground">
                        {pr.weight}kg × {pr.reps}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Medal className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Zatím málo dat pro trend</p>
          <p className="text-xs text-muted-foreground mb-3">
            Pro zobrazení grafu je potřeba více PR záznamů
          </p>
          {period !== '6months' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setPeriod('6months')}
            >
              Zobrazit delší období
            </Button>
          )}
        </div>
      )}

      {/* Footer link */}
      <Link
        to="/pr-history"
        className="flex items-center justify-center gap-1 pt-3 border-t border-border/50 text-xs text-primary hover:text-primary/80"
      >
        Zobrazit vše <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
