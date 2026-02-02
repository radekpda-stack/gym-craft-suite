import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
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

export const TodayTimelineCompact = memo(function TodayTimelineCompact({
  trainings,
  isLoading,
  onComplete,
  onOpenFeedback,
}: TodayTimelineCompactProps) {
  const navigate = useNavigate();

  // Calculate NOW position
  const now = new Date();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl" />
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
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="w-5 h-5 text-muted-foreground" />
            Dnešní tréninky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <motion.div 
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center"
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [0.6, 0.8, 0.6] 
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <CalendarCheck className="w-8 h-8 text-muted-foreground/50" />
            </motion.div>
            <p className="text-sm text-muted-foreground mb-4">
              Na dnes nemáte naplánované žádné tréninky
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl"
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
    <Card variant="floating" className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Dnešní tréninky
          <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-0">
            {completed}/{total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-12 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />
        
        <div className="space-y-2">
          {sortedTrainings.map((training, index) => {
            const isCompleted = training.status === 'completed';
            const isCancelled = training.status === 'cancelled';
            const isNext = !isCompleted && !isCancelled && 
              sortedTrainings.findIndex(t => t.status === 'scheduled') === index;
            
            // Calculate if this is the "now" position
            const trainingTime = training.time || '00:00';
            const [hours, minutes] = trainingTime.split(':').map(Number);
            const trainingMinutes = hours * 60 + minutes;
            const isCurrentSlot = trainingMinutes <= currentTimeMinutes && 
              (index === sortedTrainings.length - 1 || 
               (() => {
                 const nextTime = sortedTrainings[index + 1]?.time || '23:59';
                 const [nh, nm] = nextTime.split(':').map(Number);
                 return currentTimeMinutes < nh * 60 + nm;
               })());

            return (
              <motion.div
                key={training.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                className="relative"
              >
                {/* NOW indicator */}
                {isCurrentSlot && !isCompleted && (
                  <div className="absolute -left-1 right-0 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_hsl(0_84%_60%/0.6)]" />
                    <div className="flex-1 h-px bg-destructive/40" />
                  </div>
                )}
                
                <motion.div
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl transition-all ml-4',
                    'bg-card/60 backdrop-blur-sm border border-border/30',
                    isCompleted && 'opacity-60',
                    isCancelled && 'opacity-40 line-through',
                    isNext && 'ring-1 ring-primary/40 bg-primary/5'
                  )}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute -left-[22px] w-3 h-3 rounded-full border-2 bg-background',
                    isCompleted ? 'border-success bg-success' : 
                    isCancelled ? 'border-muted-foreground' :
                    isNext ? 'border-primary bg-primary' : 'border-border'
                  )} />

                  {/* Status icon */}
                  <div className={cn(
                    'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
                    isCompleted ? 'bg-success/10' : 
                    isCancelled ? 'bg-muted/30' :
                    isNext ? 'bg-primary/10' : 'bg-muted/20'
                  )}>
                    <StatusIcon status={training.status} />
                  </div>

                  {/* Content */}
                  <button
                    onClick={() => navigate(`/trainings/${training.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {training.time || '—'}
                      </span>
                      <span className={cn(
                        'font-medium truncate',
                        isCancelled && 'text-muted-foreground'
                      )}>
                        {training.clientName || 'Nepřiřazeno'}
                      </span>
                      {(training.participantCount || 1) > 1 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 shrink-0">
                          <Users className="w-2.5 h-2.5" />
                          {training.participantCount}×
                        </Badge>
                      )}
                    </div>
                    {isNext && (
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
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFeedback(training.id);
                        }}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    <motion.button
                      onClick={() => navigate(`/trainings/${training.id}`)}
                      className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* View all button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-muted-foreground rounded-xl hover:bg-primary/5"
          onClick={() => navigate('/calendar')}
        >
          Zobrazit kalendář
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
});
