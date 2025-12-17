import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, ChevronRight, Dumbbell, Activity, Calendar, Settings2 } from 'lucide-react';
import { useStrengthMetrics, StrengthPeriod, StrengthMetric } from '@/hooks/useStrengthMetrics';

const PERIOD_OPTIONS: { value: StrengthPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měs.' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const METRIC_TABS: { value: StrengthMetric; label: string; icon: any }[] = [
  { value: '1rm', label: '1RM', icon: TrendingUp },
  { value: 'volume', label: 'Objem', icon: Dumbbell },
  { value: 'frequency', label: 'Frekvence', icon: Calendar },
];

const DEFAULT_EXERCISES = ['Bench Press', 'Dřep', 'Mrtvý tah', 'Tlak nad hlavu'];

export function StrengthDevelopmentCard() {
  const [period, setPeriod] = useState<StrengthPeriod>('3months');
  const [metric, setMetric] = useState<StrengthMetric>('1rm');
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const { data, isLoading } = useStrengthMetrics(period, metric, exerciseId);

  // Auto-select first available exercise for 1RM if not set
  useEffect(() => {
    if (metric === '1rm' && !exerciseId && data?.exerciseOptions.length) {
      // Find a default exercise or use first one
      const defaultEx = data.exerciseOptions.find(ex => 
        DEFAULT_EXERCISES.some(d => ex.name.toLowerCase().includes(d.toLowerCase()))
      );
      setExerciseId(defaultEx?.id || data.exerciseOptions[0].id);
    }
  }, [metric, exerciseId, data?.exerciseOptions]);

  // Reset exercise filter when switching away from 1RM
  useEffect(() => {
    if (metric !== '1rm') {
      setExerciseId(null);
    }
  }, [metric]);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const selectedExercise = data?.exerciseOptions.find(ex => ex.id === exerciseId);

  const getMetricLabel = () => {
    switch (metric) {
      case '1rm': return 'kg';
      case 'volume': return 'tun';
      case 'frequency': return 'tréninků';
    }
  };

  const getChartColor = () => {
    switch (metric) {
      case '1rm': return 'hsl(var(--primary))';
      case 'volume': return 'hsl(var(--success))';
      case 'frequency': return 'hsl(var(--warning))';
    }
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" />
          <h4 className="font-semibold text-foreground">Vývoj síly</h4>
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

      {/* Metric Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/30">
        {METRIC_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.value}
              variant={metric === tab.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'flex-1 text-xs h-8 gap-1.5',
                metric === tab.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setMetric(tab.value)}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Exercise Filter (required for 1RM) */}
      {metric === '1rm' && (
        <Select 
          value={exerciseId || ''} 
          onValueChange={setExerciseId}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Vyberte cvik" />
          </SelectTrigger>
          <SelectContent>
            {data?.exerciseOptions.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name} ({ex.last1RM} kg)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* KPI Summary for 1RM */}
      {metric === '1rm' && data?.current1RM && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground">Aktuální 1RM</p>
            <p className="text-2xl font-bold text-foreground">{data.current1RM} kg</p>
          </div>
          {data.change1RM !== null && (
            <div className={cn(
              'text-right',
              data.change1RM > 0 ? 'text-success' : data.change1RM < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              <p className="text-xs">vs předchozí</p>
              <p className="text-lg font-bold">
                {data.change1RM > 0 ? '+' : ''}{data.change1RM}%
              </p>
            </div>
          )}
          {data.change1RM === null && data.previous1RM === null && (
            <div className="text-right text-muted-foreground">
              <p className="text-xs">vs předchozí</p>
              <p className="text-lg font-bold">—</p>
            </div>
          )}
        </div>
      )}

      {/* Volume/Frequency Summary */}
      {metric === 'volume' && data && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/20">
          <p className="text-xs text-muted-foreground">Celkový objem za období</p>
          <p className="text-2xl font-bold text-foreground">{data.totalVolume} tun</p>
        </div>
      )}

      {metric === 'frequency' && data && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-xs text-muted-foreground">Průměrná frekvence</p>
          <p className="text-2xl font-bold text-foreground">{data.avgFrequency} tréninků/týden</p>
        </div>
      )}

      {/* Chart */}
      {data?.hasEnoughData ? (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            {metric === '1rm' ? (
              <LineChart data={data.timeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value: number) => [`${value} kg`, '1RM']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getChartColor()}
                  strokeWidth={2}
                  dot={{ r: 4, fill: getChartColor() }}
                />
              </LineChart>
            ) : (
              <BarChart data={data.timeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                  formatter={(value: number) => [
                    `${value} ${getMetricLabel()}`,
                    metric === 'volume' ? 'Objem' : 'Tréninků'
                  ]}
                />
                <Bar
                  dataKey="value"
                  fill={getChartColor()}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Zatím málo dat pro trend</p>
          <p className="text-xs text-muted-foreground mb-3">
            {metric === '1rm' && !exerciseId 
              ? 'Vyberte cvik pro zobrazení grafu'
              : 'Pro zobrazení grafu je potřeba více záznamů'
            }
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
        to="/progress"
        className="flex items-center justify-center gap-1 pt-3 border-t border-border/50 text-xs text-primary hover:text-primary/80"
      >
        Zobrazit vše <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
