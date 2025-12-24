import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  MessageSquare,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientStatusBlockProps {
  client: Client;
  creditBalance: number;
}

type ClientStatus = 'ok' | 'warning' | 'risk';

interface StatusInfo {
  status: ClientStatus;
  label: string;
  reasons: string[];
}

const STATUS_CONFIG = {
  ok: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  risk: {
    icon: AlertTriangle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-600',
    dot: 'bg-red-500',
  },
};

export function ClientStatusBlock({ client, creditBalance }: ClientStatusBlockProps) {
  const { data: sessions = [] } = useTrainingSessions(client.id);
  const { data: feedbackData } = useClientFeedback(client.id);
  
  // Get last completed training
  const lastTraining = useMemo(() => {
    const completed = sessions.find((s: any) => s.status === 'completed');
    if (!completed) return null;
    return {
      date: new Date(completed.date),
      daysAgo: differenceInDays(new Date(), new Date(completed.date)),
    };
  }, [sessions]);
  
  // Get last feedback summary
  const lastFeedback = useMemo(() => {
    if (!feedbackData || feedbackData.length === 0) return null;
    const latest = feedbackData[0];
    return {
      date: new Date(latest.training_date),
      pain: latest.pain || 0,
      fatigue: latest.body_feel ? 10 - latest.body_feel : 0,
      rpe: latest.rpe_rating || 0,
      isRedFlag: latest.is_red_flag,
    };
  }, [feedbackData]);
  
  // Auto-evaluate client status
  const statusInfo = useMemo((): StatusInfo => {
    const reasons: string[] = [];
    let status: ClientStatus = 'ok';
    
    // Check credit
    if (client.payment_mode !== 'cash_only') {
      if (creditBalance <= 0) {
        reasons.push('Bez kreditu');
        status = 'risk';
      } else if (creditBalance < 800) {
        reasons.push('Nízký kredit');
        if (status === 'ok') status = 'warning';
      }
    }
    
    // Check training frequency
    if (lastTraining) {
      if (lastTraining.daysAgo > 14) {
        reasons.push(`${lastTraining.daysAgo} dní bez tréninku`);
        status = 'risk';
      } else if (lastTraining.daysAgo > 7) {
        reasons.push(`${lastTraining.daysAgo} dní od tréninku`);
        if (status === 'ok') status = 'warning';
      }
    } else {
      reasons.push('Žádný trénink');
      if (status === 'ok') status = 'warning';
    }
    
    // Check feedback issues
    if (lastFeedback) {
      if (lastFeedback.isRedFlag) {
        reasons.push('Red flag ve feedbacku');
        status = 'risk';
      } else if (lastFeedback.pain >= 7) {
        reasons.push(`Vysoká bolest (${lastFeedback.pain}/10)`);
        status = 'risk';
      } else if (lastFeedback.pain >= 5) {
        reasons.push(`Bolest (${lastFeedback.pain}/10)`);
        if (status === 'ok') status = 'warning';
      }
      
      if (lastFeedback.rpe >= 9) {
        reasons.push(`Vysoké RPE (${lastFeedback.rpe})`);
        if (status === 'ok') status = 'warning';
      }
    }
    
    const labels: Record<ClientStatus, string> = {
      ok: 'V pořádku',
      warning: 'Pozor',
      risk: 'Riziko',
    };
    
    return { status, label: labels[status], reasons };
  }, [client, creditBalance, lastTraining, lastFeedback]);
  
  const config = STATUS_CONFIG[statusInfo.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'glass rounded-2xl p-4 border-2',
      config.border
    )}>
      {/* Top row: Avatar + Name + Status badge */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-offset-2 ring-offset-background" style={{ '--tw-ring-color': `var(--${statusInfo.status === 'ok' ? 'emerald' : statusInfo.status === 'warning' ? 'amber' : 'red'}-500)` } as any}>
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {client.name}
          </h1>
          {client.training_goals && client.training_goals.length > 0 && (
            <p className="text-sm text-muted-foreground truncate">
              {client.training_goals[0]}
            </p>
          )}
        </div>
        
        {/* Status badge */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl shrink-0',
          config.bg
        )}>
          <div className={cn('w-2 h-2 rounded-full animate-pulse', config.dot)} />
          <span className={cn('font-semibold text-sm', config.text)}>
            {statusInfo.label}
          </span>
        </div>
      </div>
      
      {/* Status reasons (if any) */}
      {statusInfo.reasons.length > 0 && statusInfo.status !== 'ok' && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
          {statusInfo.reasons.map((reason, i) => (
            <span 
              key={i}
              className={cn(
                'text-xs px-2 py-1 rounded-lg',
                config.bg,
                config.text
              )}
            >
              {reason}
            </span>
          ))}
        </div>
      )}
      
      {/* Quick info row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 text-sm">
        {/* Last training */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Poslední:</span>
          <span className="font-medium text-foreground">
            {lastTraining 
              ? format(lastTraining.date, 'd.M.', { locale: cs })
              : '—'
            }
          </span>
        </div>
        
        {/* Last feedback summary */}
        {lastFeedback && (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className={cn(
              'font-medium',
              lastFeedback.pain >= 5 ? 'text-warning' : 
              lastFeedback.isRedFlag ? 'text-destructive' : 'text-foreground'
            )}>
              {lastFeedback.isRedFlag ? 'Red flag' :
               lastFeedback.pain >= 5 ? `Bolest ${lastFeedback.pain}/10` :
               'OK'}
            </span>
          </div>
        )}
        
        {/* Credit (if applicable) */}
        {client.payment_mode !== 'cash_only' && (
          <div className="flex items-center gap-2 ml-auto">
            <span className={cn(
              'font-bold',
              creditBalance <= 0 ? 'text-destructive' :
              creditBalance < 800 ? 'text-warning' : 'text-foreground'
            )}>
              {creditBalance.toLocaleString('cs-CZ')} Kč
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
