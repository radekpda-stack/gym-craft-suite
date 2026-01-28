import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  MessageSquare, 
  ChevronRight,
  CalendarCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ScheduleItem } from '@/types/training';

interface TodayTimelineCompactProps {
  trainings: ScheduleItem[];
  isLoading?: boolean;
  onComplete?: (id: string) => void;
  onOpenFeedback?: (id: string) => void;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-warning animate-pulse" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Dokončeno';
    case 'in_progress':
      return 'Probíhá';
    case 'cancelled':
      return 'Zrušeno';
    default:
      return 'Naplánováno';
  }
};

export const TodayTimelineCompact = memo(function TodayTimelineCompact({
  trainings,
  isLoading,
  onComplete,
  onOpenFeedback,
}: TodayTimelineCompactProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const sortedTrainings = [...trainings].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const completed = sortedTrainings.filter(t => t.status === 'completed').length;
  const total = sortedTrainings.length;

  if (total === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="w-5 h-5 text-muted-foreground" />
            Dnešní tréninky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CalendarCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Na dnes nemáte naplánované žádné tréninky
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/calendar')}
            >
              Zobrazit kalendář
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Dnešní tréninky
          <Badge variant="secondary" className="ml-auto">
            {completed}/{total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sortedTrainings.map((training, index) => {
          const isCompleted = training.status === 'completed';
          const isCancelled = training.status === 'cancelled';
          const isNext = !isCompleted && !isCancelled && 
            sortedTrainings.findIndex(t => t.status === 'scheduled') === index;

          return (
            <div
              key={training.id}
              className={cn(
                'relative flex items-center gap-3 p-3 rounded-xl transition-all',
                isCompleted 
                  ? 'bg-success/5 opacity-75' 
                  : isCancelled 
                    ? 'bg-destructive/5 opacity-50 line-through'
                    : isNext 
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'bg-secondary/30 hover:bg-secondary/50'
              )}
            >
              {/* Timeline connector */}
              {index < sortedTrainings.length - 1 && (
                <div className="absolute left-[26px] top-[42px] w-0.5 h-4 bg-border/50" />
              )}

              {/* Status icon */}
              <div className={cn(
                'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                isCompleted ? 'bg-success/20' : 
                isCancelled ? 'bg-destructive/20' :
                isNext ? 'bg-primary/20' : 'bg-muted/50'
              )}>
                <StatusIcon status={training.status} />
              </div>

              {/* Content */}
              <button
                onClick={() => navigate(`/trainings/${training.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {training.time || '—'}
                  </span>
                  <span className={cn(
                    'font-medium truncate',
                    isCancelled && 'text-muted-foreground'
                  )}>
                    {training.clientName || 'Nepřiřazeno'}
                  </span>
                  {(training.participantCount || 1) > 1 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      {training.participantCount}×
                    </Badge>
                  )}
                </div>
                {!isCompleted && !isCancelled && isNext && (
                  <span className="text-xs text-primary font-medium">
                    Další trénink
                  </span>
                )}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isCompleted && onOpenFeedback && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFeedback(training.id);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                )}
                <button
                  onClick={() => navigate(`/trainings/${training.id}`)}
                  className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          );
        })}

        {/* View all button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground"
          onClick={() => navigate('/calendar')}
        >
          Zobrazit kalendář
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
});
