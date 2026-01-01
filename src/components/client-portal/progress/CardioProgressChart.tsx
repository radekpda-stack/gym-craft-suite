import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Timer, TrendingDown, TrendingUp, Minus, Bike, PersonStanding } from 'lucide-react';
import { CardioDataPoint } from '@/hooks/useClientProgressData';
import { LucideIcon } from 'lucide-react';

interface CardioProgressChartProps {
  data: CardioDataPoint[];
  title: string;
  icon?: LucideIcon;
  isLoading?: boolean;
}

export function CardioProgressChart({ data, title, icon: Icon = Timer, isLoading }: CardioProgressChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Načítám...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Zatím nejsou k dispozici žádná data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const firstValue = data[0]?.timeSeconds;
  const lastValue = data[data.length - 1]?.timeSeconds;
  const change = lastValue - firstValue;
  const changePercent = ((change / firstValue) * 100).toFixed(1);

  // For time, lower is better
  const TrendIcon = change < 0 ? TrendingDown : change > 0 ? TrendingUp : Minus;
  const trendColor = change < 0 ? 'text-green-600' : change > 0 ? 'text-red-500' : 'text-muted-foreground';

  const formatTime = (seconds: number) => {
    // Support centiseconds if present
    const totalMs = seconds * 1000;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hasDecimals = secs % 1 !== 0;
    if (hasDecimals) {
      return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
    }
    return `${mins}:${Math.floor(secs).toString().padStart(2, '0')}`;
  };

  const chartData = data.map(d => ({
    date: format(parseISO(d.date), 'd. M.', { locale: cs }),
    fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
    timeSeconds: d.timeSeconds,
    pace: d.pace,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {title}
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{change > 0 ? '+' : ''}{formatTime(Math.abs(change))} ({changePercent}%)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => formatTime(value)}
                className="fill-muted-foreground"
                reversed
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="text-muted-foreground">{payload[0].payload.fullDate}</p>
                        <p className="font-semibold">{payload[0].payload.pace}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="timeSeconds" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: 'hsl(var(--chart-3))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
