import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';
import type { AverageComparisonData } from '@/hooks/useExerciseAnalytics';

interface AverageComparisonViewProps {
  data: AverageComparisonData;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function DiffIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-sm font-medium text-primary">
        <TrendingUp className="w-4 h-4" />
        +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <TrendingDown className="w-4 h-4" />
        {value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
      <Minus className="w-4 h-4" />
      0%
    </span>
  );
}

export function AverageComparisonView({ data }: AverageComparisonViewProps) {
  const { clientData, averageData, percentDiff } = data;

  // Merge trend data
  const mergedTrend = clientData.volumeTrend.map((point, i) => ({
    label: point.label,
    date: point.date,
    client: point.volume,
    average: averageData.volumeTrend[i]?.volume || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Comparison Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Volume Comparison */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Celkový objem</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(clientData.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(averageData.avgVolume)}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.volume} />
            </div>
          </CardContent>
        </Card>

        {/* Sessions Comparison */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Počet tréninků</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{clientData.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{Math.round(averageData.avgSessions)}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.sessions} />
            </div>
          </CardContent>
        </Card>

        {/* Avg per Session Comparison */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Průměr/trénink</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(clientData.avgVolumePerSession)}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(averageData.avgVolumePerSession)}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.volumePerSession} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Comparison Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trend objemu: {clientData.clientName} vs. váš průměr
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedTrend}>
                <defs>
                  <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(68 100% 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(68 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
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
                  formatter={(value: number, name: string) => [
                    formatVolume(value) + ' kg', 
                    name === 'client' ? clientData.clientName : 'Průměr'
                  ]}
                />
                <Legend 
                  formatter={(value: string) => 
                    value === 'client' ? clientData.clientName : 'Váš průměr'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  name="average"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="url(#avgGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="client"
                  name="client"
                  stroke="hsl(68 100% 50%)"
                  strokeWidth={2}
                  fill="url(#clientGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Rozložení zátěže
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientData.categoryDistribution.slice(0, 6).map(cat => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{cat.category}</span>
                  <span className="text-sm font-medium">{cat.percentage}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
