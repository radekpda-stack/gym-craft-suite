import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ClientComparisonData } from '@/hooks/useExerciseAnalytics';

interface ClientComparisonViewProps {
  data: ClientComparisonData[];
}

const CLIENT_COLORS = [
  'hsl(68 100% 50%)',    // Primary volt
  'hsl(200 70% 50%)',    // Blue
  'hsl(320 70% 55%)',    // Pink
  'hsl(45 100% 55%)',    // Orange
  'hsl(280 70% 60%)',    // Purple
];

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function ClientComparisonView({ data }: ClientComparisonViewProps) {
  // Prepare merged volume trend data for overlay chart
  const mergedTrend = data[0]?.volumeTrend.map((point, i) => {
    const merged: any = { label: point.label, date: point.date };
    data.forEach((client, ci) => {
      merged[`client_${ci}`] = client.volumeTrend[i]?.volume || 0;
      merged[`name_${ci}`] = client.clientName;
    });
    return merged;
  }) || [];

  // Prepare bar chart data for comparison
  const barData = data.map(client => ({
    name: client.clientName,
    volume: client.totalVolume,
    sessions: client.sessionCount,
    avgPerSession: client.avgVolumePerSession,
  }));

  return (
    <div className="space-y-6">
      {/* Header Card with Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Porovnání klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.map((client, i) => (
              <div 
                key={client.clientId}
                className="p-4 rounded-lg bg-muted/30 border-l-4"
                style={{ borderLeftColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }}
              >
                <p className="font-medium truncate">{client.clientName}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-bold">{formatVolume(client.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">celkový objem</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {client.sessionCount} tréninků
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volume Comparison Bar Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Srovnání objemu a tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  horizontal={false}
                />
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={formatVolume}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={95}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatVolume(value) + ' kg', 'Objem']}
                />
                <Bar 
                  dataKey="volume" 
                  fill="hsl(68 100% 50%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trend Overlay */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trend objemu v čase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedTrend}>
                <defs>
                  {data.map((client, i) => (
                    <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CLIENT_COLORS[i % CLIENT_COLORS.length]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CLIENT_COLORS[i % CLIENT_COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={formatVolume}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    const clientIndex = parseInt(name.split('_')[1]);
                    const clientName = data[clientIndex]?.clientName || '';
                    return [formatVolume(value) + ' kg', clientName];
                  }}
                />
                <Legend 
                  formatter={(value: string) => {
                    const clientIndex = parseInt(value.split('_')[1]);
                    return data[clientIndex]?.clientName || '';
                  }}
                />
                {data.map((client, i) => (
                  <Area
                    key={i}
                    type="monotone"
                    dataKey={`client_${i}`}
                    name={`client_${i}`}
                    stroke={CLIENT_COLORS[i % CLIENT_COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#gradient-${i})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((client, i) => (
          <Card key={client.clientId} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }}
                />
                {client.clientName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {client.categoryDistribution.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 rounded-full bg-primary/30"
                        style={{ 
                          width: `${cat.percentage}px`,
                          backgroundColor: `${CLIENT_COLORS[i % CLIENT_COLORS.length]}40`
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
