import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
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
import type { HistoryComparisonData } from '@/hooks/useExerciseAnalytics';

interface HistoryComparisonViewProps {
  data: HistoryComparisonData;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function DiffIndicator({ value, large = false }: { value: number; large?: boolean }) {
  const sizeClass = large ? 'text-lg' : 'text-sm';
  const iconSize = large ? 'w-5 h-5' : 'w-4 h-4';
  
  if (value > 0) {
    return (
      <span className={cn('flex items-center gap-1 font-medium text-primary', sizeClass)}>
        <TrendingUp className={iconSize} />
        +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className={cn('flex items-center gap-1 font-medium text-muted-foreground', sizeClass)}>
        <TrendingDown className={iconSize} />
        {value}%
      </span>
    );
  }
  return (
    <span className={cn('flex items-center gap-1 font-medium text-muted-foreground', sizeClass)}>
      <Minus className={iconSize} />
      0%
    </span>
  );
}

export function HistoryComparisonView({ data }: HistoryComparisonViewProps) {
  const { currentPeriod, previousPeriod, percentChange } = data;

  // Prepare bar chart comparison data
  const comparisonData = [
    {
      metric: 'Objem',
      current: currentPeriod.totalVolume,
      previous: previousPeriod.totalVolume,
    },
    {
      metric: 'Tréninky',
      current: currentPeriod.sessionCount * 1000, // Scale for visibility
      previous: previousPeriod.sessionCount * 1000,
    },
    {
      metric: 'Prům./trénink',
      current: currentPeriod.avgVolumePerSession,
      previous: previousPeriod.avgVolumePerSession,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Client Name */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historie: {currentPeriod.clientName}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Comparison Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Volume Comparison */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Celkový objem</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(currentPeriod.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">Aktuální</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(previousPeriod.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">Předchozí</p>
                </div>
              </div>
              <DiffIndicator value={percentChange.volume} large />
            </div>
          </CardContent>
        </Card>

        {/* Sessions Comparison */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Počet tréninků</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{currentPeriod.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">Aktuální</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{previousPeriod.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">Předchozí</p>
                </div>
              </div>
              <DiffIndicator value={percentChange.sessions} large />
            </div>
          </CardContent>
        </Card>

        {/* Avg per Session */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Průměr/trénink</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(currentPeriod.avgVolumePerSession)}</p>
                  <p className="text-xs text-muted-foreground">Aktuální</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(previousPeriod.avgVolumePerSession)}</p>
                  <p className="text-xs text-muted-foreground">Předchozí</p>
                </div>
              </div>
              <DiffIndicator value={percentChange.volumePerSession} large />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side by Side Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Period Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              Aktuální období
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentPeriod.volumeTrend}>
                  <defs>
                    <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(68 100% 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(68 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    tickFormatter={formatVolume}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatVolume(value) + ' kg', 'Objem']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(68 100% 50%)"
                    strokeWidth={2}
                    fill="url(#currentGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Previous Period Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              Předchozí období
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={previousPeriod.volumeTrend}>
                  <defs>
                    <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    tickFormatter={formatVolume}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatVolume(value) + ' kg', 'Objem']}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    fill="url(#previousGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Changes */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Změna rozložení zátěže
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Categories */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Aktuální období
              </p>
              <div className="space-y-2">
                {currentPeriod.categoryDistribution.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{cat.category}</span>
                    <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Previous Categories */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                Předchozí období
              </p>
              <div className="space-y-2">
                {previousPeriod.categoryDistribution.slice(0, 5).map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{cat.category}</span>
                    <div className="w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
