import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
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
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PainHistoryCardProps {
  clientId: string;
}

const AREA_LABELS: Record<string, string> = {
  neck: 'Krk',
  shoulder: 'Rameno',
  chest: 'Hrudník',
  upper_back: 'Horní záda',
  lower_back: 'Dolní záda',
  hip: 'Kyčel',
  glutes: 'Hýždě',
  knee: 'Koleno',
  hamstring: 'Zadní stehno',
  calf: 'Lýtko',
  ankle: 'Kotník',
  wrist: 'Zápěstí',
  elbow: 'Loket',
  other: 'Jiné',
};

const chartConfig = {
  pain: {
    label: 'Intenzita bolesti',
    color: 'hsl(var(--destructive))',
  },
};

export function PainHistoryCard({ clientId }: PainHistoryCardProps) {
  const { data, isLoading } = usePainHistory(clientId);

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

  // Prepare chart data - reverse to show oldest first
  const chartData = [...entries]
    .reverse()
    .slice(-15) // Last 15 entries for readability
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

  // Calculate trend
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
        {/* Pain intensity timeline chart */}
        {chartData.length >= 2 && (
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
                <div key={stat.area} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {AREA_LABELS[stat.area] || stat.area}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {stat.count}×
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
