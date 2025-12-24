import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackStatusCardsProps {
  onStatusClick?: (status: 'to_send' | 'pending' | 'completed' | 'expired' | 'red_flags') => void;
  activeStatus?: string | null;
  pendingCount?: number;
}

interface FeedbackStats {
  toSend: number;
  pending: number;
  completed: number;
  expired: number;
  redFlags: number;
  total: number;
  responseRate: number;
  avgWaitingHours: number | null;
}

export function FeedbackStatusCards({ 
  onStatusClick, 
  activeStatus,
  pendingCount = 0,
}: FeedbackStatusCardsProps) {
  // Fetch feedback request stats
  const { data: stats } = useQuery({
    queryKey: ['feedback-status-stats'],
    queryFn: async (): Promise<FeedbackStats> => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Get all feedback requests from last 30 days
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select('id, status, created_at, completed_at, expires_at')
        .gte('created_at', startOfDay(thirtyDaysAgo).toISOString());
      
      if (error) throw error;

      const now = new Date();
      
      // Get feedback with red flags
      const completedIds = (requests || [])
        .filter(r => r.status === 'completed')
        .map(r => r.id);
      
      let redFlagsCount = 0;
      if (completedIds.length > 0) {
        const { count } = await supabase
          .from('training_feedback')
          .select('*', { count: 'exact', head: true })
          .in('feedback_request_id', completedIds)
          .eq('is_red_flag', true);
        redFlagsCount = count || 0;
      }

      // Calculate stats
      const pending = (requests || []).filter(r => 
        r.status === 'pending' && new Date(r.expires_at) > now
      );
      const completed = (requests || []).filter(r => r.status === 'completed');
      const expired = (requests || []).filter(r => 
        r.status === 'pending' && new Date(r.expires_at) <= now
      );

      // Calculate average waiting hours for pending
      let avgWaitingHours: number | null = null;
      if (pending.length > 0) {
        const totalHours = pending.reduce((sum, r) => {
          return sum + differenceInHours(now, new Date(r.created_at));
        }, 0);
        avgWaitingHours = Math.round(totalHours / pending.length);
      }

      const total = completed.length + pending.length + expired.length;
      const responseRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

      return {
        toSend: pendingCount,
        pending: pending.length,
        completed: completed.length,
        expired: expired.length,
        redFlags: redFlagsCount,
        total,
        responseRate,
        avgWaitingHours,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const cards = useMemo(() => [
    {
      id: 'to_send',
      icon: Send,
      label: 'K odeslání',
      value: stats?.toSend ?? pendingCount,
      sublabel: 'nové tréninky',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverRing: 'hover:ring-primary/50',
    },
    {
      id: 'pending',
      icon: Clock,
      label: 'Čekající',
      value: stats?.pending ?? 0,
      sublabel: stats?.avgWaitingHours ? `prům. ${stats.avgWaitingHours}h` : 'čeká na vyplnění',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      hoverRing: 'hover:ring-amber-500/50',
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'Vyplněno',
      value: stats?.completed ?? 0,
      sublabel: `${stats?.responseRate ?? 0}% míra odpovědí`,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      hoverRing: 'hover:ring-emerald-500/50',
    },
    {
      id: 'expired',
      icon: XCircle,
      label: 'Expirováno',
      value: stats?.expired ?? 0,
      sublabel: 'odkaz vypršel',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      hoverRing: 'hover:ring-muted-foreground/50',
    },
    {
      id: 'red_flags',
      icon: AlertTriangle,
      label: 'Red Flags',
      value: stats?.redFlags ?? 0,
      sublabel: 'vyžaduje pozornost',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      hoverRing: 'hover:ring-destructive/50',
    },
  ], [stats, pendingCount]);

  return (
    <div className="space-y-4">
      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeStatus === card.id;
          
          return (
            <Card
              key={card.id}
              className={cn(
                'glass cursor-pointer transition-all duration-200',
                'hover:ring-2',
                card.hoverRing,
                isActive && 'ring-2 ring-primary'
              )}
              onClick={() => onStatusClick?.(card.id as any)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2 rounded-lg', card.bgColor)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                  {card.value > 0 && card.id === 'red_flags' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                <p className="text-sm font-medium mt-1">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sublabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Response Rate Progress Bar */}
      {stats && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Míra odpovědí (30 dní)</span>
              </div>
              <span className="text-2xl font-bold">{stats.responseRate}%</span>
            </div>
            <Progress value={stats.responseRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completed} vyplněno z {stats.total} odeslaných
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
