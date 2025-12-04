import { cn } from '@/lib/utils';
import { Clock, User } from 'lucide-react';
import { TrainingSession, Client } from '@/types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface SessionCardProps {
  session: TrainingSession;
  client?: Client;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function SessionCard({ session, client, compact, className, onClick }: SessionCardProps) {
  const statusColors = {
    scheduled: 'border-l-primary',
    completed: 'border-l-success',
    canceled: 'border-l-destructive',
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border-l-4 cursor-pointer transition-all duration-200 hover:bg-secondary',
          statusColors[session.status],
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {client?.name || 'Klient'}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {session.notes}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-foreground">
            {format(session.date, 'HH:mm', { locale: cs })}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.duration} min
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-5 border-l-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:glow',
        statusColors[session.status],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-foreground text-lg">
            {client?.name || 'Klient'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {session.notes}
          </p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {session.subjectiveRating}/10
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{format(session.date, 'HH:mm', { locale: cs })}</span>
        </div>
        <span>•</span>
        <span>{session.duration} min</span>
      </div>
    </div>
  );
}
