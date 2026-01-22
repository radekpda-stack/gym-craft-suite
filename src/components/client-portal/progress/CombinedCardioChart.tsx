import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Timer, Bike, PersonStanding } from 'lucide-react';
import { CardioDataPoint } from '@/hooks/useClientProgressData';
import { LucideIcon } from 'lucide-react';
import { formatTimeMs } from '@/lib/timeUtils';

interface CombinedCardioChartProps {
  data500: CardioDataPoint[];
  data1000: CardioDataPoint[];
  title: string;
  icon?: LucideIcon;
  isLoading?: boolean;
}

export function CombinedCardioChart({ 
  data500, 
  data1000, 
  title, 
  icon: Icon = Timer, 
  isLoading 
}: CombinedCardioChartProps) {
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
          <div className="h-52 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Načítám...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const has500 = data500 && data500.length > 0;
  const has1000 = data1000 && data1000.length > 0;

  if (!has500 && !has1000) {
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

  const formatTime = (seconds: number) => formatTimeMs(seconds * 1000);

  // Merge data by date
  const dateMap = new Map<string, { date: string; time500?: number; time1000?: number; pace500?: string; pace1000?: string }>();
  
  data500?.forEach(d => {
    const existing = dateMap.get(d.date) || { date: d.date };
    existing.time500 = d.timeSeconds;
    existing.pace500 = d.pace;
    dateMap.set(d.date, existing);
  });
  
  data1000?.forEach(d => {
    const existing = dateMap.get(d.date) || { date: d.date };
    existing.time1000 = d.timeSeconds;
    existing.pace1000 = d.pace;
    dateMap.set(d.date, existing);
  });

  const chartData = Array.from(dateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      label: format(parseISO(d.date), 'd. M.', { locale: cs }),
      fullDate: format(parseISO(d.date), 'd. MMMM yyyy', { locale: cs }),
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
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
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="text-muted-foreground mb-1">{data.fullDate}</p>
                        {data.pace500 && (
                          <p className="font-medium text-[hsl(var(--chart-1))]">500m: {data.pace500}</p>
                        )}
                        {data.pace1000 && (
                          <p className="font-medium text-[hsl(var(--chart-2))]">1000m: {data.pace1000}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
              {has500 && (
                <Line 
                  type="monotone" 
                  dataKey="time500" 
                  name="500m"
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: 'hsl(var(--chart-1))' }}
                  connectNulls
                />
              )}
              {has1000 && (
                <Line 
                  type="monotone" 
                  dataKey="time1000" 
                  name="1000m"
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: 'hsl(var(--chart-2))' }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
