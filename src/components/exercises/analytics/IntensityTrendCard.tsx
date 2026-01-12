import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';

interface IntensityTrendCardProps {
  days?: number;
  clientId?: string | null;
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Trend intenzity (RPE)',
  description: 'Průměrná vnímaná náročnost tréninků (RPE - Rate of Perceived Exertion) v čase. Škála 1-10, kde 10 je maximální úsilí.',
  calculation: 'Průměr = Σ RPE hodnot za týden ÷ počet záznamů s RPE. Zobrazují se pouze záznamy, kde bylo RPE zadáno.',
};

const RPE_ZONES = [
  { min: 1, max: 4, label: 'Lehké', color: 'text-green-500' },
  { min: 5, max: 6, label: 'Střední', color: 'text-yellow-500' },
  { min: 7, max: 8, label: 'Těžké', color: 'text-orange-500' },
  { min: 9, max: 10, label: 'Maximální', color: 'text-red-500' },
];

function getRpeZone(rpe: number) {
  return RPE_ZONES.find(z => rpe >= z.min && rpe <= z.max) || RPE_ZONES[0];
}

export function IntensityTrendCard({ days = 90, clientId, isLoading: externalLoading }: IntensityTrendCardProps) {
  const { user } = useAuth();

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['intensity-trend', user?.id, days, clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const startDate = subDays(now, days);

      let query = supabase
        .from('exercise_entries')
        .select('date, rpe')
        .eq('user_id', user.id)
        .gt('rpe', 0)
        .gte('date', format(startDate, 'yyyy-MM-dd'));

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      // Group by week
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );

      const weeklyData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEntries = entries?.filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        }) || [];

        const avgRpe = weekEntries.length > 0
          ? weekEntries.reduce((sum, e) => sum + (e.rpe || 0), 0) / weekEntries.length
          : null;

        return {
          date: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          avgRpe: avgRpe ? Math.round(avgRpe * 10) / 10 : null,
          count: weekEntries.length,
        };
      }).filter(w => w.avgRpe !== null);

      // Calculate overall stats
      const allRpeValues = entries?.map(e => e.rpe || 0) || [];
      const overallAvg = allRpeValues.length > 0
        ? allRpeValues.reduce((a, b) => a + b, 0) / allRpeValues.length
        : 0;

      // Trend: compare last half to first half
      const midPoint = Math.floor(weeklyData.length / 2);
      const firstHalf = weeklyData.slice(0, midPoint);
      const secondHalf = weeklyData.slice(midPoint);

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, w) => sum + (w.avgRpe || 0), 0) / firstHalf.length
        : 0;
      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, w) => sum + (w.avgRpe || 0), 0) / secondHalf.length
        : 0;

      const change = secondHalfAvg - firstHalfAvg;

      return {
        weeklyData,
        overallAvg: Math.round(overallAvg * 10) / 10,
        totalEntries: allRpeValues.length,
        change: Math.round(change * 10) / 10,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = externalLoading || dataLoading;

  const getTrendIcon = () => {
    if (!data) return <Minus className="w-4 h-4" />;
    if (data.change > 0.5) return <TrendingUp className="w-4 h-4 text-orange-500" />;
    if (data.change < -0.5) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const zone = data ? getRpeZone(data.overallAvg) : RPE_ZONES[0];

  return (
    <AnalyticsCard
      title="Intenzita (RPE)"
      icon={Activity}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      emptyMessage={data?.totalEntries === 0 ? 'Žádná data o intenzitě za období' : undefined}
    >
      <div className="space-y-4">
        {/* Stats header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{data?.overallAvg || '-'}</span>
            <div className="flex flex-col">
              <span className={`text-xs font-medium ${zone.color}`}>{zone.label}</span>
              <span className="text-muted-foreground text-xs">{data?.totalEntries || 0} záznamů</span>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getTrendIcon()}
            {data?.change !== undefined && data.change > 0 ? '+' : ''}{data?.change || 0}
          </Badge>
        </div>

        {/* Chart */}
        {data?.weeklyData && data.weeklyData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyData}>
                <defs>
                  <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 10]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={25}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`RPE ${value}`, 'Průměr']}
                />
                <ReferenceLine y={7} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="avgRpe"
                  stroke="hsl(var(--primary))"
                  fill="url(#rpeGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Žádná data s RPE za vybrané období
          </div>
        )}

        {/* RPE Scale Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {RPE_ZONES.map((zone) => (
            <span key={zone.label} className={`${zone.color} flex items-center gap-1`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {zone.min}-{zone.max}: {zone.label}
            </span>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  );
}
