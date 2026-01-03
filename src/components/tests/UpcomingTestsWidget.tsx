import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { useUpcomingTestSchedules } from '@/hooks/useTestSchedules';
import { format, isToday, isTomorrow, differenceInDays, isBefore } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function UpcomingTestsWidget() {
  const navigate = useNavigate();
  const { data: schedules, isLoading } = useUpcomingTestSchedules(14);
  
  const getScheduleStatus = (date: string) => {
    const scheduleDate = new Date(date);
    const today = new Date();
    
    if (isBefore(scheduleDate, today) && !isToday(scheduleDate)) {
      return { label: 'Zpožděno', variant: 'destructive' as const, urgent: true };
    }
    if (isToday(scheduleDate)) {
      return { label: 'Dnes', variant: 'default' as const, urgent: true };
    }
    if (isTomorrow(scheduleDate)) {
      return { label: 'Zítra', variant: 'secondary' as const, urgent: false };
    }
    
    const daysUntil = differenceInDays(scheduleDate, today);
    return { label: `Za ${daysUntil}d`, variant: 'outline' as const, urgent: false };
  };
  
  const urgentCount = schedules?.filter(s => {
    const status = getScheduleStatus(s.scheduled_date);
    return status.urgent;
  }).length ?? 0;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Nadcházející testy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!schedules || schedules.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Nadcházející testy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádné naplánované testy
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={urgentCount > 0 ? 'border-destructive/50' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Nadcházející testy
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {urgentCount} urgentní
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedules.slice(0, 5).map(schedule => {
          const status = getScheduleStatus(schedule.scheduled_date);
          
          return (
            <div
              key={schedule.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                status.variant === 'destructive' && 'border-destructive/50 bg-destructive/5'
              )}
              onClick={() => navigate(`/tests/${schedule.test_definition_id}?client=${schedule.client_id}`)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {status.urgent ? (
                  <AlertCircle className={cn(
                    'w-4 h-4 flex-shrink-0',
                    status.variant === 'destructive' ? 'text-destructive' : 'text-primary'
                  )} />
                ) : (
                  <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {schedule.test_definitions?.name_cs || schedule.test_definitions?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {schedule.clients?.name} • {format(new Date(schedule.scheduled_date), 'EEE d.M.', { locale: cs })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
        
        {schedules.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            + {schedules.length - 5} dalších
          </p>
        )}
      </CardContent>
    </Card>
  );
}
