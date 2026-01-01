import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Play, Check, Clock, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { format, parseISO } from 'date-fns';

interface CompactTrainingRowProps {
  session: TrainingSession;
  client?: Client | null;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  onDuplicate?: () => void;
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'scheduled':
      return { label: 'Plán', variant: 'outline' as const, icon: Clock };
    case 'in_progress':
      return { label: 'Probíhá', variant: 'default' as const, icon: Play };
    case 'completed':
      return { label: 'Hotovo', variant: 'success' as const, icon: Check };
    case 'cancelled':
      return { label: 'Zrušeno', variant: 'destructive' as const, icon: X };
    default:
      return { label: status, variant: 'outline' as const, icon: Clock };
  }
}

export const CompactTrainingRow = memo(function CompactTrainingRow({
  session,
  client,
  onStart,
  onComplete,
  onCancel,
  onReschedule,
  onDuplicate,
  className,
}: CompactTrainingRowProps) {
  const isScheduled = session.status === 'scheduled';
  const isInProgress = session.status === 'in_progress';
  const canAct = isScheduled || isInProgress;

  const { offsetX, isDragging, direction, handlers } = useSwipeGesture({
    threshold: 80,
    maxOffset: 120,
    onSwipeRight: isScheduled ? onStart : isInProgress ? onComplete : undefined,
    onSwipeLeft: isScheduled ? onCancel : undefined,
  });

  const showActionHint = direction === 'right' && canAct;
  const showCancelHint = direction === 'left' && isScheduled;

  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;

  // Extract time from date if it includes time component
  const sessionDate = parseISO(session.date);
  const sessionTime = format(sessionDate, 'HH:mm');

  // Primary action button
  const getPrimaryAction = () => {
    if (isScheduled && onStart) {
      return { label: 'Start', onClick: onStart, icon: Play };
    }
    if (isInProgress && onComplete) {
      return { label: 'Dokončit', onClick: onComplete, icon: Check };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Swipe background - Action (right) */}
      {canAct && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-opacity',
            'bg-success',
            showActionHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 16 }}
        >
          {isScheduled ? (
            <Play className="w-5 h-5 text-success-foreground" />
          ) : (
            <Check className="w-5 h-5 text-success-foreground" />
          )}
        </div>
      )}

      {/* Swipe background - Cancel (left) */}
      {isScheduled && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-opacity',
            'bg-destructive',
            showCancelHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 16 }}
        >
          <X className="w-5 h-5 text-destructive-foreground" />
        </div>
      )}

      {/* Main row content */}
      <div
        {...handlers}
        style={{
          transform: canAct ? `translateX(${offsetX}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="relative bg-card"
      >
        <Link
          to={`/trainings/${session.id}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors',
            'min-h-[64px]'
          )}
        >
          <div className="w-12 flex-shrink-0 text-center">
            <span className="text-sm font-semibold text-foreground">
              {sessionTime}
            </span>
          </div>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {client ? getInitials(client.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-medium text-foreground truncate block">
                {client?.name || 'Neznámý klient'}
              </span>
              {session.training_type && (
                <span className="text-xs text-muted-foreground truncate block">
                  {session.training_type}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge variant={statusConfig.variant} className="flex-shrink-0 gap-1">
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>


          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={`/trainings/${session.id}`}>Detail</Link>
              </DropdownMenuItem>
              {onReschedule && isScheduled && (
                <DropdownMenuItem onClick={onReschedule}>
                  Přesunout
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  Duplikovat
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onCancel && isScheduled && (
                <DropdownMenuItem onClick={onCancel} className="text-destructive">
                  Zrušit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Link>
      </div>
    </div>
  );
});
