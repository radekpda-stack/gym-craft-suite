import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar, Clock, Dumbbell } from 'lucide-react';
import { useClientPRStats } from '@/hooks/useClientPRs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerQuickStatsProps {
  clientId: string;
}

export function TrainerQuickStats({ clientId }: TrainerQuickStatsProps) {
  const { stats: prStats, isLoading: prLoading } = useClientPRStats(clientId);

  // Get workouts this month
  const { data: monthlyStats, isLoading: monthlyLoading } = useQuery({
    queryKey: ['trainer-monthly-stats', clientId],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('id, date')
        .eq('client_id', clientId)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString());

      if (error) throw error;

      // Count unique training days
      const uniqueDays = new Set(data?.map(e => e.date.split('T')[0]) || []);
      return { workoutCount: uniqueDays.size };
    },
    enabled: !!clientId,
  });

  // Get last workout date
  const { data: lastWorkout, isLoading: lastWorkoutLoading } = useQuery({
    queryKey: ['trainer-last-workout', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('date')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isLoading = prLoading || monthlyLoading || lastWorkoutLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Osobní rekordy',
      value: prStats?.totalPRs || 0,
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Tréninky/měsíc',
      value: monthlyStats?.workoutCount || 0,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Poslední trénink',
      value: lastWorkout?.date 
        ? formatDistanceToNow(new Date(lastWorkout.date), { addSuffix: false, locale: cs })
        : '-',
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <div className={`font-bold ${stat.isText ? 'text-sm' : 'text-xl'}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
