import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Send, 
  Clock, 
  XCircle,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'completed' | 'sent' | 'waiting' | 'expired' | 'red_flag';
  clientName: string;
  clientId: string;
  timestamp: string;
  waitingHours?: number;
}

export function FeedbackActivityTimeline() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['feedback-activity-timeline'],
    queryFn: async (): Promise<ActivityItem[]> => {
      const now = new Date();
      
      // Get recent feedback requests with client info
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          client_id,
          status,
          created_at,
          completed_at,
          expires_at
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get client names
      const clientIds = [...new Set((requests || []).map(r => r.client_id))];
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
      
      const clientMap = (clients || []).reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>);

      // Get red flags
      const completedIds = (requests || [])
        .filter(r => r.status === 'completed')
        .map(r => r.id);
      
      let redFlagIds: string[] = [];
      if (completedIds.length > 0) {
        const { data: feedbacks } = await supabase
          .from('training_feedback')
          .select('feedback_request_id')
          .in('feedback_request_id', completedIds)
          .eq('is_red_flag', true);
        redFlagIds = (feedbacks || []).map(f => f.feedback_request_id);
      }

      // Build activity items
      const items: ActivityItem[] = [];

      for (const req of requests || []) {
        const clientName = clientMap[req.client_id] || 'Neznámý klient';
        const expiresAt = new Date(req.expires_at);
        const createdAt = new Date(req.created_at);
        
        if (req.status === 'completed') {
          const isRedFlag = redFlagIds.includes(req.id);
          items.push({
            id: `${req.id}-${isRedFlag ? 'red_flag' : 'completed'}`,
            type: isRedFlag ? 'red_flag' : 'completed',
            clientName,
            clientId: req.client_id,
            timestamp: req.completed_at || req.created_at,
          });
        } else if (req.status === 'pending') {
          if (expiresAt <= now) {
            items.push({
              id: `${req.id}-expired`,
              type: 'expired',
              clientName,
              clientId: req.client_id,
              timestamp: req.expires_at,
            });
          } else {
            const waitingHours = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
            items.push({
              id: `${req.id}-waiting`,
              type: waitingHours > 36 ? 'waiting' : 'sent',
              clientName,
              clientId: req.client_id,
              timestamp: req.created_at,
              waitingHours,
            });
          }
        }
      }

      // Sort by timestamp descending and take top 8
      return items
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    },
    refetchInterval: 60000,
  });

  const getActivityConfig = (type: ActivityItem['type']) => {
    switch (type) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-success',
          bgColor: 'bg-success/10',
          label: 'vyplnil/a feedback',
        };
      case 'red_flag':
        return {
          icon: AlertTriangle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: 'vyplnil/a feedback s Red Flag',
        };
      case 'sent':
        return {
          icon: Send,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          label: 'odkaz odeslán',
        };
      case 'waiting':
        return {
          icon: Clock,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          label: 'čeká',
        };
      case 'expired':
        return {
          icon: XCircle,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'odkaz vypršel',
        };
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Nedávná aktivita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          Nedávná aktivita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity, index) => {
              const config = getActivityConfig(activity.type);
              const Icon = config.icon;
              const isLast = index === activities.length - 1;
              
              return (
                <div 
                  key={activity.id}
                  className="relative flex items-start gap-3 py-2"
                >
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-10 bottom-0 w-px bg-border" />
                  )}
                  
                  {/* Icon */}
                  <div className={cn('p-1.5 rounded-full shrink-0 z-10', config.bgColor)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link 
                        to={`/clients/${activity.clientId}`}
                        className="font-medium hover:underline"
                      >
                        {activity.clientName}
                      </Link>
                      <span className="text-muted-foreground"> {config.label}</span>
                      {activity.type === 'waiting' && activity.waitingHours && (
                        <span className="text-amber-500"> ({activity.waitingHours}h)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true, 
                        locale: cs 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Zatím žádná aktivita
          </div>
        )}
      </CardContent>
    </Card>
  );
}
