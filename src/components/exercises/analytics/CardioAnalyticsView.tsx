import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { subDays, format, parseISO, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AnalyticsFiltersBar } from './AnalyticsFiltersBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Timer, Route, Zap, Heart, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';
import { formatTimeWithUnit, formatDistance } from '@/lib/timeUtils';

const formatDuration = formatTimeWithUnit;

export function CardioAnalyticsView() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [includeTests, setIncludeTests] = useState(false);
  const { data: clients = [] } = useClients();

  const days = period === 'custom' ? 90 : period;

  const { data, isLoading } = useQuery({
    queryKey: ['cardio-analytics', user?.id, days, selectedClientId, includeTests],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const startDate = subDays(new Date(), days);
      const dateStr = format(startDate, 'yyyy-MM-dd');

      let query = supabase
        .from('cardio_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateStr)
        .order('date', { ascending: true });

      if (!includeTests) {
        query = query.or('is_test.is.null,is_test.eq.false');
      }

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      // KPIs
      const totalDuration = (entries || []).reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      const totalDistance = (entries || []).reduce((sum, e) => sum + (e.distance_meters || 0), 0);
      const avgWatts = (entries || []).filter(e => e.avg_watts).length > 0
        ? Math.round((entries || []).filter(e => e.avg_watts).reduce((sum, e) => sum + (e.avg_watts || 0), 0) / (entries || []).filter(e => e.avg_watts).length)
        : null;
      const avgHR = (entries || []).filter(e => e.avg_heart_rate).length > 0
        ? Math.round((entries || []).filter(e => e.avg_heart_rate).reduce((sum, e) => sum + (e.avg_heart_rate || 0), 0) / (entries || []).filter(e => e.avg_heart_rate).length)
        : null;
      const prCount = (entries || []).filter(e => e.is_pr).length;

      // Weekly timeline
      const weekIntervals = eachWeekOfInterval(
        { start: startDate, end: new Date() },
        { weekStartsOn: 1 }
      );

      const timeline = weekIntervals.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekEntries = (entries || []).filter(e => {
          const d = parseISO(e.date);
          return d >= weekStart && d <= weekEnd;
        });

        return {
          label: format(weekStart, 'd.M', { locale: cs }),
          duration: weekEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 60,
          distance: weekEntries.reduce((sum, e) => sum + (e.distance_meters || 0), 0) / 1000,
        };
      });

      return {
        totalDuration,
        totalDistance,
        avgWatts,
        avgHR,
        prCount,
        entryCount: entries?.length || 0,
        timeline,
      };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-4">
      <AnalyticsFiltersBar
        period={period}
        onPeriodChange={setPeriod}
        clientId={selectedClientId}
        onClientChange={setSelectedClientId}
        clients={clients}
        includeTests={includeTests}
        onIncludeTestsChange={setIncludeTests}
      />

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-6 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          <Card className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Timer className="w-3 h-3" />
              <span className="text-[10px] uppercase">Čas</span>
            </div>
            <span className="text-lg font-bold">{formatDuration(data?.totalDuration || 0)}</span>
          </Card>
          <Card className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Route className="w-3 h-3" />
              <span className="text-[10px] uppercase">Vzdálenost</span>
            </div>
            <span className="text-lg font-bold">{formatDistance(data?.totalDistance || 0)}</span>
          </Card>
          <Card className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Zap className="w-3 h-3" />
              <span className="text-[10px] uppercase">Ø Watts</span>
            </div>
            <span className="text-lg font-bold">{data?.avgWatts ?? '-'}</span>
          </Card>
          <Card className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Heart className="w-3 h-3" />
              <span className="text-[10px] uppercase">Ø HR</span>
            </div>
            <span className="text-lg font-bold">{data?.avgHR ?? '-'}</span>
          </Card>
          <Card className="p-3 min-w-[120px] flex-shrink-0 sm:min-w-0 sm:flex-shrink snap-start">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] uppercase">PR</span>
            </div>
            <span className="text-lg font-bold">{data?.prCount || 0}</span>
          </Card>
        </div>
      )}

      {/* Duration Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trvání v čase (min/týden)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.timeline || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cardioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(0)} min`, 'Trvání']}
                  />
                  <Area
                    type="monotone"
                    dataKey="duration"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    fill="url(#cardioGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center py-4">
        Celkem {data?.entryCount || 0} kardio záznamů za období
      </p>
    </div>
  );
}
