import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExerciseProgress, ExerciseEntry } from '@/hooks/useExerciseEntries';

interface ProgressChartProps {
  clientId: string;
  exerciseName: string;
  clientName: string;
  period?: Period;
}

type Period = 'week' | 'month' | '3months' | 'year';
type Metric = 'weight' | 'reps' | 'volume' | 'time';

export function ProgressChart({ clientId, exerciseName, clientName, period: initialPeriod = 'month' }: ProgressChartProps) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [metric, setMetric] = useState<Metric>('weight');

  const { data: entries = [], isLoading } = useExerciseProgress(clientId, exerciseName, period);

  const chartData = useMemo(() => {
    return entries.map(entry => ({
      date: format(new Date(entry.date), 'd.M', { locale: cs }),
      fullDate: format(new Date(entry.date), 'PPP', { locale: cs }),
      weight: entry.weight_kg || 0,
      reps: entry.reps || 0,
      volume: (entry.weight_kg || 0) * (entry.reps || 0) * entry.sets,
      time: entry.time_seconds || 0,
      isPR: entry.is_pr,
      sets: entry.sets,
    }));
  }, [entries]);

  const maxValue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map(d => d[metric] as number));
  }, [chartData, metric]);

  const prPoints = useMemo(() => {
    return chartData.filter(d => d.isPR);
  }, [chartData]);

  const metricLabels: Record<Metric, string> = {
    weight: 'Váha (kg)',
    reps: 'Opakování',
    volume: 'Objem (kg)',
    time: 'Čas (s)',
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Načítám data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entries.length) {
    return (
      <Card className="glass">
        <CardContent className="p-6">
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
            <p>Zatím žádná data pro tento cvik</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {exerciseName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{clientName}</p>
          </div>
          <div className="flex gap-2">
            <Select value={metric} onValueChange={(v: Metric) => setMetric(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Váha</SelectItem>
                <SelectItem value="reps">Opakování</SelectItem>
                <SelectItem value="volume">Objem</SelectItem>
                <SelectItem value="time">Čas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Týden</SelectItem>
                <SelectItem value="month">Měsíc</SelectItem>
                <SelectItem value="3months">3 měsíce</SelectItem>
                <SelectItem value="year">Rok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                domain={[0, 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="glass rounded-lg p-3 shadow-lg border">
                      <p className="text-sm font-medium">{data.fullDate}</p>
                      <p className="text-sm text-muted-foreground">
                        {metricLabels[metric]}: <span className="text-foreground font-medium">{data[metric]}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.sets} série × {data.reps} opakování
                      </p>
                      {data.isPR && (
                        <Badge className="mt-1 gap-1 bg-warning/20 text-warning border-warning/30">
                          <Trophy className="w-3 h-3" /> PR
                        </Badge>
                      )}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={({ cx, cy, payload }) => {
                  if (payload.isPR) {
                    return (
                      <circle
                        key={`pr-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="hsl(45 93% 47%)"
                        stroke="hsl(45 93% 60%)"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="hsl(var(--primary))"
                    />
                  );
                }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PR summary */}
        {prPoints.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="text-muted-foreground">
              {prPoints.length} osobní{' '}
              {prPoints.length === 1 ? 'rekord' : prPoints.length < 5 ? 'rekordy' : 'rekordů'}{' '}
              v tomto období
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
