import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, Loader2, Activity, Timer, Zap } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';

interface ExerciseProgressChartProps {
  exerciseId: string;
  exerciseType: 'strength' | 'cardio' | 'mixed';
  clientId: string | null;
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7 dní' },
  { value: '30', label: '30 dní' },
  { value: '90', label: '90 dní' },
  { value: '180', label: '6 měsíců' },
  { value: '365', label: '1 rok' },
];

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
];

function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExerciseProgressChart({ exerciseId, exerciseType, clientId }: ExerciseProgressChartProps) {
  const [period, setPeriod] = useState('90');

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-progress', exerciseId, clientId, period],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(period));

      // First, get exercise info to determine if it's time-based
      const { data: exercise } = await supabase
        .from('exercises')
        .select('is_time_based, category')
        .eq('id', exerciseId)
        .single();

      const isTimeBased = exercise?.is_time_based || 
        exercise?.category === 'cardio' || 
        exercise?.category === 'conditioning';

      // Fetch all data from exercise_entries (includes both strength and time-based)
      let query = supabase
        .from('exercise_entries')
        .select('weight_kg, reps, sets, time_seconds, date, client_id, is_pr, avg_watts, max_watts, pace_sec_per_500m, clients(name)')
        .eq('exercise_id', exerciseId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: entries } = await query;

      // Process entries
      const processedData = (entries || []).map(entry => {
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;
        const timeSeconds = entry.time_seconds;
        const avgWatts = (entry as any).avg_watts || 0;
        const pace500m = (entry as any).pace_sec_per_500m || 0;
        
        // Brzycki formula for 1RM estimate
        const estimated1RM = reps > 0 && reps < 15 && weight > 0 
          ? Math.round(weight * (36 / (37 - reps))) 
          : null;

        return {
          date: entry.date,
          dateLabel: format(new Date(entry.date), 'd.M', { locale: cs }),
          weight,
          volume,
          estimated1RM,
          timeSeconds,
          timeFormatted: timeSeconds ? formatTimeDisplay(timeSeconds) : null,
          avgWatts,
          pace500m,
          clientName: (entry.clients as any)?.name,
          isPR: entry.is_pr,
        };
      });

      // Separate strength and time data
      const strengthData = processedData.filter(d => d.weight > 0);
      const timeData = processedData.filter(d => d.timeSeconds && d.timeSeconds > 0);
      const wattsData = processedData.filter(d => d.avgWatts > 0);

      return {
        strengthData,
        timeData,
        wattsData,
        hasStrength: strengthData.length > 0,
        hasTime: timeData.length > 0,
        hasWatts: wattsData.length > 0,
        isTimeBased,
      };
    },
    enabled: !!exerciseId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data?.hasStrength || data?.hasTime || data?.hasWatts;

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Vývoj výkonu
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Zatím nejsou žádná data pro vybrané období.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine what to show based on exercise type and available data
  const showStrength = !data.isTimeBased && data.hasStrength;
  const showTime = (data.isTimeBased || exerciseType === 'cardio') && data.hasTime;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time-based charts (for cardio exercises) */}
      {showTime && (
        <Card className="analytics-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-5 w-5 text-primary" />
                Čas × datum
              </CardTitle>
              <StatInfoTooltip
                title="Vývoj času"
                description="Graf zobrazuje vývoj času v průběhu tréninků. Nižší čas = lepší výkon."
                calculation="Každý bod představuje zaznamenaný čas."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeData}>
                  <defs>
                    <linearGradient id="timeLineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={COLORS[0]} stopOpacity={1} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => formatTimeDisplay(v)}
                    reversed
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value: number) => [formatTimeDisplay(value), 'Čas']}
                    labelFormatter={(label) => `Datum: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="timeSeconds" 
                    stroke="url(#timeLineGradient)" 
                    strokeWidth={3} 
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      // Show dot for all points, highlight PRs
                      const isPR = payload.isPR;
                      return (
                        <circle 
                          key={`dot-${index}`}
                          cx={cx} 
                          cy={cy} 
                          r={isPR ? 8 : 4} 
                          fill={COLORS[0]} 
                          stroke="hsl(var(--background))" 
                          strokeWidth={isPR ? 3 : 2}
                          filter={isPR ? "url(#glow)" : undefined}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: COLORS[0], stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Watts/Power chart (for cardio exercises) */}
      {data?.hasWatts && (
        <Card className="analytics-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-warning" />
                Výkon × datum
              </CardTitle>
              <StatInfoTooltip
                title="Vývoj výkonu"
                description="Graf zobrazuje vývoj průměrného výkonu ve wattech."
                calculation="Každý bod představuje průměrný výkon při daném tréninku."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.wattsData}>
                  <defs>
                    <linearGradient id="wattsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => `${v} W`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value: number) => [`${value} W`, 'Výkon']}
                    labelFormatter={(label) => `Datum: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgWatts" 
                    stroke="url(#wattsGradient)" 
                    strokeWidth={3} 
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      const isPR = payload.isPR;
                      return (
                        <circle 
                          key={`dot-watts-${index}`}
                          cx={cx} 
                          cy={cy} 
                          r={isPR ? 8 : 4} 
                          fill="hsl(var(--warning))" 
                          stroke="hsl(var(--background))" 
                          strokeWidth={isPR ? 3 : 2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: 'hsl(var(--warning))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strength charts */}
      {showStrength && (
        <>
          {/* Weight over time */}
          <Card className="analytics-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Váha × čas
                </CardTitle>
                <StatInfoTooltip
                  title="Vývoj váhy"
                  description="Graf zobrazuje vývoj maximální váhy v průběhu času."
                  calculation="Každý bod představuje váhu použitou při daném tréninku."
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.strengthData}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={COLORS[0]} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="dateLabel" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => `${v} kg`} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value: number) => [`${value} kg`, 'Váha']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="url(#weightGradient)" 
                      strokeWidth={3} 
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        return (
                          <circle 
                            key={`dot-weight-${index}`}
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill={COLORS[0]} 
                            stroke="hsl(var(--background))" 
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 6, fill: COLORS[0], stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume over time */}
          <Card className="analytics-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-success" />
                  Objem × čas
                </CardTitle>
                <StatInfoTooltip
                  title="Tréninkový objem"
                  description="Graf zobrazuje vývoj tréninkového objemu."
                  calculation="Objem = váha × opakování × série"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.strengthData}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="dateLabel" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => `${v} kg`} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Objem']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="hsl(var(--success))" 
                      fill="url(#volumeGradient)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Estimated 1RM */}
          {data.strengthData.some(d => d.estimated1RM) && (
            <Card className="analytics-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-warning" />
                    Odhad 1RM
                  </CardTitle>
                  <StatInfoTooltip
                    title="Odhad 1RM"
                    description="Odhadovaný jednorázový maximum na základě Brzycki vzorce."
                    calculation="1RM = váha × (36 / (37 - počet opakování))"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.strengthData.filter(d => d.estimated1RM)}>
                      <defs>
                        <linearGradient id="rmGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="dateLabel" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `${v} kg`} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Odhad 1RM']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="estimated1RM" 
                        stroke="url(#rmGradient)" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, fill: 'hsl(var(--warning))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
