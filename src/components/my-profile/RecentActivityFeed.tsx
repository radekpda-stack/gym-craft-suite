import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Dumbbell, Timer, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface RecentActivityFeedProps {
  clientId: string;
  onViewDiary?: () => void;
}

interface ActivityEntry {
  id: string;
  type: 'strength' | 'cardio';
  exerciseName: string;
  date: string;
  details: string;
  isPR?: boolean;
}

export function RecentActivityFeed({ clientId, onViewDiary }: RecentActivityFeedProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity-feed', clientId],
    queryFn: async () => {
      // Fetch recent exercise entries
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, date, weight_kg, reps, sets, is_pr, distance_meters, time_seconds')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(4);

      if (exerciseError) throw exerciseError;

      // Fetch cardio entries
      const { data: cardioData, error: cardioError } = await supabase
        .from('cardio_entries')
        .select('id, exercise_name, date, distance_meters, duration_seconds, is_pr')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(4);

      if (cardioError) throw cardioError;

      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(Math.round(secs)).padStart(2, '0')}`;
      };

      // Process exercise entries
      const exerciseEntries: ActivityEntry[] = (exerciseData || []).map(e => {
        const hasCardioMetrics = (e.distance_meters && e.distance_meters > 0) || (e.time_seconds && e.time_seconds > 0);
        const hasStrengthMetrics = e.weight_kg && e.weight_kg > 0;
        const isCardioStyle = hasCardioMetrics && !hasStrengthMetrics;
        
        let details = '';
        if (isCardioStyle) {
          const parts: string[] = [];
          if (e.distance_meters && e.distance_meters > 0) {
            parts.push(e.distance_meters >= 1000 
              ? `${(e.distance_meters / 1000).toFixed(1)}km` 
              : `${e.distance_meters}m`
            );
          }
          if (e.time_seconds && e.time_seconds > 0) {
            parts.push(formatTime(e.time_seconds));
          }
          details = parts.join(' • ');
        } else {
          details = `${e.weight_kg || 0}kg × ${e.reps || 0} × ${e.sets || 0}`;
        }
        
        return {
          id: e.id,
          type: isCardioStyle ? 'cardio' as const : 'strength' as const,
          exerciseName: e.exercise_name,
          date: e.date,
          details,
          isPR: e.is_pr || false,
        };
      });

      // Process cardio entries
      const cardioEntries: ActivityEntry[] = (cardioData || []).map(e => {
        const parts: string[] = [];
        if (e.distance_meters && e.distance_meters > 0) {
          parts.push(e.distance_meters >= 1000 
            ? `${(e.distance_meters / 1000).toFixed(1)}km` 
            : `${e.distance_meters}m`
          );
        }
        if (e.duration_seconds && e.duration_seconds > 0) {
          parts.push(formatTime(e.duration_seconds));
        }
        
        return {
          id: e.id,
          type: 'cardio' as const,
          exerciseName: e.exercise_name,
          date: e.date,
          details: parts.join(' • '),
          isPR: e.is_pr || false,
        };
      });

      // Combine and sort
      return [...exerciseEntries, ...cardioEntries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Poslední aktivita</span>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Zatím žádná aktivita</p>
          <p className="text-xs mt-1">Začněte zadáním výkonu výše</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Poslední aktivita</span>
        </div>
        {onViewDiary && (
          <button 
            onClick={onViewDiary}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Deník
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Activity list */}
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              activity.type === 'strength' ? 'bg-orange-500/10' : 'bg-blue-500/10'
            }`}>
              {activity.type === 'strength' ? (
                <Dumbbell className="w-4 h-4 text-orange-500" />
              ) : (
                <Timer className="w-4 h-4 text-blue-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{activity.exerciseName}</span>
                {activity.isPR && (
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 text-[10px] font-bold shrink-0">
                    PR
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{activity.details}</span>
            </div>
            
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(activity.date), { addSuffix: false, locale: cs })}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
