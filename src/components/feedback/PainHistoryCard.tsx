import { useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePainHistory } from '@/hooks/usePainHistory';
import { cn } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  ReferenceLine,
  Legend,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface PainHistoryCardProps {
  clientId: string;
}

const AREA_LABELS: Record<string, string> = {
  neck: 'Krk',
  shoulder: 'Rameno',
  shoulder_left: 'Rameno L',
  shoulder_right: 'Rameno P',
  chest: 'Hrudník',
  upper_back: 'Horní záda',
  lower_back: 'Dolní záda',
  hip: 'Kyčel',
  hip_left: 'Kyčel L',
  hip_right: 'Kyčel P',
  glutes: 'Hýždě',
  knee: 'Koleno',
  knee_left: 'Koleno L',
  knee_right: 'Koleno P',
  hamstring: 'Zadní stehno',
  hamstring_left: 'Zadní stehno L',
  hamstring_right: 'Zadní stehno P',
  calf: 'Lýtko',
  calf_left: 'Lýtko L',
  calf_right: 'Lýtko P',
  ankle: 'Kotník',
  ankle_left: 'Kotník L',
  ankle_right: 'Kotník P',
  wrist: 'Zápěstí',
  wrist_left: 'Zápěstí L',
  wrist_right: 'Zápěstí P',
  elbow: 'Loket',
  elbow_left: 'Loket L',
  elbow_right: 'Loket P',
  other: 'Jiné',
};

const AREA_COLORS: Record<string, string> = {
  neck: '#ef4444',
  shoulder: '#f97316',
  shoulder_left: '#f97316',
  shoulder_right: '#fb923c',
  upper_back: '#eab308',
  lower_back: '#84cc16',
  hip: '#22c55e',
  hip_left: '#22c55e',
  hip_right: '#4ade80',
  glutes: '#14b8a6',
  knee: '#06b6d4',
  knee_left: '#06b6d4',
  knee_right: '#22d3ee',
  hamstring: '#0ea5e9',
  hamstring_left: '#0ea5e9',
  hamstring_right: '#38bdf8',
  calf: '#3b82f6',
  calf_left: '#3b82f6',
  calf_right: '#60a5fa',
  ankle: '#8b5cf6',
  ankle_left: '#8b5cf6',
  ankle_right: '#a78bfa',
  wrist: '#a855f7',
  wrist_left: '#a855f7',
  wrist_right: '#c084fc',
  elbow: '#d946ef',
  elbow_left: '#d946ef',
  elbow_right: '#e879f9',
  chest: '#ec4899',
  other: '#6b7280',
};

const chartConfig = {
  pain: {
    label: 'Intenzita bolesti',
    color: 'hsl(var(--destructive))',
  },
};

