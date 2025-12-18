import { cn } from '@/lib/utils';
import { Clock, Calendar, Users, Repeat, ChevronRight, Gauge, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { RatingDisplay } from './rating-input';
import { ClientAvatar } from './client-avatar';
import { Link } from 'react-router-dom';
import { TrainingStatusBadge } from './training-status-badge';
import { TrainingTypeBadge } from '@/components/trainings/TrainingTypeSelector';
import { ProgressIndicator } from '@/components/trainings/ProgressIndicator';
import { ProgressStatus } from '@/hooks/useTrainingProgress';

interface SessionCardProps {
  session: TrainingSession;
  client?: Client | null;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  progressStatus?: ProgressStatus;
}

// Border color based on combined status
const getBorderColor = (status: string, paymentStatus?: string | null) => {
  if (status === 'canceled') return 'border-l-destructive';
  if (status === 'completed') {
    const isPaid = paymentStatus && ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank'].includes(paymentStatus);
    return isPaid ? 'border-l-success' : 'border-l-warning';
  }
  return 'border-l-muted-foreground';
};

export function SessionCard({ session, client, compact, className, onClick, progressStatus }: SessionCardProps) {
  const sessionDate = new Date(session.date);
  const borderColor = getBorderColor(session.status, session.payment_status);
  const hasLoadData = session.rpe || session.rir || session.total_volume;

  // Compact version for dashboard
  if (compact) {
    return (
      <Link
        to={`/trainings/${session.id}`}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 rounded-xl bg-secondary/50 border-l-4 transition-all duration-200 hover:bg-secondary active:scale-[0.98] touch-target',
          borderColor,
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate text-sm">
              {client?.name || 'Klient'}
            </p>
            <TrainingStatusBadge 
              status={session.status as 'scheduled' | 'completed' | 'canceled'} 
              paymentStatus={session.payment_status}
              paymentMethod={session.payment_method}
              showLabel={false}
              className="px-1.5 py-0.5"
            />
            {progressStatus && session.status === 'completed' && (
              <ProgressIndicator status={progressStatus} showLabel={false} size="sm" />
            )}
          </div>
          {session.notes && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {session.notes}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-foreground">
            {format(sessionDate, 'HH:mm', { locale: cs })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {session.duration} min
          </p>
        </div>
      </Link>
    );
  }

  // Mobile-optimized full version
  return (
    <Link
      to={`/trainings/${session.id}`}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl border-l-4 block transition-all duration-300 active:scale-[0.98] hover:glow',
        borderColor,
        className
      )}
    >
      {/* Mobile Layout */}
      <div className="p-4 sm:p-5 md:hidden">
        <div className="flex items-start gap-3">
          <ClientAvatar name={client?.name || 'K'} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-base truncate">
                  {client?.name || 'Klient'}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">{format(sessionDate, 'd. MMM', { locale: cs })}</span>
                  <span>•</span>
                  <span className="font-bold text-foreground">{format(sessionDate, 'HH:mm', { locale: cs })}</span>
                  <span>•</span>
                  <span>{session.duration} min</span>
                </div>
              </div>
              <TrainingStatusBadge 
                status={session.status as 'scheduled' | 'completed' | 'canceled'} 
                paymentStatus={session.payment_status}
                paymentMethod={session.payment_method}
                className="text-[11px]"
              />
            </div>

            {/* Additional info row */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
              {session.training_type && (
                <TrainingTypeBadge type={session.training_type} />
              )}
              {progressStatus && session.status === 'completed' && (
                <ProgressIndicator status={progressStatus} showLabel={false} />
              )}
              {hasLoadData && (
                <div className="flex items-center gap-2">
                  {session.rpe && (
                    <span className={cn(
                      "flex items-center gap-1",
                      session.rpe >= 8 ? "text-warning" : ""
                    )}>
                      <Gauge className="w-3 h-3" />
                      RPE {session.rpe}
                    </span>
                  )}
                  {session.rir !== null && session.rir !== undefined && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      RIR {session.rir}
                    </span>
                  )}
                </div>
              )}
              {(session.participant_count || 1) > 1 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{session.participant_count}</span>
                </div>
              )}
              {(session.recurrence_type || session.parent_session_id) && (
                <div className="flex items-center gap-1 text-primary">
                  <Repeat className="w-3.5 h-3.5" />
                </div>
              )}
              {session.subjective_rating && (
                <RatingDisplay value={session.subjective_rating} showNumber={false} />
              )}
            </div>

            {session.notes && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {session.notes}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </div>

      {/* Desktop/Tablet Layout */}
      <div className="hidden md:block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <ClientAvatar name={client?.name || 'K'} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground text-lg truncate">
                  {client?.name || 'Klient'}
                </h4>
                <TrainingStatusBadge 
                  status={session.status as 'scheduled' | 'completed' | 'canceled'} 
                  paymentStatus={session.payment_status}
                  paymentMethod={session.payment_method}
                />
                {session.training_type && (
                  <TrainingTypeBadge type={session.training_type} />
                )}
                {progressStatus && session.status === 'completed' && (
                  <ProgressIndicator status={progressStatus} />
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{format(sessionDate, 'd. MMM yyyy', { locale: cs })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{format(sessionDate, 'HH:mm', { locale: cs })}</span>
                </div>
                <span className="text-muted-foreground/50">•</span>
                <span>{session.duration} min</span>
                {hasLoadData && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    {session.rpe && (
                      <span className={cn(session.rpe >= 8 ? "text-warning" : "")}>
                        RPE {session.rpe}
                      </span>
                    )}
                    {session.rir !== null && session.rir !== undefined && (
                      <span>RIR {session.rir}</span>
                    )}
                  </>
                )}
                {(session.participant_count || 1) > 1 && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{session.participant_count} osob</span>
                    </div>
                  </>
                )}
                {(session.recurrence_type || session.parent_session_id) && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1 text-primary">
                      <Repeat className="w-4 h-4" />
                      <span>Opakující se</span>
                    </div>
                  </>
                )}
              </div>

              {session.notes && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {session.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <RatingDisplay value={session.subjective_rating} />
          </div>
        </div>
      </div>
    </Link>
  );
}