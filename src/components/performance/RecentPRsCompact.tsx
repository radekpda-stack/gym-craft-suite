/**
 * RecentPRsCompact - Compact list of last 5 PRs for the Overview tab
 * Replaces the heavy PRHistoryContent table
 */
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Dumbbell, Heart, Zap, Timer, Ruler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format as fmtDate } from 'date-fns';

type PRType = 'strength' | 'cardio' | 'skill';

interface RecentPR {
  id: string;
  date: string;
  exerciseName: string;
  clientName: string;
  value: number;
  unit: string;
  type: PRType;
  // Rich display
  timeSeconds?: number | null;
  distanceMeters?: number | null;
  avgWatts?: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function TypeIcon({ type }: { type: PRType }) {
  if (type === 'cardio') return <Heart className="w-3.5 h-3.5 text-success" />;
  if (type === 'skill') return <Zap className="w-3.5 h-3.5 text-warning" />;
  return <Dumbbell className="w-3.5 h-3.5 text-primary" />;
}

function TypeBadge({ type }: { type: PRType }) {
  if (type === 'cardio') return (
    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/30">Kardio</Badge>
  );
  if (type === 'skill') return (
    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-warning/10 text-warning border-warning/30">Plyo</Badge>
  );
  return (
    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">Síla</Badge>
  );
}

function PRValueDisplay({ pr }: { pr: RecentPR }) {
  // Kardio: čas + vzdálenost + watty
  if (pr.type === 'cardio') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {pr.timeSeconds && (
          <span className="flex items-center gap-0.5 font-bold text-sm tabular-nums">
            <Timer className="w-3 h-3 text-muted-foreground" />
            {formatTime(pr.timeSeconds)}
          </span>
        )}
        {pr.distanceMeters && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
            <Ruler className="w-3 h-3" />
            {Math.round(pr.distanceMeters)} m
          </span>
        )}
        {pr.avgWatts && (
          <span className="flex items-center gap-0.5 text-xs text-warning font-semibold tabular-nums">
            <Zap className="w-3 h-3" />
            {Math.round(pr.avgWatts)} W
          </span>
        )}
        {!pr.timeSeconds && !pr.distanceMeters && (
          <span className="font-bold text-sm tabular-nums">{pr.value} {pr.unit}</span>
        )}
      </div>
    );
  }

  // Síla / Plyo: číslo + jednotka
  return (
    <span className="font-bold text-sm tabular-nums">{pr.value} {pr.unit}</span>
  );
}

export function RecentPRsCompact() {
  const { data: prs = [], isLoading } = useRecentGlobalPRs();

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
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
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-warning" />
        <h3 className="font-semibold text-sm text-foreground">Nedávné PR</h3>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">30 dní</Badge>
      </div>

      <div className="space-y-2">
        {prs.map(pr => {
          const borderColor = pr.type === 'cardio' ? 'border-l-success'
            : pr.type === 'skill' ? 'border-l-warning'
            : 'border-l-primary';

          return (
            <div
              key={pr.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4',
                'bg-background/60 border border-border/30',
                borderColor,
              )}
            >
              {/* Type icon */}
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                pr.type === 'cardio' ? 'bg-success/10'
                  : pr.type === 'skill' ? 'bg-warning/10'
                  : 'bg-primary/10'
              )}>
                <TypeIcon type={pr.type} />
              </div>

              {/* Name + client + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate leading-snug">
                    {pr.exerciseName}
                  </p>
                  <TypeBadge type={pr.type} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {pr.clientName} · {format(parseISO(pr.date), 'd. M.', { locale: cs })}
                </p>
              </div>

              {/* Value */}
              <PRValueDisplay pr={pr} />
            </div>
          );
        })}
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
          .select('id, date, exercise_name, avg_watts, duration_seconds, distance_meters, client_id, clients(name)')
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
        all.push({
          id: e.id,
          date: e.date,
          exerciseName: e.exercise_name,
          clientName: clientData?.name || '?',
          value,
          unit,
          type: 'strength',
        });
      });

      (cardioResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.avg_watts || e.duration_seconds || 0;
        const unit = e.avg_watts ? 'W' : 's';
        all.push({
          id: e.id,
          date: e.date,
          exerciseName: e.exercise_name,
          clientName: clientData?.name || '?',
          value,
          unit,
          type: 'cardio',
          timeSeconds: e.duration_seconds,
          distanceMeters: (e as any).distance_meters ?? null,
          avgWatts: e.avg_watts,
        });
      });

      (skillResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.successful || e.duration_seconds || 0;
        const unit = e.successful != null ? 'úsp.' : 's';
        all.push({
          id: e.id,
          date: e.date,
          exerciseName: e.exercise_name,
          clientName: clientData?.name || '?',
          value,
          unit,
          type: 'skill',
        });
      });

      all.sort((a, b) => b.date.localeCompare(a.date));
      return all.slice(0, 5);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
