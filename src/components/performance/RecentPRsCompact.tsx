/**
 * RecentPRsCompact - Compact list of last 5 PRs for the Overview tab
 * Replaces the heavy PRHistoryContent table
 */
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format as fmtDate } from 'date-fns';

interface RecentPR {
  id: string;
  date: string;
  exerciseName: string;
  clientName: string;
  value: number;
  unit: string;
}

export function RecentPRsCompact() {
  const { data: prs = [], isLoading } = useRecentGlobalPRs();

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-sm text-foreground">Nedávné PR</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Žádná osobní maxima za posledních 30 dní
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-sm text-foreground">Nedávné PR</h3>
          <Badge variant="secondary" className="text-[10px]">30 dní</Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        {prs.map(pr => (
          <div
            key={pr.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg',
              'bg-background/60 border border-border/30',
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {pr.exerciseName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pr.clientName} · {format(parseISO(pr.date), 'd. M.', { locale: cs })}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {pr.value} {pr.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useRecentGlobalPRs() {
  const { user } = useAuth();
  const thirtyDaysAgo = fmtDate(subDays(new Date(), 30), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['recent-global-prs', user?.id],
    queryFn: async (): Promise<RecentPR[]> => {
      if (!user?.id) return [];

      const [strengthResult, cardioResult, skillResult] = await Promise.all([
        supabase
          .from('exercise_entries')
          .select('id, date, exercise_name, weight_kg, reps, time_seconds, client_id, clients(name)')
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false })
          .limit(10),
        supabase
          .from('cardio_entries')
          .select('id, date, exercise_name, avg_watts, duration_seconds, client_id, clients(name)')
          .eq('user_id', user.id)
          .eq('is_pr', true)
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false })
          .limit(5),
        supabase
          .from('skill_entries')
          .select('id, date, exercise_name, successful, duration_seconds, client_id, clients(name)')
          .eq('user_id', user.id)
          .eq('is_breakthrough', true)
          .gte('date', thirtyDaysAgo)
          .order('date', { ascending: false })
          .limit(5),
      ]);

      const all: RecentPR[] = [];

      (strengthResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.weight_kg || e.time_seconds || e.reps || 0;
        const unit = e.weight_kg ? 'kg' : e.time_seconds ? 's' : 'reps';
        all.push({ id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?', value, unit });
      });

      (cardioResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.avg_watts || e.duration_seconds || 0;
        const unit = e.avg_watts ? 'W' : 's';
        all.push({ id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?', value, unit });
      });

      (skillResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.successful || e.duration_seconds || 0;
        const unit = e.successful != null ? 'úsp.' : 's';
        all.push({ id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?', value, unit });
      });

      all.sort((a, b) => b.date.localeCompare(a.date));
      return all.slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
