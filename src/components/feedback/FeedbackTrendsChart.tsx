import { useMemo } from 'react';
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

interface FeedbackTrendsChartProps {
  clientId: string;
}

export function FeedbackTrendsChart({ clientId }: FeedbackTrendsChartProps) {
  const { data: feedbacks, isLoading } = useClientFeedback(clientId);

  const chartData = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return [];

    const thirtyDaysAgo = subDays(new Date(), 30);
    
    // Filter feedbacks from last 30 days and sort by date
    const recentFeedbacks = feedbacks
      .filter(f => isAfter(new Date(f.training_date), thirtyDaysAgo))
      .sort((a, b) => new Date(a.training_date).getTime() - new Date(b.training_date).getTime());

    return recentFeedbacks.map(f => ({
      date: format(new Date(f.training_date), 'd.M', { locale: cs }),
      fullDate: format(new Date(f.training_date), 'd. MMMM', { locale: cs }),
      rpe: f.rpe_rating,
      mood: f.mood_rating,
      fatigue: f.fatigue_level,
      energy: f.energy_rating || null,
      bodyFeel: f.body_feel || null,
    }));
  }, [feedbacks]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-medium mb-2">{data?.fullDate}</p>
          <div className="space-y-1">
            <p className="text-primary">RPE: <span className="font-semibold">{data?.rpe}</span></p>
            <p className="text-green-500">Nálada: <span className="font-semibold">{data?.mood}</span></p>
            <p className="text-orange-500">Únava: <span className="font-semibold">{data?.fatigue}</span></p>
            {data?.bodyFeel && (
              <p className="text-blue-500">Pocit v těle: <span className="font-semibold">{data?.bodyFeel}</span></p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trendy feedbacku (30 dní)</CardTitle>
      </CardHeader>
      <CardContent>
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
              <Line
                type="monotone"
                dataKey="rpe"
                name="RPE"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="mood"
                name="Nálada"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="fatigue"
                name="Únava"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              {chartData.some(d => d.bodyFeel) && (
                <Line
                  type="monotone"
                  dataKey="bodyFeel"
                  name="Pocit v těle"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>RPE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Nálada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Únava</span>
          </div>
          {chartData.some(d => d.bodyFeel) && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Pocit v těle</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
