import { CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format, eachWeekOfInterval, endOfWeek, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

interface TrainingFrequencyCardProps {
  days?: number;
  clientId?: string | null;
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Frekvence tréninků',
  description: 'Počet tréninkových dní za týden. Ukazuje konzistenci a pravidelnost tréninku.',
  calculation: 'Počet unikátních dní s alespoň jedním záznamem cviku za každý týden. Průměr = celkový počet tréninkových dní ÷ počet týdnů.',
};

export function TrainingFrequencyCard({ days = 90, clientId, isLoading: externalLoading }: TrainingFrequencyCardProps) {
  const { user } = useAuth();

  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['training-frequency', user?.id, days, clientId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const now = new Date();
      const startDate = subDays(now, days);

      let query = supabase
        .from('exercise_entries')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'));

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      // Get unique training days
      const allDays = new Set(entries?.map(e => e.date) || []);

      // Group by week
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );

      const weeklyData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekDays = new Set(
          entries?.filter(e => {
            const d = new Date(e.date);
            return d >= weekStart && d <= weekEnd;
          }).map(e => e.date) || []
        );

        return {
          date: format(weekStart, 'yyyy-MM-dd'),
          label: format(weekStart, 'd.M', { locale: cs }),
          trainingDays: weekDays.size,
          entries: entries?.filter(e => {
            const d = new Date(e.date);
            return d >= weekStart && d <= weekEnd;
          }).length || 0,
        };
      });

      // Calculate stats
      const totalWeeks = weeks.length;
      const avgPerWeek = totalWeeks > 0
        ? weeklyData.reduce((sum, w) => sum + w.trainingDays, 0) / totalWeeks
        : 0;

      // Trend: compare last half to first half
      const midPoint = Math.floor(weeklyData.length / 2);
      const firstHalf = weeklyData.slice(0, midPoint);
      const secondHalf = weeklyData.slice(midPoint);

      const firstHalfAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, w) => sum + w.trainingDays, 0) / firstHalf.length
        : 0;
      const secondHalfAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, w) => sum + w.trainingDays, 0) / secondHalf.length
        : 0;

      const change = secondHalfAvg - firstHalfAvg;
      const changePercent = firstHalfAvg > 0 
        ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        : 0;

      return {
        weeklyData,
        totalDays: allDays.size,
        avgPerWeek: Math.round(avgPerWeek * 10) / 10,
        change: Math.round(change * 10) / 10,
        changePercent,
        maxWeek: Math.max(...weeklyData.map(w => w.trainingDays)),
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = externalLoading || dataLoading;

  const getTrendIcon = () => {
    if (!data) return <Minus className="w-4 h-4" />;
    if (data.change > 0.5) return <TrendingUp className="w-4 h-4 text-success" />;
    if (data.change < -0.5) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendVariant = (): 'default' | 'secondary' | 'destructive' => {
    if (!data) return 'secondary';
    if (data.change > 0.5) return 'default';
    if (data.change < -0.5) return 'destructive';
    return 'secondary';
  };

  return (
    <AnalyticsCard
      title="Frekvence tréninků"
      icon={CalendarDays}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {/* Stats header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{data?.avgPerWeek || 0}</span>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">dní/týden</span>
              <span className="text-xs text-muted-foreground">{data?.totalDays || 0} celkem</span>
            </div>
          </div>
          <Badge variant={getTrendVariant()} className="flex items-center gap-1">
            {getTrendIcon()}
            {data?.change !== undefined && data.change > 0 ? '+' : ''}{data?.change || 0}
            {data?.changePercent !== undefined && data.changePercent !== 0 && (
              <span className="text-xs">({data.changePercent > 0 ? '+' : ''}{data.changePercent}%)</span>
            )}
          </Badge>
        </div>

        {/* Chart */}
        {data?.weeklyData && data.weeklyData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 7]}
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
                  formatter={(value: number, name: string) => [
                    `${value} ${value === 1 ? 'den' : value < 5 ? 'dny' : 'dní'}`,
                    'Tréninkové dny'
                  ]}
                />
                <ReferenceLine y={data.avgPerWeek} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                <Bar
                  dataKey="trainingDays"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Žádná data za vybrané období
          </div>
        )}

        {/* Additional stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Nejaktivnější týden</div>
            <div className="font-medium">{data?.maxWeek || 0} dní</div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Konzistence</div>
            <div className="font-medium">
              {data?.avgPerWeek && data.avgPerWeek >= 3 ? '✓ Dobrá' : data?.avgPerWeek && data.avgPerWeek >= 2 ? '~ Průměrná' : '✗ Nízká'}
            </div>
          </div>
        </div>
      </div>
    </AnalyticsCard>
  );
}
