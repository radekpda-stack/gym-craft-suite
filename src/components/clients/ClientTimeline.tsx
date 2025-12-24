import { useState } from 'react';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dumbbell,
  MessageSquare,
  Scale,
  CreditCard,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientTimeline, TimelineEvent, TimelineEventType } from '@/hooks/useClientTimeline';

interface ClientTimelineProps {
  clientId: string;
  defaultLimit?: number;
  showFilters?: boolean;
}

const EVENT_CONFIG: Record<TimelineEventType, {
  icon: typeof Dumbbell;
  color: string;
  bgColor: string;
}> = {
  training_completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  training_scheduled: {
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  training_cancelled: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  feedback_received: {
    icon: MessageSquare,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  feedback_requested: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
  },
  measurement: {
    icon: Scale,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  diagnostic: {
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
  credit_change: {
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  note_added: {
    icon: MessageSquare,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary',
  },
  media_uploaded: {
    icon: Calendar,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary',
  },
};

function formatEventDate(date: string): string {
  const d = new Date(date);
  if (isToday(d)) return 'Dnes';
  if (isYesterday(d)) return 'Včera';
  const days = differenceInDays(new Date(), d);
  if (days < 7) return `Před ${days} dny`;
  return format(d, 'd. MMMM', { locale: cs });
}

function groupEventsByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  
  events.forEach(event => {
    const dateKey = event.date.split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });
  
  return groups;
}

export function ClientTimeline({ clientId, defaultLimit = 20, showFilters = true }: ClientTimelineProps) {
  const [limit, setLimit] = useState(defaultLimit);
  const [filterType, setFilterType] = useState<TimelineEventType | 'all' | 'red_flags'>('all');
  const { data: events = [], isLoading } = useClientTimeline(clientId, { limit: 100 });

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    if (filterType === 'red_flags') return event.isRedFlag;
    return event.type === filterType;
  }).slice(0, limit);

  const groupedEvents = groupEventsByDate(filteredEvents);
  const hasMore = events.length > limit;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Zatím žádné události</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="h-7 text-xs"
          >
            Vše
          </Button>
          <Button
            variant={filterType === 'red_flags' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilterType('red_flags')}
            className="h-7 text-xs gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            Red flags
          </Button>
          <Button
            variant={filterType === 'training_completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('training_completed')}
            className="h-7 text-xs"
          >
            Tréninky
          </Button>
          <Button
            variant={filterType === 'feedback_received' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('feedback_received')}
            className="h-7 text-xs"
          >
            Feedback
          </Button>
          <Button
            variant={filterType === 'measurement' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('measurement')}
            className="h-7 text-xs"
          >
            Měření
          </Button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="mb-4">
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2 pl-12">
              <span className="text-xs font-medium text-muted-foreground">
                {formatEventDate(dateKey)}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Events for this day */}
            {dayEvents.map((event, idx) => {
              const config = EVENT_CONFIG[event.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={event.id}
                  className={cn(
                    'relative flex gap-3 pb-3',
                    idx === dayEvents.length - 1 && 'pb-0'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                    config.bgColor,
                    event.isRedFlag && 'ring-2 ring-destructive'
                  )}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground flex items-center gap-2">
                          {event.title}
                          {event.isRedFlag && (
                            <Badge variant="destructive" className="h-4 text-[10px] px-1">
                              Red flag
                            </Badge>
                          )}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(event.date), 'HH:mm')}
                      </span>
                    </div>

                    {/* Metadata badges */}
                    {event.metadata && event.type === 'feedback_received' && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {event.metadata.pain != null && event.metadata.pain > 0 && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-[10px] h-4 px-1',
                              event.metadata.pain >= 7 && 'border-destructive/50 text-destructive'
                            )}
                          >
                            Bolest: {event.metadata.pain}/10
                          </Badge>
                        )}
                        {event.metadata.energy != null && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-[10px] h-4 px-1',
                              event.metadata.energy <= 3 && 'border-warning/50 text-warning'
                            )}
                          >
                            Energie: {event.metadata.energy}/10
                          </Badge>
                        )}
                      </div>
                    )}

                    {event.metadata && event.type === 'credit_change' && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px] h-4 px-1 mt-1',
                          event.metadata.amount > 0 ? 'border-green-500/50 text-green-600' : 'border-red-500/50 text-red-600'
                        )}
                      >
                        {event.metadata.amount > 0 ? '+' : ''}{event.metadata.amount} Kč
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLimit(prev => prev + 20)}
          className="w-full"
        >
          <ChevronDown className="w-4 h-4 mr-2" />
          Zobrazit více
        </Button>
      )}
    </div>
  );
}
