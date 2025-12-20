import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Wallet, MoreHorizontal, Gauge, Target, Users, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { Link } from 'react-router-dom';
import { TrainingStatusBadge } from '@/components/ui/training-status-badge';
import { TrainingTypeBadge } from '@/components/trainings/TrainingTypeSelector';
import { FeedbackStatusIndicator } from '@/components/trainings/FeedbackStatusIndicator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tag } from '@/hooks/useTags';
import type { FeedbackStatus } from '@/hooks/useTrainingFeedbackStatus';

interface TrainingCardProps {
  session: TrainingSession;
  client?: Client | null;
  tags?: Tag[];
  feedbackStatus?: FeedbackStatus;
  className?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onPay?: () => void;
  onDuplicate?: () => void;
}

// Border color based on combined status
const getBorderColor = (status: string, paymentStatus?: string | null) => {
  if (status === 'canceled') return 'border-l-destructive';
  if (status === 'in_progress') return 'border-l-primary';
  if (status === 'completed') {
    const isPaid = paymentStatus && ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank'].includes(paymentStatus);
    return isPaid ? 'border-l-success' : 'border-l-warning';
  }
  return 'border-l-muted-foreground';
};

export const TrainingCard = memo(function TrainingCard({
  session,
  client,
  tags,
  feedbackStatus,
  className,
  onComplete,
  onCancel,
  onPay,
  onDuplicate,
}: TrainingCardProps) {
  const sessionDate = new Date(session.date);
  const borderColor = getBorderColor(session.status, session.payment_status);
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const isCompleted = session.status === 'completed';
  const isAwaitingPayment =
    session.status === 'completed' &&
    (!session.payment_status || session.payment_status === 'pending');

  return (
    <div
      className={cn(
        'glass rounded-xl border-l-4 transition-all duration-200 hover:glow',
        borderColor,
        className
      )}
    >
      <div className="p-3 sm:p-4">
        {/* Primary Row: Time, Client Name, Status */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/trainings/${session.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {/* Time - Bold and prominent */}
              <span className="text-lg font-bold text-foreground tabular-nums shrink-0">
                {format(sessionDate, 'HH:mm', { locale: cs })}
              </span>
              
              {/* Client name */}
              <span className="font-semibold text-foreground truncate">
                {client?.name || 'Klient'}
              </span>
              
              {/* Feedback status indicator for completed trainings */}
              {isCompleted && feedbackStatus && (
                <FeedbackStatusIndicator status={feedbackStatus} />
              )}
            </div>
            
            {/* Secondary Row: Type, Duration, RPE/RIR, Note */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
              {session.training_type && (
                <TrainingTypeBadge type={session.training_type} />
              )}
              <span>{session.duration} min</span>
              
              {session.rpe && (
                <span className={cn(
                  "flex items-center gap-0.5",
                  session.rpe >= 8 ? "text-warning" : ""
                )}>
                  <Gauge className="w-3 h-3" />
                  RPE {session.rpe}
                </span>
              )}
              {session.rir !== null && session.rir !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Target className="w-3 h-3" />
                  RIR {session.rir}
                </span>
              )}
              {(session.participant_count || 1) > 1 && (
                <span className="flex items-center gap-0.5">
                  <Users className="w-3 h-3" />
                  {session.participant_count}
                </span>
              )}
              {(session.recurrence_type || session.parent_session_id) && (
                <Repeat className="w-3 h-3 text-primary" />
              )}
            </div>
            
            {/* Tags row */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                    style={{ 
                      backgroundColor: `${tag.color}20`, 
                      color: tag.color 
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            
            {/* Note - single line with ellipsis */}
            {session.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                {session.notes}
              </p>
            )}
          </Link>
          
          {/* Status Badge */}
          <TrainingStatusBadge
            status={session.status as 'scheduled' | 'in_progress' | 'completed' | 'canceled'}
            paymentStatus={session.payment_status}
            paymentMethod={session.payment_method}
            className="shrink-0"
          />
        </div>
        
        {/* Quick Actions Row */}
        {(isScheduled || isInProgress || isAwaitingPayment) && (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
            {/* Scheduled: Complete + Cancel */}
            {isScheduled && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 px-3 gap-1.5 rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onComplete?.();
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Dokončit</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 gap-1.5 rounded-lg text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancel?.();
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Zrušit</span>
                </Button>
              </>
            )}
            
            {/* In Progress: Complete */}
            {isInProgress && (
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3 gap-1.5 rounded-lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onComplete?.();
                }}
              >
                <Check className="w-3.5 h-3.5" />
                Dokončit
              </Button>
            )}
            
            {/* Awaiting Payment: Pay */}
            {isAwaitingPayment && (
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3 gap-1.5 rounded-lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPay?.();
                }}
              >
                <Wallet className="w-3.5 h-3.5" />
                Uhradit
              </Button>
            )}
            
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/trainings/${session.id}`}>
                    Zobrazit detail
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/trainings/${session.id}/edit`}>
                    Upravit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  Duplikovat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
});
