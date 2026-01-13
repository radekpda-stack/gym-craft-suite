import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { useCapacityHeatmap } from '@/hooks/useCapacityHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useMemo } from 'react';

export function TrainingsByHourCard() {
  const { data, isLoading } = useCapacityHeatmap(12); // Last 12 weeks

  const hourlyData = useMemo(() => {
    if (!data?.cells) return [];

    // Aggregate by hour
    const hourCounts: Record<number, number> = {};
    data.cells.forEach(cell => {
      hourCounts[cell.hour] = (hourCounts[cell.hour] || 0) + cell.count;
    });

    // Create array for all hours with data
    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        label: `${hour}:00`,
        count,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [data]);

  const { peakHour, quietHour, totalTrainings } = useMemo(() => {
    if (hourlyData.length === 0) return { peakHour: null, quietHour: null, totalTrainings: 0 };

    const sorted = [...hourlyData].sort((a, b) => b.count - a.count);
    return {
      peakHour: sorted[0],
      quietHour: sorted[sorted.length - 1],
      totalTrainings: hourlyData.reduce((sum, h) => sum + h.count, 0),
    };
  }, [hourlyData]);

  const getTimeOfDayIcon = (hour: number) => {
    if (hour >= 6 && hour < 12) return <Sunrise className="h-3 w-3 text-warning" />;
    if (hour >= 12 && hour < 17) return <Sun className="h-3 w-3 text-warning" />;
    if (hour >= 17 && hour < 21) return <Sunset className="h-3 w-3 text-warning" />;
    return <Moon className="h-3 w-3 text-primary" />;
  };

  const getBarColor = (hour: number, maxCount: number, count: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'hsl(var(--primary))';
    if (intensity > 0.5) return 'hsl(var(--chart-1))';
    if (intensity > 0.25) return 'hsl(var(--chart-2))';
    return 'hsl(var(--chart-4))';
  };

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (!data || hourlyData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Tréninky podle hodiny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná data
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...hourlyData.map(h => h.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-primary" />
          Tréninky podle hodiny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Peak times */}
        <div className="grid grid-cols-2 gap-3 text-center pb-2 border-b">
          {peakHour && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                {getTimeOfDayIcon(peakHour.hour)}
                <span className="text-lg font-bold">{peakHour.hour}:00</span>
              </div>
              <p className="text-xs text-muted-foreground">
                nejoblíbenější ({peakHour.count}×)
              </p>
            </div>
          )}
          {quietHour && (
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                {getTimeOfDayIcon(quietHour.hour)}
                <span className="text-lg font-bold">{quietHour.hour}:00</span>
              </div>
              <p className="text-xs text-muted-foreground">
                nejméně ({quietHour.count}×)
              </p>
            </div>
          )}
        </div>

        {/* Hourly distribution chart */}
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval={1}
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => [`${value} tréninků`, 'Počet']}
                labelFormatter={(label) => `Čas: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {hourlyData.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.hour, maxCount, entry.count)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground text-center">
          Celkem {totalTrainings} tréninků za posledních 12 týdnů
        </p>
      </CardContent>
    </Card>
  );
}
