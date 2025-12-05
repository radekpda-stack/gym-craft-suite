import { cn } from '@/lib/utils';
import { Clock, Calendar, Users, Repeat, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { RatingDisplay } from './rating-input';
import { ClientAvatar } from './client-avatar';
import { Link } from 'react-router-dom';

interface SessionCardProps {
  session: TrainingSession;
  client?: Client | null;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

const statusConfig = {
  scheduled: {
    label: 'Naplánováno',
    className: 'bg-primary/10 text-primary border-primary/20',
    borderColor: 'border-l-primary',
    icon: AlertCircle,
  },
  completed: {
    label: 'Dokončeno',
    className: 'bg-success/10 text-success border-success/20',
    borderColor: 'border-l-success',
    icon: CheckCircle,
  },
  canceled: {
    label: 'Zrušeno',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    borderColor: 'border-l-destructive',
    icon: XCircle,
  },
};

export function SessionCard({ session, client, compact, className, onClick }: SessionCardProps) {
  const sessionDate = new Date(session.date);
  const status = statusConfig[session.status];
  const StatusIcon = status.icon;

  // Compact version for dashboard
  if (compact) {
    return (
      <Link
        to={`/trainings/${session.id}`}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border-l-4 transition-all duration-200 hover:bg-secondary hover:scale-[1.01]',
          status.borderColor,
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">
              {client?.name || 'Klient'}
            </p>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0',
              status.className
            )}>
              {status.label}
            </span>
          </div>
          {session.notes && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {session.notes}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-foreground">
            {format(sessionDate, 'HH:mm', { locale: cs })}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.duration} min
          </p>
        </div>
      </Link>
    );
  }

  // Full version for list views
  return (
    <Link
      to={`/trainings/${session.id}`}
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-5 border-l-4 block transition-all duration-300 hover:scale-[1.01] hover:glow',
        status.borderColor,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <ClientAvatar name={client?.name || 'K'} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground text-lg truncate">
                {client?.name || 'Klient'}
              </h4>
              <span className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1',
                status.className
              )}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
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
    </Link>
  );
}
