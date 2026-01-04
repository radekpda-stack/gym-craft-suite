import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Dumbbell, Timer, Plus, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerRecentPerformanceProps {
  clientId: string;
}

interface RecentEntry {
  id: string;
  type: 'strength' | 'cardio';
  exerciseName: string;
  date: string;
  details: string;
  isPR?: boolean;
}

export function TrainerRecentPerformance({ clientId }: TrainerRecentPerformanceProps) {
  const { data: recentEntries, isLoading } = useQuery({
    queryKey: ['trainer-recent-performance', clientId],
    queryFn: async () => {
      // Fetch recent strength entries
      const { data: strengthData, error: strengthError } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, date, weight_kg, reps, sets, is_pr')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(5);

      if (strengthError) throw strengthError;

      // Fetch recent cardio entries
      const { data: cardioData, error: cardioError } = await supabase
        .from('cardio_entries')
        .select('id, exercise_name, date, distance_meters, duration_seconds, is_pr')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(5);

      if (cardioError) throw cardioError;

      // Combine and sort
      const strengthEntries: RecentEntry[] = (strengthData || []).map(e => ({
        id: e.id,
        type: 'strength' as const,
        exerciseName: e.exercise_name,
        date: e.date,
        details: `${e.weight_kg || 0}kg × ${e.reps || 0} × ${e.sets || 0}`,
        isPR: e.is_pr || false,
      }));

      const cardioEntries: RecentEntry[] = (cardioData || []).map(e => {
        const distance = e.distance_meters ? `${(e.distance_meters / 1000).toFixed(1)}km` : '';
        const duration = e.duration_seconds 
          ? `${Math.floor(e.duration_seconds / 60)}:${String(e.duration_seconds % 60).padStart(2, '0')}`
          : '';
        return {
          id: e.id,
          type: 'cardio' as const,
          exerciseName: e.exercise_name,
          date: e.date,
          details: [distance, duration].filter(Boolean).join(' • '),
          isPR: e.is_pr || false,
        };
      });

      const combined = [...strengthEntries, ...cardioEntries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      return combined;
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!recentEntries || recentEntries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Poslední výkony
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné záznamy. Začněte v záložce "Zadávání".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Poslední výkony
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              entry.type === 'strength' ? 'bg-orange-500/10' : 'bg-blue-500/10'
            }`}>
              {entry.type === 'strength' ? (
                <Dumbbell className="w-4 h-4 text-orange-500" />
              ) : (
                <Timer className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{entry.exerciseName}</span>
                {entry.isPR && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 font-medium">
                    PR
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{entry.details}</span>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(entry.date), { addSuffix: false, locale: cs })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
