import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, Clock, ChevronRight } from 'lucide-react';
import type { ScheduleItem } from '@/types/training';

interface LastTrainingWidgetProps {
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
  isLoading?: boolean;
}

export const LastTrainingWidget = memo(function LastTrainingWidget({
  todaySchedule,
  weekSchedule,
  isLoading
}: LastTrainingWidgetProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find last completed training from today or this week
  const completedToday = todaySchedule.filter(s => s.status === 'completed');
  const completedWeek = weekSchedule.filter(s => s.status === 'completed');
  
  const lastTraining = completedToday.length > 0 
    ? completedToday[completedToday.length - 1] 
    : completedWeek.length > 0 
      ? completedWeek[completedWeek.length - 1]
      : null;

  if (!lastTraining) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary/50">
              <Dumbbell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Žádný dokončený trénink</p>
              <p className="text-xs text-muted-foreground">Tento týden jste zatím neměli žádný trénink</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trainingDate = lastTraining.date instanceof Date ? lastTraining.date : new Date(lastTraining.date);
  const timeAgo = formatDistanceToNow(trainingDate, { addSuffix: true, locale: cs });

  const handleClick = () => {
    navigate(`/clients/${lastTraining.clientId}`);
  };

  return (
    <Card className="glass group cursor-pointer hover:bg-secondary/30 transition-colors" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Dumbbell className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {lastTraining.clientName}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{lastTraining.time}</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
});
