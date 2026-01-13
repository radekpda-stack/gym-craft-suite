import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { subDays, format, parseISO, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AnalyticsFiltersBar } from './AnalyticsFiltersBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, FileText, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';

export function SkillAnalyticsView() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [includeTests, setIncludeTests] = useState(false);
  const { data: clients = [] } = useClients();

  const days = period === 'custom' ? 90 : period;

  const { data, isLoading } = useQuery({
    queryKey: ['skill-analytics', user?.id, days, selectedClientId, includeTests],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      const startDate = subDays(new Date(), days);
      const dateStr = format(startDate, 'yyyy-MM-dd');

      let query = supabase
        .from('skill_entries')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .gte('date', dateStr)
        .order('date', { ascending: false });

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

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
          count: weekEntries.length,
        };
      });

      // Recent entries with notes
      const recentWithNotes = (entries || [])
        .filter(e => e.notes && e.notes.trim())
        .slice(0, 10);

      // Unique skill names count (skill_entries uses exercise_name)
      const uniqueSkills = new Set((entries || []).map(e => e.exercise_name)).size;
      const uniqueDays = new Set((entries || []).map(e => e.date)).size;

      return {
        totalCount: entries?.length || 0,
        uniqueSkills,
        uniqueDays,
        timeline,
        recentWithNotes,
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
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-3">
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-6 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Brain className="w-3 h-3" />
              <span className="text-[10px] uppercase">Záznamy</span>
            </div>
            <span className="text-lg font-bold">{data?.totalCount || 0}</span>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <FileText className="w-3 h-3" />
              <span className="text-[10px] uppercase">Unikátní skilly</span>
            </div>
            <span className="text-lg font-bold">{data?.uniqueSkills || 0}</span>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              <span className="text-[10px] uppercase">Dní s tréninkem</span>
            </div>
            <span className="text-lg font-bold">{data?.uniqueDays || 0}</span>
          </Card>
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Skill záznamy v čase</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.timeline || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                    width={25}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [value, 'Záznamy']}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--chart-5))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notes */}
      {data?.recentWithNotes && data.recentWithNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Poslední poznámky</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {data.recentWithNotes.map((entry: any) => (
                  <div key={entry.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{entry.exercise_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(entry.date), 'd.M.yyyy', { locale: cs })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
                    {entry.clients?.name && (
                      <span className="text-[10px] text-muted-foreground">
                        {entry.clients.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
