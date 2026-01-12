import { useMyProfile } from '@/hooks/useMyProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar, Trophy, Flame, TrendingUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useClientPRStats } from '@/hooks/useClientPRs';

interface ModernProfileHeaderProps {
  clientId: string;
}

export function ModernProfileHeader({ clientId }: ModernProfileHeaderProps) {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { stats: prStats, isLoading: prLoading } = useClientPRStats(clientId);
  
  // Fetch monthly stats
  const { data: monthlyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['trainer-monthly-stats', clientId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('date')
        .eq('client_id', clientId)
        .gte('date', format(startOfMonth, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Count unique workout days
      const uniqueDays = new Set((data || []).map(e => e.date));
      return { workoutsThisMonth: uniqueDays.size };
    },
    enabled: !!clientId,
  });

  // Fetch last workout
  const { data: lastWorkout } = useQuery({
    queryKey: ['trainer-last-workout', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_entries')
        .select('date')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch member since date
  const { data: clientData } = useQuery({
    queryKey: ['trainer-client-data', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('created_at')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isLoading = profileLoading || prLoading || statsLoading;

  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  if (!profile) {
    return null;
  }

  const stats = [
    {
      icon: Trophy,
      value: prStats?.totalPRs || 0,
      label: 'Rekordy',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      icon: Flame,
      value: monthlyStats?.workoutsThisMonth || 0,
      label: 'Tento měsíc',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      icon: TrendingUp,
      value: lastWorkout 
        ? formatDistanceToNow(new Date(lastWorkout.date), { addSuffix: false, locale: cs })
        : '-',
      label: 'Posl. trénink',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent rounded-2xl" />
      
      {/* Content */}
      <div className="relative glass rounded-2xl p-5 space-y-4">
        {/* Profile info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <User className="w-8 h-8 text-primary" />
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile.clientName}</h1>
            <p className="text-sm text-muted-foreground">Osobní trenér</p>
            {clientData?.created_at && (
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Od {format(new Date(clientData.created_at), 'LLLL yyyy', { locale: cs })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center p-3 rounded-xl bg-secondary/30 border border-border/30"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-1.5`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-lg font-bold">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
