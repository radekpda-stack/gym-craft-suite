import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { MeasurementDataPoint } from '@/hooks/useClientProgressData';

interface WeightChartProps {
  data: MeasurementDataPoint[];
  isLoading?: boolean;
}

export function WeightChart({ data, isLoading }: WeightChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Váha
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
            <Scale className="w-4 h-4" />
            Váha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Zatím nejsou k dispozici žádná data o váze.
          </p>
        </CardContent>
      </Card>
    );
  }

  const firstValue = data[0]?.value;
  const lastValue = data[data.length - 1]?.value;
  const change = lastValue - firstValue;
  const changePercent = ((change / firstValue) * 100).toFixed(1);

  const TrendIcon = change < 0 ? TrendingDown : change > 0 ? TrendingUp : Minus;
  const trendColor = change < 0 ? 'text-green-600' : change > 0 ? 'text-red-500' : 'text-muted-foreground';

  const chartData = data.map(d => ({
    date: format(parseISO(d.date), 'd. M.', { locale: cs }),
    fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Váha
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{change > 0 ? '+' : ''}{change.toFixed(1)} kg ({changePercent}%)</span>
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
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={(value) => `${value}`}
                className="fill-muted-foreground"
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="text-muted-foreground">{payload[0].payload.fullDate}</p>
                        <p className="font-semibold">{payload[0].value} kg</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))', r: 5 }}
                activeDot={{ r: 7, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
