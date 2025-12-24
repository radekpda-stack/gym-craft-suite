import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, Loader2, Activity } from 'lucide-react';
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

export function ExerciseProgressChart({ exerciseId, exerciseType, clientId }: ExerciseProgressChartProps) {
  const [period, setPeriod] = useState('90');

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-progress', exerciseId, clientId, period],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(period));

      // Fetch strength data (exercise_entries)
      let strengthQuery = supabase
        .from('exercise_entries')
        .select('weight_kg, reps, sets, date, client_id, clients(name)')
        .eq('exercise_id', exerciseId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date');

      if (clientId) {
        strengthQuery = strengthQuery.eq('client_id', clientId);
      }

      const { data: strengthEntries } = await strengthQuery;

      // Fetch cardio data
      let cardioQuery = supabase
        .from('cardio_entries')
        .select('duration_seconds, distance_meters, avg_watts, avg_speed_kmh, date, client_id, clients(name)')
        .eq('exercise_id', exerciseId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date');

      if (clientId) {
        cardioQuery = cardioQuery.eq('client_id', clientId);
      }

      const { data: cardioEntries } = await cardioQuery;

      // Process strength data
      const strengthData = (strengthEntries || []).map(entry => {
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;
        // Brzycki formula for 1RM estimate
        const estimated1RM = reps > 0 && reps < 15 ? Math.round(weight * (36 / (37 - reps))) : null;

        return {
          date: entry.date,
          dateLabel: format(new Date(entry.date), 'd.M', { locale: cs }),
          weight,
          volume,
          estimated1RM,
          clientName: (entry.clients as any)?.name,
        };
      });

      // Process cardio data
      const cardioData = (cardioEntries || []).map(entry => {
        const distance = entry.distance_meters ? entry.distance_meters / 1000 : 0; // km
        const duration = entry.duration_seconds ? entry.duration_seconds / 60 : 0; // min
        const pace = distance > 0 && duration > 0 ? duration / distance : null; // min/km
        
        return {
          date: entry.date,
          dateLabel: format(new Date(entry.date), 'd.M', { locale: cs }),
          distance,
          duration,
          pace,
          watts: entry.avg_watts,
          speed: entry.avg_speed_kmh,
          clientName: (entry.clients as any)?.name,
        };
      });

      return {
        strengthData,
        cardioData,
        hasStrength: strengthData.length > 0,
        hasCardio: cardioData.length > 0,
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

  const hasData = data?.hasStrength || data?.hasCardio;

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

      {/* Strength charts */}
      {data?.hasStrength && (exerciseType === 'strength' || exerciseType === 'mixed') && (
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
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} kg`, 'Váha']}
                    />
                    <Line type="monotone" dataKey="weight" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
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
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Objem']}
                    />
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="volume" stroke={COLORS[1]} fill="url(#volumeGradient)" strokeWidth={2} />
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
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Odhad 1RM']}
                      />
                      <Line type="monotone" dataKey="estimated1RM" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Cardio charts */}
      {data?.hasCardio && (exerciseType === 'cardio' || exerciseType === 'mixed') && (
        <>
          {/* Pace / Speed over time */}
          <Card className="analytics-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Tempo × čas
                </CardTitle>
                <StatInfoTooltip
                  title="Tempo"
                  description="Vývoj tempa nebo rychlosti v čase."
                  calculation="Tempo = čas / vzdálenost (min/km)"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.cardioData}>
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(v) => data.cardioData[0]?.pace ? `${v.toFixed(1)} min/km` : `${v} km/h`}
                      reversed={!!data.cardioData[0]?.pace}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [
                        data.cardioData[0]?.pace ? `${value.toFixed(2)} min/km` : `${value} km/h`,
                        data.cardioData[0]?.pace ? 'Tempo' : 'Rychlost'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={data.cardioData[0]?.pace ? 'pace' : 'speed'} 
                      stroke={COLORS[0]} 
                      strokeWidth={2} 
                      dot={{ r: 3 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Power over time (if available) */}
          {data.cardioData.some(d => d.watts) && (
            <Card className="analytics-chart">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-warning" />
                    Výkon × čas
                  </CardTitle>
                  <StatInfoTooltip
                    title="Výkon"
                    description="Vývoj průměrného výkonu ve wattech."
                    calculation="Průměrný výkon za celou aktivitu."
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.cardioData.filter(d => d.watts)}>
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} W`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value} W`, 'Výkon']}
                      />
                      <defs>
                        <linearGradient id="wattsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS[2]} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={COLORS[2]} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="watts" stroke={COLORS[2]} fill="url(#wattsGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distance over time */}
          <Card className="analytics-chart">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Vzdálenost × čas
                </CardTitle>
                <StatInfoTooltip
                  title="Vzdálenost"
                  description="Vývoj uběhnuté/najeté vzdálenosti."
                  calculation="Celková vzdálenost za aktivitu v km."
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.cardioData}>
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} km`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} km`, 'Vzdálenost']}
                    />
                    <defs>
                      <linearGradient id="distanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="distance" stroke={COLORS[1]} fill="url(#distanceGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
