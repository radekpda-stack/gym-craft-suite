import { useState } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockCalendarEvents, mockClients } from '@/data/mockData';

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6:00 - 20:00

  const getEventsForDay = (date: Date) => {
    return mockCalendarEvents.filter((event) =>
      isSameDay(new Date(event.start), date)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) =>
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Kalendář
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(weekStart, 'd. MMMM', { locale: cs })} -{' '}
            {format(addDays(weekStart, 6), 'd. MMMM yyyy', { locale: cs })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'day' ? 'Den' : mode === 'week' ? 'Týden' : 'Měsíc'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('prev')}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl"
            >
              Dnes
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek('next')}
              className="rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nová událost
          </Button>
        </div>
      </div>

      {/* Week View */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-4 text-center text-sm text-muted-foreground">
            Čas
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-4 text-center border-l border-border',
                isSameDay(day, new Date()) && 'bg-primary/5'
              )}
            >
              <p className="text-sm text-muted-foreground">
                {format(day, 'EEE', { locale: cs })}
              </p>
              <p
                className={cn(
                  'text-2xl font-bold mt-1',
                  isSameDay(day, new Date())
                    ? 'text-primary'
                    : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/50">
              <div className="p-2 text-center text-sm text-muted-foreground border-r border-border/50">
                {hour}:00
              </div>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day).filter((event) => {
                  const eventHour = new Date(event.start).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      'min-h-[60px] p-1 border-l border-border/50 relative',
                      isSameDay(day, new Date()) && 'bg-primary/5'
                    )}
                  >
                    {dayEvents.map((event) => {
                      const client = mockClients.find(
                        (c) => c.id === event.clientId
                      );
                      return (
                        <div
                          key={event.id}
                          className="absolute inset-x-1 rounded-lg p-2 text-xs cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:z-10"
                          style={{
                            backgroundColor: event.color
                              ? `${event.color}20`
                              : 'hsl(var(--primary) / 0.1)',
                            borderLeft: `3px solid ${
                              event.color || 'hsl(var(--primary))'
                            }`,
                          }}
                        >
                          <p
                            className="font-medium truncate"
                            style={{ color: event.color || 'hsl(var(--primary))' }}
                          >
                            {client?.name || event.title}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {format(new Date(event.start), 'HH:mm')} -{' '}
                            {format(new Date(event.end), 'HH:mm')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Trénink</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Osobní</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
          <span>Ostatní</span>
        </div>
      </div>
    </div>
  );
}
