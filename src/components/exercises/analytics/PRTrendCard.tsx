import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import { Badge } from '@/components/ui/badge';
import { usePRTrendWeekly, usePRStats } from '@/hooks/usePRTrend';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';

interface PRTrendCardProps {
  days?: number;
  clientId?: string | null;
  isLoading?: boolean;
}

export function PRTrendCard({ days = 90, clientId, isLoading: externalLoading }: PRTrendCardProps) {
  const { data: trendData = [], isLoading: trendLoading } = usePRTrendWeekly(days, clientId);
  const { data: stats, isLoading: statsLoading } = usePRStats(days, clientId);

  const isLoading = externalLoading || trendLoading || statsLoading;

  const getTrendIcon = () => {
    if (!stats) return <Minus className="w-4 h-4" />;
    if (stats.change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (stats.change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendBadgeVariant = (): 'default' | 'secondary' | 'destructive' => {
    if (!stats) return 'secondary';
    if (stats.change > 0) return 'default';
    if (stats.change < 0) return 'destructive';
    return 'secondary';
  };

  return (
    <AnalyticsCard
      title="Osobní rekordy"
      icon={Trophy}
      helpText="Vývoj počtu osobních rekordů (PR) v čase. Sloupcový graf = nové PR za týden, čára = kumulativní součet."
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {/* Stats header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{stats?.currentCount || 0}</span>
            <span className="text-muted-foreground text-sm">PR za období</span>
          </div>
          <Badge variant={getTrendBadgeVariant()} className="flex items-center gap-1">
            {getTrendIcon()}
            {stats?.change !== undefined && stats.change >= 0 ? '+' : ''}{stats?.change || 0}
            {stats?.changePercent !== undefined && stats.previousCount > 0 && (
              <span className="text-xs">({stats.changePercent}%)</span>
            )}
          </Badge>
        </div>

        {/* Chart */}
        {trendData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'count' ? 'Nové PR' : 'Celkem PR',
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Žádná data za vybrané období
          </div>
        )}

        {/* Top exercises with PRs */}
        {stats?.topExercises && stats.topExercises.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Nejčastější PR</p>
            <div className="flex flex-wrap gap-1.5">
              {stats.topExercises.slice(0, 3).map((ex, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ex.name} ({ex.count}×)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
