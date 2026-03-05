/**
 * RecentPRsCompact - Horizontal scroll strip of recent PRs
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
  timeSeconds?: number | null;
  distanceMeters?: number | null;
  avgWatts?: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const TYPE_CONFIG = {
  strength: { icon: Dumbbell, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/25' },
  cardio: { icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  skill: { icon: Zap, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25' },
};

function PRCard({ pr }: { pr: RecentPR }) {
  const config = TYPE_CONFIG[pr.type];
  const Icon = config.icon;

  let displayValue = `${pr.value} ${pr.unit}`;
  if (pr.type === 'cardio' && pr.timeSeconds) {
    displayValue = formatTime(pr.timeSeconds);
  }

  return (
    <div className={cn(
      'flex-shrink-0 w-36 rounded-xl p-3 border shadow-sm',
      'bg-background/60 backdrop-blur-sm',
      config.border,
    )}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={cn('p-1 rounded-md', config.bg)}>
          <Icon className={cn('w-3 h-3', config.color)} />
        </div>
        <span className="text-[9px] text-muted-foreground">
          {format(parseISO(pr.date), 'd. M.', { locale: cs })}
        </span>
      </div>
      <p className="text-xs font-semibold text-foreground truncate leading-tight">{pr.exerciseName}</p>
      <p className="text-[10px] text-muted-foreground truncate">{pr.clientName}</p>
      <p className="text-lg font-bold tabular-nums text-foreground leading-tight mt-1">{displayValue}</p>
      {pr.type === 'cardio' && pr.distanceMeters && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <Ruler className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(pr.distanceMeters)} m</span>
        </div>
      )}
    </div>
  );
}

export function RecentPRsCompact() {
  const { data: prs = [], isLoading } = useRecentGlobalPRs();

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-36 rounded-xl shrink-0" />)}
        </div>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-sm">Nedávné PR</h3>
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
        <h3 className="font-semibold text-sm">Nedávné PR</h3>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">30 dní</Badge>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
        {prs.map(pr => <PRCard key={pr.id} pr={pr} />)}
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
        all.push({ id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?', value, unit, type: 'strength' });
      });

      (cardioResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.avg_watts || e.duration_seconds || 0;
        const unit = e.avg_watts ? 'W' : 's';
        all.push({
          id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?',
          value, unit, type: 'cardio',
          timeSeconds: e.duration_seconds, distanceMeters: (e as any).distance_meters ?? null, avgWatts: e.avg_watts,
        });
      });

      (skillResult.data || []).forEach(e => {
        const clientData = e.clients as any;
        const value = e.successful || e.duration_seconds || 0;
        const unit = e.successful != null ? 'úsp.' : 's';
        all.push({ id: e.id, date: e.date, exerciseName: e.exercise_name, clientName: clientData?.name || '?', value, unit, type: 'skill' });
      });

      all.sort((a, b) => b.date.localeCompare(a.date));
      return all.slice(0, 8);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
