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
  Clock,
  CheckCircle,
  XCircle,
  Stethoscope,
  Image,
  CheckCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HorizontalChipScroller } from '@/components/ui/HorizontalChipScroller';
import { cn } from '@/lib/utils';
import { useClientTimeline, TimelineEvent, TimelineEventType } from '@/hooks/useClientTimeline';
import { useRedFlagResolutions, useResolveRedFlag } from '@/hooks/useRedFlagResolutions';

interface ClientTimelineProps {
  clientId: string;
  defaultLimit?: number;
  showFilters?: boolean;
}

type PeriodFilter = '7' | '14' | '30' | 'all';
type ContentFilter = 'all' | TimelineEventType;

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
    icon: Stethoscope,
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
    icon: Image,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10',
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
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [showRedFlagsOnly, setShowRedFlagsOnly] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  
  const daysBack = periodFilter !== 'all' ? parseInt(periodFilter) : undefined;
  const { data: events = [], isLoading } = useClientTimeline(clientId, { limit: 100, daysBack });
  const { data: resolutions = [] } = useRedFlagResolutions(clientId);
  const resolveRedFlag = useResolveRedFlag();

  // Create a set of resolved feedback IDs for quick lookup
  const resolvedFeedbackIds = new Set(resolutions.map(r => r.feedback_id));

  const filteredEvents = events.filter(event => {
    // Red flags filter
    if (showRedFlagsOnly && !event.isRedFlag) return false;
    // Content type filter
    if (contentFilter !== 'all' && event.type !== contentFilter) return false;
    return true;
  }).slice(0, limit);

  const groupedEvents = groupEventsByDate(filteredEvents);
  const hasMore = events.length > limit;

  const handleResolveClick = (feedbackId: string) => {
    setSelectedFeedbackId(feedbackId);
    setResolutionNote('');
    setResolveDialogOpen(true);
  };

  const handleResolveSubmit = () => {
    if (!selectedFeedbackId) return;
    resolveRedFlag.mutate({
      feedbackId: selectedFeedbackId,
      clientId,
      note: resolutionNote || undefined,
    }, {
      onSuccess: () => {
        setResolveDialogOpen(false);
        setSelectedFeedbackId(null);
        setResolutionNote('');
      }
    });
  };

  // Content filter chip options
  const contentChipOptions = [
    { value: 'all', label: 'Vše' },
    { value: 'training_completed', label: 'Tréninky' },
    { value: 'feedback_received', label: 'Feedback' },
    { value: 'measurement', label: 'Měření' },
    { value: 'diagnostic', label: 'Diagnostiky' },
    { value: 'media_uploaded', label: 'Média' },
  ];

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
      {/* Filters - Redesigned */}
      {showFilters && (
        <div className="space-y-3">
          {/* Row 1: Period dropdown + Red flags toggle */}
          <div className="flex items-center gap-3">
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dní</SelectItem>
                <SelectItem value="14">14 dní</SelectItem>
                <SelectItem value="30">30 dní</SelectItem>
                <SelectItem value="all">Vše</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="red-flags"
                checked={showRedFlagsOnly}
                onCheckedChange={setShowRedFlagsOnly}
              />
              <Label htmlFor="red-flags" className="text-xs flex items-center gap-1 cursor-pointer">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                Red flags
              </Label>
            </div>
          </div>

          {/* Row 2: Content type chips */}
          <HorizontalChipScroller
            options={contentChipOptions}
            value={contentFilter}
            onChange={(v) => setContentFilter(v as ContentFilter)}
          />
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
              const feedbackId = event.type === 'feedback_received' && event.relatedId 
                ? event.relatedId 
                : null;
              const isResolved = feedbackId ? resolvedFeedbackIds.has(feedbackId) : false;
              
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
                    event.isRedFlag && !isResolved && 'ring-2 ring-destructive',
                    event.isRedFlag && isResolved && 'ring-2 ring-green-500'
                  )}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground flex items-center gap-2 flex-wrap">
                          {event.title}
                          {event.isRedFlag && !isResolved && (
                            <Badge variant="destructive" className="h-4 text-[10px] px-1">
                              Red flag
                            </Badge>
                          )}
                          {event.isRedFlag && isResolved && (
                            <Badge variant="outline" className="h-4 text-[10px] px-1 border-green-500/50 text-green-600 gap-0.5">
                              <CheckCheck className="w-2.5 h-2.5" />
                              Vyřešeno
                            </Badge>
                          )}
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {event.isRedFlag && !isResolved && feedbackId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => handleResolveClick(feedbackId)}
                          >
                            Vyřešit
                          </Button>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(event.date), 'HH:mm')}
                        </span>
                      </div>
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

                    {event.metadata && event.type === 'diagnostic' && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4 px-1 mt-1"
                      >
                        {event.metadata.area_type}
                      </Badge>
                    )}

                    {event.metadata && event.type === 'media_uploaded' && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4 px-1 mt-1"
                      >
                        {event.metadata.category || event.metadata.type}
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

      {/* Resolve Red Flag Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Označit red flag jako vyřešený</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Poznámka k vyřešení (volitelné)..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleResolveSubmit}
              disabled={resolveRedFlag.isPending}
            >
              {resolveRedFlag.isPending ? 'Ukládám...' : 'Označit jako vyřešený'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
