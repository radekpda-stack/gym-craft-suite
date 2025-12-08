import { useState } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTrainingSessions, useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useClients } from '@/hooks/useClients';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { useAppSettings } from '@/hooks/useAppSettings';

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: sessions = [] } = useTrainingSessions();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  const { data: settings } = useAppSettings();
  const trainingPrices = settings?.training_prices || { '1': 800, '2': 1000, '3': 1200 };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 14 }, (_, i) => i + 6);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = (getDay(monthStart) + 6) % 7;
  const paddedDays = [
    ...Array.from({ length: startPadding }, (_, i) => subDays(monthStart, startPadding - i)),
    ...monthDays,
  ];

  const getEventsForDay = (date: Date) => {
    return sessions.filter((session) => isSameDay(new Date(session.date), date));
  };

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Neznámý';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'hsl(var(--success))';
      case 'canceled':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate((prev) => (direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    } else if (viewMode === 'month') {
      setCurrentDate((prev) => (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)));
    } else {
      setCurrentDate((prev) => (direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)));
    }
  };

  const getDateRangeText = () => {
    if (viewMode === 'week') {
      return `${format(weekStart, 'd. MMMM', { locale: cs })} - ${format(addDays(weekStart, 6), 'd. MMMM yyyy', { locale: cs })}`;
    } else if (viewMode === 'month') {
      return format(currentDate, 'LLLL yyyy', { locale: cs });
    } else {
      return format(currentDate, 'd. MMMM yyyy', { locale: cs });
    }
  };

  const handleCreateTraining = async (data: TrainingFormValues) => {
    await createTraining.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      duration: data.duration,
      participant_count: data.participant_count,
      notes: data.notes,
      subjective_rating: data.subjective_rating ?? undefined,
      status: data.status,
      trainingPrices,
    });
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Kalendář</h1>
          <p className="text-muted-foreground mt-1">{getDateRangeText()}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 glass-subtle rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {mode === 'day' ? 'Den' : mode === 'week' ? 'Týden' : 'Měsíc'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')} className="rounded-xl glass-subtle border-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="rounded-xl glass-subtle border-0">
              Dnes
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')} className="rounded-xl glass-subtle border-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Nový trénink
          </Button>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="glass rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <p className="text-lg font-semibold text-foreground">
              {format(currentDate, 'EEEE d. MMMM', { locale: cs })}
            </p>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {hours.map((hour) => {
              const dayEvents = getEventsForDay(currentDate).filter(
                (event) => new Date(event.date).getHours() === hour
              );
              return (
                <div key={hour} className="flex border-b border-border/30">
                  <div className="w-20 p-3 text-sm text-muted-foreground border-r border-border/30 flex-shrink-0">
                    {hour}:00
                  </div>
                  <div className="flex-1 min-h-[70px] p-2 relative">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="glass-subtle rounded-xl p-3 mb-1 cursor-pointer hover:bg-secondary/60 transition-all"
                        style={{ borderLeft: `3px solid ${getStatusColor(event.status)}` }}
                      >
                        <p className="font-medium text-foreground">{getClientName(event.client_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.date), 'HH:mm')} - {event.duration} min
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="glass rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="grid grid-cols-8 border-b border-border/50">
            <div className="p-4 text-center text-sm text-muted-foreground">Čas</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-4 text-center border-l border-border/30',
                  isSameDay(day, new Date()) && 'bg-primary/5'
                )}
              >
                <p className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: cs })}</p>
                <p
                  className={cn(
                    'text-2xl font-bold mt-1',
                    isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/30">
                <div className="p-2 text-center text-sm text-muted-foreground border-r border-border/30">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const dayEvents = getEventsForDay(day).filter(
                    (event) => new Date(event.date).getHours() === hour
                  );
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={cn(
                        'min-h-[60px] p-1 border-l border-border/30 relative',
                        isSameDay(day, new Date()) && 'bg-primary/5'
                      )}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-x-1 glass-subtle rounded-lg p-2 text-xs cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:z-10"
                          style={{ borderLeft: `3px solid ${getStatusColor(event.status)}` }}
                        >
                          <p className="font-medium truncate text-foreground">
                            {getClientName(event.client_id)}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {format(new Date(event.date), 'HH:mm')} - {event.duration}min
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="glass rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/50">
            {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {paddedDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-[100px] p-2 border-b border-r border-border/30',
                    !isCurrentMonth && 'opacity-40',
                    isSameDay(day, new Date()) && 'bg-primary/5'
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-medium mb-1',
                      isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded glass-subtle truncate cursor-pointer hover:bg-secondary/60"
                        style={{ borderLeft: `2px solid ${getStatusColor(event.status)}` }}
                      >
                        {getClientName(event.client_id)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{dayEvents.length - 3} dalších</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Naplánováno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Dokončeno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Zrušeno</span>
        </div>
      </div>

      <CreateTrainingSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
      />
    </div>
  );
}
