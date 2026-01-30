import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, TrendingUp, TrendingDown, Minus, Dumbbell, Timer, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeSimple, formatTime } from '@/lib/timeUtils';
import { ClientExerciseProgress, ExerciseProgressEntry } from '@/hooks/useClientAllExercises';

interface ExerciseProgressSheetProps {
  exercise: ClientExerciseProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ICONS = {
  strength: Dumbbell,
  cardio: Timer,
  skill: Zap,
};

const TYPE_COLORS = {
  strength: 'hsl(var(--primary))',
  cardio: 'hsl(217 91% 60%)',
  skill: 'hsl(38 92% 50%)',
};

export function ExerciseProgressSheet({ exercise, open, onOpenChange }: ExerciseProgressSheetProps) {
  if (!exercise) return null;
  
  const { exerciseName, data, exerciseType, isTimeBased, maxWeight, bestTime, prCount } = exercise;
  const lowerIsBetter = exerciseType === 'cardio' || (exerciseType === 'skill' && isTimeBased);
  
  const Icon = TYPE_ICONS[exerciseType] || Dumbbell;
  const color = TYPE_COLORS[exerciseType] || TYPE_COLORS.strength;
  
  // Prepare chart data
  const { chartData, stats, trend } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], stats: null, trend: 0 };
    }
    
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const getValue = (entry: ExerciseProgressEntry): number => {
      if (exerciseType === 'cardio' || isTimeBased) {
        return entry.timeSeconds || 0;
      }
      return entry.weight || 0;
    };
    
    const chartPoints = sorted.map(entry => ({
      date: entry.date,
      value: getValue(entry),
      isPR: entry.isPR,
      displayDate: format(parseISO(entry.date), 'd. MMM', { locale: cs }),
    }));
    
    // Calculate stats
    const values = chartPoints.map(p => p.value).filter(v => v > 0);
    const current = values[values.length - 1] || 0;
    const best = lowerIsBetter ? Math.min(...values) : Math.max(...values);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate trend
    let trendValue = 0;
    if (values.length >= 2) {
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const change = ((lastValue - firstValue) / firstValue) * 100;
      const isImprovement = lowerIsBetter ? change < 0 : change > 0;
      trendValue = isImprovement ? 1 : change === 0 ? 0 : -1;
    }
    
    return {
      chartData: chartPoints,
      stats: {
        current,
        best,
        average,
        count: values.length,
      },
      trend: trendValue,
    };
  }, [data, exerciseType, isTimeBased, lowerIsBetter]);
  
  const formatValue = (value: number): string => {
    if (exerciseType === 'cardio' || isTimeBased) {
      return formatTimeSimple(value);
    }
    return `${value} kg`;
  };
  
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';
  const trendLabel = trend > 0 
    ? (lowerIsBetter ? 'Zlepšuješ se!' : 'Stoupáš!') 
    : trend < 0 
      ? (lowerIsBetter ? 'Zpomaluješ' : 'Klesáš')
      : 'Stabilní';
  
  // Find PR point for highlight
  const prPoint = chartData.find(p => {
    if (lowerIsBetter) {
      return p.value === stats?.best;
    }
    return p.isPR || p.value === stats?.best;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0">
        <div className="p-4 pb-0">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">{exerciseName}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {exerciseType === 'cardio' ? 'Kardio' : exerciseType === 'skill' ? 'Plyometrie' : 'Síla'}
                </p>
              </div>
            </div>
          </SheetHeader>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 px-4 mb-4">
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Aktuální</p>
                <p className="text-lg font-bold" style={{ color }}>{formatValue(stats.current)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-3 h-3 text-warning" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {lowerIsBetter ? 'Nejlepší' : 'Maximum'}
                  </p>
                </div>
                <p className="text-lg font-bold text-warning">{formatValue(stats.best)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendIcon className={cn("w-3 h-3", trendColor)} />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trend</p>
                </div>
                <p className={cn("text-sm font-semibold", trendColor)}>{trendLabel}</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Chart */}
        <div className="px-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Tvůj pokrok za posledních 6 měsíců
                </h3>
                {lowerIsBetter && (
                  <span className="text-[10px] text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    ↓ nižší = lepší
                  </span>
                )}
              </div>
              
              {chartData.length > 1 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="displayDate" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis 
                        reversed={lowerIsBetter}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        tickFormatter={(v) => isTimeBased || exerciseType === 'cardio' ? formatTimeSimple(v) : `${v}`}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs text-muted-foreground">{data.displayDate}</p>
                                <p className="text-sm font-bold" style={{ color }}>
                                  {formatValue(data.value)}
                                </p>
                                {data.isPR && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Trophy className="w-3 h-3 text-warning" />
                                    <span className="text-xs text-warning">Osobní rekord!</span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill="url(#progressGradient)"
                        dot={{ fill: color, strokeWidth: 0, r: 3 }}
                        activeDot={{ fill: color, strokeWidth: 2, stroke: 'white', r: 5 }}
                      />
                      {/* Highlight PR point */}
                      {prPoint && (
                        <ReferenceDot
                          x={prPoint.displayDate}
                          y={prPoint.value}
                          r={8}
                          fill="hsl(38 92% 50%)"
                          stroke="white"
                          strokeWidth={2}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Potřebujeme více dat pro zobrazení grafu
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Trend Analysis */}
        {chartData.length > 2 && (
          <div className="px-4 pb-8">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    trend > 0 ? "bg-success/20" : trend < 0 ? "bg-destructive/20" : "bg-muted"
                  )}>
                    <TrendIcon className={cn("w-4 h-4", trendColor)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">📈 Analýza trendu</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>
                        • {trend > 0 
                          ? (lowerIsBetter 
                            ? 'Klesající trend (zrychluješ se!)' 
                            : `Stoupající trend`)
                          : trend < 0 
                            ? (lowerIsBetter 
                              ? 'Rostoucí trend (zpomaluješ se)' 
                              : 'Klesající trend')
                            : 'Stabilní výkon'}
                      </li>
                      <li>• Celkem {stats?.count || 0} záznamů</li>
                      {prCount > 0 && <li>• 🏆 {prCount}× osobní rekord</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
