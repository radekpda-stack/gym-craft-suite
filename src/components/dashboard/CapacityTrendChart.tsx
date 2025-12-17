import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Gauge, TrendingUp, TrendingDown, Minus, Settings2 } from 'lucide-react';
import { useCapacityTrend } from '@/hooks/useCapacityTrend';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { Link } from 'react-router-dom';

export function CapacityTrendChart() {
  const { data, isLoading } = useCapacityTrend();
  const { isConfigured, isLoading: settingsLoading } = useCapacitySettings();

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;

    const avgUtilization = Math.round(
      data.reduce((sum, d) => sum + d.utilizationPercent, 0) / data.length
    );
    const maxWeek = data.reduce((max, d) => 
      d.utilizationPercent > max.utilizationPercent ? d : max, data[0]
    );
    const minWeek = data.reduce((min, d) => 
      d.utilizationPercent < min.utilizationPercent ? d : min, data[0]
    );

    // Trend calculation
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.utilizationPercent, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.utilizationPercent, 0) / (secondHalf.length || 1);
    const trendPercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      avgUtilization,
      maxWeek: maxWeek.label,
      maxValue: maxWeek.utilizationPercent,
      minWeek: minWeek.label,
      minValue: minWeek.utilizationPercent,
      trendPercent: Math.round(trendPercent),
      trendDirection: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable',
    };
  }, [data]);

  if (settingsLoading || isLoading) {
    return <ChartSkeleton headerWidth="w-48" />;
  }

  if (!isConfigured) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Trend obsazenosti</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Settings2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">Nastavte kapacitu</p>
          <p className="text-sm text-muted-foreground mb-3">Pro zobrazení trendu obsazenosti je potřeba nastavit pracovní hodiny a dny</p>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Nastavit kapacitu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Trend obsazenosti</h3>
        </div>
        {summary && (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-primary">{summary.avgUtilization}%</span>
            {summary.trendDirection === 'up' && (
              <TrendingUp className="w-4 h-4 text-success" />
            )}
            {summary.trendDirection === 'down' && (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            {summary.trendDirection === 'stable' && (
              <Minus className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {data && data.length > 0 ? (
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="capacityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${props.payload.occupiedSlots}/${props.payload.availableSlots} slotů)`,
                  'Obsazenost',
                ]}
              />
              <ReferenceLine 
                y={80} 
                stroke="hsl(var(--success))" 
                strokeDasharray="3 3" 
                strokeOpacity={0.6}
              />
              <ReferenceLine 
                y={50} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="3 3" 
                strokeOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="utilizationPercent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#capacityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon={Gauge}
          title="Žádná data"
          description="V tomto období nejsou žádné tréninky"
          size="sm"
        />
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Průměr</p>
            <p className="text-sm sm:text-base font-bold text-foreground">{summary.avgUtilization}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Maximum</p>
            <p className="text-sm sm:text-base font-bold text-success">{summary.maxValue}%</p>
            <p className="text-[10px] text-muted-foreground truncate">{summary.maxWeek}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Minimum</p>
            <p className="text-sm sm:text-base font-bold text-warning">{summary.minValue}%</p>
            <p className="text-[10px] text-muted-foreground truncate">{summary.minWeek}</p>
          </div>
        </div>
      )}
    </div>
  );
}
