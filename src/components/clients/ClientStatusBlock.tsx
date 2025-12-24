/**
 * CLIENT STATUS BLOCK
 * ====================
 * Zobrazuje okamžitý stav klienta na kartě klienta.
 * Používá sdílenou logiku z clientTasksLogic - jeden zdroj pravdy.
 */

import { useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  generateClientTasks, 
  ClientTask, 
  getDominantTask,
  ClientData,
  TrainingSession,
  FeedbackData,
  FeedbackRequest,
} from '@/lib/clientTasksLogic';

interface ClientStatusBlockProps {
  client: Client;
  creditBalance: number;
}

type ClientStatus = 'ok' | 'warning' | 'risk';

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
  const { data: feedbackData = [] } = useClientFeedback(client.id);
  
  // Prázdný array pro feedback requests - zjednodušeno
  const feedbackRequests: FeedbackRequest[] = [];
  
  // Konverze dat do formátu pro sdílenou logiku
  const clientData: ClientData = useMemo(() => ({
    id: client.id,
    name: client.name,
    credit_balance: creditBalance,
    payment_mode: client.payment_mode,
    feedback_enabled: client.feedback_enabled,
  }), [client, creditBalance]);
  
  const sessionsData: TrainingSession[] = useMemo(() => 
    sessions.map((s: any) => ({
      id: s.id,
      date: s.date,
      status: s.status,
      rpe: s.rpe,
      final_price: s.final_price,
      payment_status: s.payment_status,
    }))
  , [sessions]);
  
  const feedbackDataFormatted: FeedbackData[] = useMemo(() => 
    feedbackData.map((f: any) => ({
      id: f.id,
      training_date: f.training_date,
      pain: f.pain,
      body_feel: f.body_feel,
      rpe_rating: f.rpe_rating,
      is_red_flag: f.is_red_flag,
    }))
  , [feedbackData]);
  
  const feedbackRequestsFiltered: FeedbackRequest[] = useMemo(() => 
    feedbackRequests
      .filter((fr: any) => fr.client_id === client.id)
      .map((fr: any) => ({
        training_session_id: fr.training_session_id,
        status: fr.status,
      }))
  , [feedbackRequests, client.id]);
  
  // Generování úkolů pomocí sdílené logiky
  const tasks = useMemo(() => 
    generateClientTasks({
      client: clientData,
      sessions: sessionsData,
      feedback: feedbackDataFormatted,
      feedbackRequests: feedbackRequestsFiltered,
    })
  , [clientData, sessionsData, feedbackDataFormatted, feedbackRequestsFiltered]);
  
  // Určení statusu z úkolů
  const statusInfo = useMemo(() => {
    const hasError = tasks.some(t => t.severity === 'error');
    const hasWarning = tasks.some(t => t.severity === 'warning');
    
    const status: ClientStatus = hasError ? 'risk' : hasWarning ? 'warning' : 'ok';
    const labels: Record<ClientStatus, string> = {
      ok: 'V pořádku',
      warning: 'Pozor',
      risk: 'Riziko',
    };
    
    // Důvody = subtitly úkolů (bez info úkolů)
    const reasons = tasks
      .filter(t => t.severity !== 'info')
      .map(t => t.subtitle + (t.detail ? ` (${t.detail})` : ''));
    
    return { status, label: labels[status], reasons };
  }, [tasks]);
  
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
  
  const config = STATUS_CONFIG[statusInfo.status];

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
          {statusInfo.reasons.slice(0, 3).map((reason, i) => (
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
          {statusInfo.reasons.length > 3 && (
            <span className={cn('text-xs px-2 py-1 rounded-lg', config.bg, config.text)}>
              +{statusInfo.reasons.length - 3}
            </span>
          )}
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

// Export tasks pro použití v ClientActionHub
export function useClientTasks(client: Client, creditBalance: number) {
  const { data: sessions = [] } = useTrainingSessions(client.id);
  const { data: feedbackData = [] } = useClientFeedback(client.id);
  
  // Prázdný array pro feedback requests - zjednodušeno
  const feedbackRequests: FeedbackRequest[] = [];
  
  return useMemo(() => {
    const clientData: ClientData = {
      id: client.id,
      name: client.name,
      credit_balance: creditBalance,
      payment_mode: client.payment_mode,
      feedback_enabled: client.feedback_enabled,
    };
    
    const sessionsData: TrainingSession[] = sessions.map((s: any) => ({
      id: s.id,
      date: s.date,
      status: s.status,
      rpe: s.rpe,
      final_price: s.final_price,
      payment_status: s.payment_status,
    }));
    
    const feedbackDataFormatted: FeedbackData[] = feedbackData.map((f: any) => ({
      id: f.id,
      training_date: f.training_date,
      pain: f.pain,
      body_feel: f.body_feel,
      rpe_rating: f.rpe_rating,
      is_red_flag: f.is_red_flag,
    }));
    
    const feedbackRequestsFiltered: FeedbackRequest[] = feedbackRequests
      .filter((fr: any) => fr.client_id === client.id)
      .map((fr: any) => ({
        training_session_id: fr.training_session_id,
        status: fr.status,
      }));
    
    return generateClientTasks({
      client: clientData,
      sessions: sessionsData,
      feedback: feedbackDataFormatted,
      feedbackRequests: feedbackRequestsFiltered,
    });
  }, [client, creditBalance, sessions, feedbackData, feedbackRequests]);
}
