import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, differenceInHours } from 'date-fns';
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
  avgCompletionHours: number | null;
}

/**
 * FeedbackStatusCards - Dashboard overview of feedback request statuses
 * 
 * DEFINITIONS (consistent across the app):
 * - K odeslání (to_send): Trainings without feedback request OR requests with is_link_generated=true AND sent_at IS NULL
 * - Čekající (pending): sent_at IS NOT NULL AND status='pending' AND expires_at > now()
 * - Vyplněno (completed): status='completed' (in 30-day window)
 * - Expirováno (expired): expires_at < now() AND status='pending'
 * - Red Flags: training_feedback.is_red_flag = true (in 30-day window)
 * 
 * RESPONSE RATE: completed / (completed + expired) - only closed cases
 */
export function FeedbackStatusCards({ 
  onStatusClick, 
  activeStatus,
  pendingCount = 0,
}: FeedbackStatusCardsProps) {
  // Fetch feedback request stats with precise definitions
  const { data: stats } = useQuery({
    queryKey: ['feedback-status-stats'],
    queryFn: async (): Promise<FeedbackStats> => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const now = new Date();
      
      // Get all feedback requests from last 30 days
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select('id, status, created_at, completed_at, expires_at, sent_at, is_link_generated')
        .gte('created_at', startOfDay(thirtyDaysAgo).toISOString());
      
      if (error) throw error;

      // Calculate stats based on PRECISE definitions
      
      // K odeslání: is_link_generated=true AND sent_at IS NULL AND status='pending'
      const toSend = (requests || []).filter(r => 
        r.is_link_generated === true && 
        r.sent_at === null && 
        r.status === 'pending' &&
        new Date(r.expires_at) > now
      );

      // Čekající: sent_at IS NOT NULL AND status='pending' AND expires_at > now()
      const pending = (requests || []).filter(r => 
        r.sent_at !== null && 
        r.status === 'pending' && 
        new Date(r.expires_at) > now
      );
      
      // Vyplněno: status='completed'
      const completed = (requests || []).filter(r => r.status === 'completed');
      
      // Expirováno: expires_at < now() AND status='pending'
      const expired = (requests || []).filter(r => 
        r.status === 'pending' && 
        new Date(r.expires_at) <= now
      );
      
      // Get feedback with red flags from completed requests
      const completedIds = completed.map(r => r.id);
      let redFlagsCount = 0;
      if (completedIds.length > 0) {
        const { count } = await supabase
          .from('training_feedback')
          .select('*', { count: 'exact', head: true })
          .in('feedback_request_id', completedIds)
          .eq('is_red_flag', true);
        redFlagsCount = count || 0;
      }

      // Calculate average waiting hours for pending (since sent_at)
      let avgWaitingHours: number | null = null;
      if (pending.length > 0) {
        const totalHours = pending.reduce((sum, r) => {
          const sentAt = r.sent_at ? new Date(r.sent_at) : new Date(r.created_at);
          return sum + differenceInHours(now, sentAt);
        }, 0);
        avgWaitingHours = Math.round(totalHours / pending.length);
      }

      // Calculate average completion time (for completed requests)
      let avgCompletionHours: number | null = null;
      const completedWithDates = completed.filter(r => r.sent_at && r.completed_at);
      if (completedWithDates.length > 0) {
        const totalHours = completedWithDates.reduce((sum, r) => {
          return sum + differenceInHours(new Date(r.completed_at!), new Date(r.sent_at!));
        }, 0);
        avgCompletionHours = Math.round(totalHours / completedWithDates.length);
      }

      // Response rate: completed / (completed + expired) - only closed cases
      const closedCases = completed.length + expired.length;
      const responseRate = closedCases > 0 ? Math.round((completed.length / closedCases) * 100) : 0;

      const total = toSend.length + pending.length + completed.length + expired.length;

      return {
        toSend: toSend.length,
        pending: pending.length,
        completed: completed.length,
        expired: expired.length,
        redFlags: redFlagsCount,
        total,
        responseRate,
        avgWaitingHours,
        avgCompletionHours,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const cards = useMemo(() => [
    {
      id: 'to_send',
      icon: Send,
      label: 'K odeslání',
      value: stats?.toSend ?? 0,
      sublabel: 'odkaz vygenerován, neodeslán',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      hoverRing: 'hover:ring-primary/50',
    },
    {
      id: 'pending',
      icon: Clock,
      label: 'Čekající',
      value: stats?.pending ?? 0,
      sublabel: stats?.avgWaitingHours ? `prům. čekání ${stats.avgWaitingHours}h` : 'odesláno, čeká na vyplnění',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      hoverRing: 'hover:ring-amber-500/50',
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'Vyplněno',
      value: stats?.completed ?? 0,
      sublabel: stats?.avgCompletionHours ? `prům. za ${stats.avgCompletionHours}h` : 'klient vyplnil',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      hoverRing: 'hover:ring-emerald-500/50',
    },
    {
      id: 'expired',
      icon: XCircle,
      label: 'Expirováno',
      value: stats?.expired ?? 0,
      sublabel: 'odkaz vypršel bez vyplnění',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      hoverRing: 'hover:ring-muted-foreground/50',
    },
    {
      id: 'red_flags',
      icon: AlertTriangle,
      label: 'Red Flags',
      value: stats?.redFlags ?? 0,
      sublabel: 'vyžaduje pozornost trenéra',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      hoverRing: 'hover:ring-destructive/50',
    },
  ], [stats]);

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
              {stats.completed} vyplněno / ({stats.completed} + {stats.expired} expirováno) = uzavřené případy
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
