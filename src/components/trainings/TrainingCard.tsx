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
import { ClientAvatar } from '@/components/ui/client-avatar';
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

// Top gradient bar color based on status
const getTopGradient = (status: string, paymentStatus?: string | null) => {
  if (status === 'canceled') return 'from-destructive to-destructive/60';
  if (status === 'in_progress') return 'from-primary to-primary/60';
  if (status === 'completed') {
    const isPaid = paymentStatus && ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank'].includes(paymentStatus);
    return isPaid ? 'from-success to-success/60' : 'from-warning to-warning/60';
  }
  return 'from-muted-foreground/40 to-muted-foreground/20';
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
  const topGradient = getTopGradient(session.status, session.payment_status);
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const isCompleted = session.status === 'completed';
  const isCanceled = session.status === 'canceled';
  const isAwaitingPayment =
    session.status === 'completed' &&
    (!session.payment_status || session.payment_status === 'pending');

  const price = session.final_price;

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-card/80 backdrop-blur-md shadow-sm border border-border/50 overflow-hidden transition-all duration-200 hover:shadow-md',
        isCanceled && 'opacity-60',
        className
      )}
    >
      {/* Status gradient top bar */}
      <div className={cn('h-[2px] bg-gradient-to-r', topGradient)} />

      <div className="p-3 sm:p-4">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/trainings/${session.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <ClientAvatar
                name={client?.name || 'Klient'}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-semibold text-foreground truncate",
                    isCanceled && "line-through text-muted-foreground"
                  )}>
                    {client?.name || 'Klient'}
                  </span>
                  {isCompleted && feedbackStatus && (
                    <FeedbackStatusIndicator status={feedbackStatus} />
                  )}
                </div>

                {/* Meta row with dot separators */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="tabular-nums">{format(sessionDate, 'EE HH:mm', { locale: cs })}</span>
                  <span className="text-border">·</span>
                  <span>{session.duration} min</span>
                  {session.rpe && (
                    <>
                      <span className="text-border">·</span>
                      <span className={cn(
                        "flex items-center gap-0.5",
                        session.rpe >= 8 ? "text-warning" : ""
                      )}>
                        <Gauge className="w-3 h-3" />
                        RPE {session.rpe}
                      </span>
                    </>
                  )}
                  {session.rir !== null && session.rir !== undefined && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-0.5">
                        <Target className="w-3 h-3" />
                        RIR {session.rir}
                      </span>
                    </>
                  )}
                  {(session.participant_count || 1) > 1 && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {session.participant_count}
                      </span>
                    </>
                  )}
                  {(session.recurrence_type || session.parent_session_id) && (
                    <Repeat className="w-3 h-3 text-primary ml-0.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Tags + Price row */}
            {((tags && tags.length > 0) || session.training_type || price) && (
              <div className="flex items-center justify-between gap-2 mt-2.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {session.training_type && (
                    <TrainingTypeBadge type={session.training_type} />
                  )}
                  {tags?.map(tag => (
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
                {price != null && price > 0 && (
                  <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                    {price.toLocaleString('cs-CZ')} Kč
                  </span>
                )}
              </div>
            )}

            {/* Note */}
            {session.notes && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {session.notes}
              </p>
            )}
          </Link>

          {/* Status Badge - icon only on mobile */}
          <TrainingStatusBadge
            status={session.status as 'scheduled' | 'in_progress' | 'completed' | 'canceled'}
            paymentStatus={session.payment_status}
            paymentMethod={session.payment_method}
            className="shrink-0"
            showLabel={false}
          />
        </div>

        {/* Quick Actions Row */}
        {(isScheduled || isInProgress || isAwaitingPayment) && (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/30">
            {(isScheduled || isInProgress) && (
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3.5 gap-1.5 rounded-full text-xs font-medium"
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

            {isAwaitingPayment && (
              <Button
                size="sm"
                variant="default"
                className="h-8 px-3.5 gap-1.5 rounded-full text-xs font-medium"
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/trainings/${session.id}`}>Zobrazit detail</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/trainings/${session.id}/edit`}>Upravit</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>Duplikovat</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
});
