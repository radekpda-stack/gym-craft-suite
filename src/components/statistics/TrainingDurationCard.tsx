import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface TrainingDurationCardProps {
  periodRange?: StatsPeriodRange;
}

export function TrainingDurationCard({ periodRange }: TrainingDurationCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['training-duration-stats', periodRange?.start?.toISOString(), periodRange?.end?.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Use periodRange if provided, otherwise default to all time
      let query = supabase
        .from('training_sessions')
        .select('id, date, duration, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('duration', 'is', null);

      if (periodRange?.start) {
        query = query.gte('date', format(periodRange.start, 'yyyy-MM-dd'));
      }
      if (periodRange?.end) {
        query = query.lte('date', format(periodRange.end, 'yyyy-MM-dd'));
      }

      const { data: trainings, error } = await query;

      if (error) throw error;

      const durations = (trainings || []).map(t => t.duration || 0).filter(d => d > 0);
      
      if (durations.length === 0) {
        return { avgDuration: 0, totalHours: 0, shortestDuration: 0, longestDuration: 0, count: 0 };
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const totalMinutes = durations.reduce((a, b) => a + b, 0);
      const shortestDuration = Math.min(...durations);
      const longestDuration = Math.max(...durations);

      return {
        avgDuration: Math.round(avgDuration),
        totalHours: Math.round(totalMinutes / 60),
        shortestDuration,
        longestDuration,
        count: durations.length,
      };
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (!data || data.count === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Délka tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná data o délce tréninků
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Délka tréninků
          </CardTitle>
          {periodRange && (
            <span className="text-xs text-muted-foreground">{periodRange.label}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stat */}
        <div className="text-center pb-2 border-b">
          <p className="text-3xl font-bold">{data.avgDuration}</p>
          <p className="text-sm text-muted-foreground">průměrná délka (min)</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-success">
              <Timer className="h-3 w-3" />
              <span className="text-lg font-semibold">{data.totalHours}</span>
            </div>
            <p className="text-xs text-muted-foreground">hodin celkem</p>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-semibold">{data.count}</span>
            </div>
            <p className="text-xs text-muted-foreground">tréninků</p>
          </div>
        </div>

        {/* Min/Max */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-1 min-w-0">
            <TrendingDown className="h-3 w-3 text-accent shrink-0" />
            <span className="text-muted-foreground shrink-0">Min:</span>
            <span className="font-medium truncate">{data.shortestDuration}m</span>
          </div>
          <div className="flex items-center gap-1 justify-end min-w-0">
            <TrendingUp className="h-3 w-3 text-warning shrink-0" />
            <span className="text-muted-foreground shrink-0">Max:</span>
            <span className="font-medium truncate">{data.longestDuration}m</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
