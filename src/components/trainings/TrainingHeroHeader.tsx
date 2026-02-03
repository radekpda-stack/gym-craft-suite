/**
 * TrainingHeroHeader - Compact hero with inline tags and meta info
 */
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  Repeat,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAvatar } from '@/components/ui/client-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { TrainingSession } from '@/hooks/useTrainingSessions';

interface TrainingHeroHeaderProps {
  training: TrainingSession;
  client: Client | null;
  participantCount: number;
  onEditClick: () => void;
  onDeleteClick?: () => void;
}

const statusConfig = {
  scheduled: {
    label: 'Naplánováno',
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/30',
  },
  in_progress: {
    label: 'Probíhá',
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
  },
  completed: {
    label: 'Dokončeno',
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
  },
  canceled: {
    label: 'Zrušeno',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
  },
  cancelled: {
    label: 'Zrušeno',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
  },
};

export function TrainingHeroHeader({
  training,
  client,
  participantCount,
  onEditClick,
  onDeleteClick,
}: TrainingHeroHeaderProps) {
  const trainingDate = new Date(training.date);
  const status = statusConfig[training.status as keyof typeof statusConfig] || statusConfig.scheduled;

  const isInProgress = training.status === 'in_progress';

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border shadow-sm transition-all duration-200 hover:shadow-md p-4",
      training.status === 'scheduled' && "border-primary/30",
      training.status === 'in_progress' && "border-warning/40 ring-1 ring-warning/20",
      training.status === 'completed' && "border-success/30",
      training.status === 'canceled' && "border-destructive/30",
      !['scheduled', 'in_progress', 'completed', 'canceled'].includes(training.status) && "border-border/50"
    )}>
      {/* Subtle gradient overlay */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        training.status === 'in_progress' 
          ? "bg-gradient-to-br from-warning/10 via-transparent to-transparent" 
          : "bg-gradient-to-br from-primary/5 via-transparent to-transparent"
      )} />
      
      {/* Row 1: Avatar + Name + Menu */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative group">
            <ClientAvatar 
              name={client?.name || 'Trénink'} 
              size="lg" 
              className={cn(
                "shrink-0 ring-2 transition-all duration-200",
                isInProgress ? "ring-warning/50 group-hover:ring-warning" : "ring-border/30 group-hover:ring-primary/50"
              )} 
            />
            {isInProgress && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-warning rounded-full border-2 border-card shadow-lg shadow-warning/30">
                <span className="absolute inset-0 rounded-full bg-warning animate-ping opacity-75" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">
              {client?.name || 'Trénink'}
            </h1>
            
            {/* Meta row - compact */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {format(trainingDate, "EEEE d.M.", { locale: cs })}
                <span className="text-primary font-semibold">
                  {format(trainingDate, "HH:mm")}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {training.duration} min
              </span>
              {participantCount > 1 && (
                <span className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3" />
                  {participantCount}
                </span>
              )}
              {(training.recurrence_type || training.parent_session_id) && (
                <Repeat className="w-3 h-3 text-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 -mt-1 hover:bg-secondary/80">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="backdrop-blur-md bg-popover/95">
            <DropdownMenuItem onClick={onEditClick}>
              <Edit2 className="w-4 h-4 mr-2" />
              Upravit detaily
            </DropdownMenuItem>
            {onDeleteClick && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={onDeleteClick}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat trénink
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badge - full width, prominent */}
      <div className="relative mt-3">
        <div className={cn(
          'w-full py-2.5 px-3 rounded-xl text-center text-sm font-semibold border backdrop-blur-sm transition-all duration-200',
          status.bg, status.text, status.border,
          isInProgress && 'animate-pulse'
        )}>
          {status.label}
        </div>
      </div>
    </div>
  );
}
