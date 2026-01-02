import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Dumbbell, Sparkles, TrendingUp, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfMonth, startOfWeek, format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface LeaderboardEntry {
  clientId: string;
  name: string;
  value: number;
  unit: string;
}

function LeaderboardList({ 
  entries, 
  emptyMessage,
  icon: Icon 
}: { 
  entries: LeaderboardEntry[];
  emptyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const position = index + 1;
        return (
          <div
            key={entry.clientId}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg transition-colors',
              'bg-secondary/30 hover:bg-secondary/50',
              position <= 3 && 'font-semibold'
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                position === 1 && 'bg-yellow-500/20 text-yellow-600',
                position === 2 && 'bg-slate-400/20 text-slate-600',
                position === 3 && 'bg-orange-500/20 text-orange-600',
                position > 3 && 'bg-muted text-muted-foreground'
              )}>
                {position <= 3 ? <Medal className="w-4 h-4" /> : position}
              </span>
              <span>{entry.name}</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {entry.value} {entry.unit}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function TrainerLeaderboards() {
  const [period, setPeriod] = useState<'week' | 'month'>('month');

  const periodStart = period === 'week' 
    ? startOfWeek(new Date(), { weekStartsOn: 1 })
    : startOfMonth(new Date());

  // Workouts leaderboard
  const { data: workoutsData, isLoading: workoutsLoading } = useQuery({
    queryKey: ['trainer-leaderboard-workouts', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get trainer's clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('is_system', false);

      if (!clients?.length) return [];

      const clientIds = clients.map(c => c.id);
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Get confirmed workouts
      const { data: workouts } = await supabase
        .from('client_confirmed_workouts')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('performed_at', periodStart.toISOString());

      // Count by client
      const counts: Record<string, number> = {};
      workouts?.forEach(w => {
        counts[w.client_id] = (counts[w.client_id] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([clientId, count]) => ({
          clientId,
          name: clientMap.get(clientId) || 'Neznámý',
          value: count,
          unit: 'tréninků',
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  // XP leaderboard
  const { data: xpData, isLoading: xpLoading } = useQuery({
    queryKey: ['trainer-leaderboard-xp', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('is_system', false);

      if (!clients?.length) return [];

      const clientIds = clients.map(c => c.id);
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Get XP data
      const { data: xpRecords } = await supabase
        .from('client_xp')
        .select('client_id, total_xp, level')
        .in('client_id', clientIds);

      return (xpRecords || [])
        .map(xp => ({
          clientId: xp.client_id,
          name: clientMap.get(xp.client_id) || 'Neznámý',
          value: xp.total_xp,
          unit: 'XP',
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  // PRs leaderboard (this month)
  const { data: prsData, isLoading: prsLoading } = useQuery({
    queryKey: ['trainer-leaderboard-prs', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .eq('is_system', false);

      if (!clients?.length) return [];

      const clientIds = clients.map(c => c.id);
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Get PRs
      const { data: prs } = await supabase
        .from('client_prs')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('achieved_at', periodStart.toISOString());

      const counts: Record<string, number> = {};
      prs?.forEach(pr => {
        counts[pr.client_id] = (counts[pr.client_id] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([clientId, count]) => ({
          clientId,
          name: clientMap.get(clientId) || 'Neznámý',
          value: count,
          unit: 'PR',
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  const isLoading = workoutsLoading || xpLoading || prsLoading;

  const periodLabel = period === 'week' 
    ? `Týden od ${format(periodStart, 'd.M.', { locale: cs })}`
    : format(periodStart, 'LLLL yyyy', { locale: cs });

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Žebříčky klientů
        </h2>
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setPeriod('week')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              period === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            )}
          >
            Týden
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              period === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            )}
          >
            Měsíc
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{periodLabel}</p>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px]" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Workouts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-blue-500" />
                Tréninky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList 
                entries={workoutsData || []}
                emptyMessage="Žádné tréninky v tomto období"
                icon={Dumbbell}
              />
            </CardContent>
          </Card>

          {/* XP */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Celkové XP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList 
                entries={xpData || []}
                emptyMessage="Žádná XP data"
                icon={Sparkles}
              />
            </CardContent>
          </Card>

          {/* PRs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Osobní rekordy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList 
                entries={prsData || []}
                emptyMessage="Žádné PR v tomto období"
                icon={TrendingUp}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