export function PainHistoryCard({ clientId }: PainHistoryCardProps) {
  const { data, isLoading } = usePainHistory(clientId);

  const { intensityChartData, activeAreas, intensityTrend } = useMemo(() => {
    if (!data?.intensityTrend || data.intensityTrend.length < 2) {
      return { intensityChartData: [], activeAreas: [], intensityTrend: null };
    }

    // Collect all unique areas
    const allAreas = new Set<string>();
    data.intensityTrend.forEach(entry => {
      Object.keys(entry.areas).forEach(area => allAreas.add(area));
    });

    // Build chart data
    const chartData = data.intensityTrend.map(entry => {
      const point: Record<string, any> = {
        date: format(new Date(entry.date), 'd.M.', { locale: cs }),
        fullDate: format(new Date(entry.date), 'd.M.yyyy', { locale: cs }),
      };
      Object.entries(entry.areas).forEach(([area, intensity]) => {
        point[area] = intensity;
      });
      return point;
    });

    // Calculate trend
    let trendDirection: 'up' | 'down' | 'stable' | null = null;
    if (chartData.length >= 4) {
      const midpoint = Math.floor(chartData.length / 2);
      const firstHalf = chartData.slice(0, midpoint);
      const secondHalf = chartData.slice(midpoint);

      const calcAvg = (items: typeof chartData) => {
        let sum = 0, count = 0;
        items.forEach(d => {
          Object.entries(d).forEach(([k, v]) => {
            if (!['date', 'fullDate'].includes(k) && typeof v === 'number') {
              sum += v;
              count++;
            }
          });
        });
        return count > 0 ? sum / count : 0;
      };

      const avgFirst = calcAvg(firstHalf);
      const avgSecond = calcAvg(secondHalf);
      const diff = avgSecond - avgFirst;
      
      if (diff > 0.5) trendDirection = 'up';
      else if (diff < -0.5) trendDirection = 'down';
      else trendDirection = 'stable';
    }

    return {
      intensityChartData: chartData,
      activeAreas: Array.from(allAreas),
      intensityTrend: trendDirection,
    };
  }, [data?.intensityTrend]);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Historie bolestí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { entries, stats } = data || { entries: [], stats: [] };
  const chronicAreas = stats.filter(s => s.isChronic);

  if (stats.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Historie bolestí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zatím žádné záznamy o bolestech z feedbacků.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stats.map(s => s.count));

  // Prepare simple chart data for overall pain
  const chartData = [...entries]
    .reverse()
    .slice(-15)
    .map((entry) => ({
      date: format(new Date(entry.training_date), 'd.M.', { locale: cs }),
      pain: entry.pain,
      fullDate: format(new Date(entry.training_date), 'd.M.yyyy', { locale: cs }),
      area: entry.pain_area 
        ? entry.pain_area.split(',').map(a => 
            AREA_LABELS[a.trim().replace(/_left|_right|_both/g, '')] || a.trim()
          ).join(', ')
        : 'Neurčeno',
    }));

  // Calculate overall trend
  const recentEntries = entries.slice(0, 5);
  const olderEntries = entries.slice(5, 10);
  const recentAvg = recentEntries.length > 0 
    ? recentEntries.reduce((sum, e) => sum + (e.pain || 0), 0) / recentEntries.length 
    : 0;
  const olderAvg = olderEntries.length > 0 
    ? olderEntries.reduce((sum, e) => sum + (e.pain || 0), 0) / olderEntries.length 
    : recentAvg;
  const trend = recentAvg - olderAvg;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Historie bolestí
          </CardTitle>
          <div className="flex items-center gap-2">
            {olderEntries.length > 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs flex items-center gap-1",
                  trend > 0.5 && "border-destructive text-destructive",
                  trend < -0.5 && "border-green-500 text-green-500"
                )}
              >
                {trend > 0.5 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend < -0.5 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                {trend > 0.5 ? 'Zhoršení' : trend < -0.5 ? 'Zlepšení' : 'Stabilní'}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {entries.length} záznamů
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chronic areas warning */}
        {chronicAreas.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-destructive font-medium">
                {chronicAreas.length} chronick{chronicAreas.length === 1 ? 'á oblast' : chronicAreas.length < 5 ? 'é oblasti' : 'ých oblastí'}
              </span>
              <p className="text-xs text-destructive/80 mt-0.5">
                {chronicAreas.map(a => AREA_LABELS[a.area] || a.area).join(', ')} — opakuje se &gt;3× za měsíc
              </p>
            </div>
          </div>
        )}
        {/* Per-area intensity trend chart */}
        {intensityChartData.length >= 2 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                Vývoj intenzity bolesti dle oblasti
              </p>
              {intensityTrend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  intensityTrend === 'down' && "text-green-500",
                  intensityTrend === 'up' && "text-destructive",
                  intensityTrend === 'stable' && "text-muted-foreground"
                )}>
                  {intensityTrend === 'down' && <TrendingDown className="w-3 h-3" />}
                  {intensityTrend === 'up' && <TrendingUp className="w-3 h-3" />}
                  {intensityTrend === 'stable' && <Minus className="w-3 h-3" />}
                  <span>
                    {intensityTrend === 'down' ? 'Zlepšuje se' : 
                     intensityTrend === 'up' ? 'Zhoršuje se' : 
                     'Stabilní'}
                  </span>
                </div>
              )}
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={intensityChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 5, 10]}
                  />
                  <ReferenceLine y={7} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    labelFormatter={(label) => `Datum: ${label}`}
                    formatter={(value: number, name: string) => [
                      `${value}/10`,
                      AREA_LABELS[name] || name
                    ]}
                  />
                  <Legend 
                    formatter={(value) => AREA_LABELS[value] || value}
                    wrapperStyle={{ fontSize: '10px' }}
                  />
                  {activeAreas.map(area => (
                    <Line
                      key={area}
                      type="monotone"
                      dataKey={area}
                      stroke={AREA_COLORS[area] || '#888'}
                      strokeWidth={2}
                      dot={{ r: 2, fill: AREA_COLORS[area] || '#888' }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Červená čára = hranice vysoké bolesti (7)
            </p>
          </div>
        )}

        {/* Simple pain intensity timeline (fallback when no per-area data) */}
        {chartData.length >= 2 && intensityChartData.length < 2 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Vývoj intenzity bolesti v čase
            </p>
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[0, 10]} 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 5, 10]}
                />
                <ReferenceLine y={7} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, item) => (
                        <div className="space-y-1">
                          <p className="font-medium">Bolest: {value}/10</p>
                          <p className="text-xs text-muted-foreground">{item.payload.area}</p>
                        </div>
                      )}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    />
                  }
                />
                <Line 
                  type="monotone" 
                  dataKey="pain" 
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: 'hsl(var(--destructive))' }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {/* Pain area frequency chart */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            Nejčastější oblasti bolesti
          </p>
          <div className="space-y-2">
            {stats.slice(0, 5).map((stat) => {
              const percentage = (stat.count / maxCount) * 100;
              const painLevel = stat.avgPain >= 7 ? 'high' : stat.avgPain >= 4 ? 'medium' : 'low';
              
              return (
                <div 
                  key={stat.area} 
                  className={cn(
                    "space-y-1 p-2 -mx-2 rounded-lg transition-colors",
                    stat.isChronic && "border-l-2 border-l-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {AREA_LABELS[stat.area] || stat.area}
                      </span>
                      {stat.isChronic && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          Chronické
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {stat.count}× {stat.isChronic && `(${stat.countLast30Days}× /30d)`}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          painLevel === 'high' && "border-destructive text-destructive",
                          painLevel === 'medium' && "border-warning text-warning",
                          painLevel === 'low' && "border-muted-foreground"
                        )}
                      >
                        ⌀ {stat.avgPain}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2",
                      painLevel === 'high' && "[&>div]:bg-destructive",
                      painLevel === 'medium' && "[&>div]:bg-warning",
                      painLevel === 'low' && "[&>div]:bg-primary"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent pain entries */}
        {entries.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">
              Poslední záznamy
            </p>
            <div className="space-y-1.5">
              {entries.slice(0, 3).map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {format(new Date(entry.training_date), 'd.M.', { locale: cs })}
                    </span>
                    <span className="font-medium">
                      {entry.pain_area 
                        ? entry.pain_area.split(',').map(a => 
                            AREA_LABELS[a.trim().replace(/_left|_right|_both/g, '')] || a.trim()
                          ).join(', ')
                        : 'Neurčeno'
                      }
                    </span>
                  </div>
                  <Badge 
                    variant={entry.pain >= 7 ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {entry.pain}/10
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
