import { useMemo, useState } from 'react';
import { format, subDays, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedbackTrendsChartProps {
  clientId: string;
}

type TimePeriod = 7 | 30 | 90;

const METRICS = [
  { key: 'rpe', label: 'RPE', color: 'hsl(var(--primary))' },
  { key: 'mood', label: 'Nálada', color: '#22c55e' },
  { key: 'fatigue', label: 'Únava', color: '#f97316' },
  { key: 'bodyFeel', label: 'Pocit v těle', color: '#3b82f6' },
  { key: 'technique', label: 'Technika', color: '#8b5cf6' },
  { key: 'sleepQuality', label: 'Kvalita spánku', color: '#ec4899' },
] as const;

type MetricKey = typeof METRICS[number]['key'];

export function FeedbackTrendsChart({ clientId }: FeedbackTrendsChartProps) {
  const { data: feedbacks, isLoading } = useClientFeedback(clientId);
  const [period, setPeriod] = useState<TimePeriod>(30);
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(['rpe', 'mood', 'fatigue'])
  );

  const chartData = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return [];

    const cutoffDate = subDays(new Date(), period);
    
    const recentFeedbacks = feedbacks
      .filter(f => isAfter(new Date(f.training_date), cutoffDate))
      .sort((a, b) => new Date(a.training_date).getTime() - new Date(b.training_date).getTime());

    return recentFeedbacks.map(f => ({
      date: format(new Date(f.training_date), 'd.M', { locale: cs }),
      fullDate: format(new Date(f.training_date), 'd. MMMM', { locale: cs }),
      rpe: f.rpe_rating,
      mood: f.mood_rating,
      fatigue: f.fatigue_level,
      bodyFeel: f.body_feel || null,
      technique: f.technique_rating || null,
      sleepQuality: f.sleep_quality || null,
    }));
  }, [feedbacks, period]);

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        if (next.size > 1) next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const hasData = (metric: MetricKey) => chartData.some(d => d[metric] !== null);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trendy feedbacku (30 dní)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trendy feedbacku (30 dní)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Žádné feedbacky za posledních 30 dní
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-medium mb-2">{data?.fullDate}</p>
          <div className="space-y-1">
            {METRICS.filter(m => activeMetrics.has(m.key) && data?.[m.key] !== null).map(m => (
              <p key={m.key} style={{ color: m.color }}>
                {m.label}: <span className="font-semibold">{data?.[m.key]}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Trendy feedbacku</CardTitle>
          <div className="flex gap-1">
            {([7, 30, 90] as TimePeriod[]).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p}d
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map(m => {
            const available = hasData(m.key);
            return (
              <button
                key={m.key}
                onClick={() => available && toggleMetric(m.key)}
                disabled={!available}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
                  activeMetrics.has(m.key) && available
                    ? "bg-accent text-accent-foreground"
                    : available
                    ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                    : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: available ? m.color : 'currentColor', opacity: available ? 1 : 0.3 }} 
                />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[1, 10]} 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
