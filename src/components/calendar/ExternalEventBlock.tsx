import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExternalCalendarEvent } from '@/hooks/useExternalCalendarEvents';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExternalEventBlockProps {
  event: ExternalCalendarEvent;
}

export function ExternalEventBlock({ event }: ExternalEventBlockProps) {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'rounded-xl p-4 mb-2 cursor-default select-none relative overflow-hidden',
              'bg-purple-500/5 border-2 border-dashed border-purple-500/40'
            )}
          >
            {/* Colored left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-purple-500" />
            
            <div className="flex items-start gap-3 pl-2">
              {/* Time column */}
              <div className="flex-shrink-0 text-center min-w-[60px]">
                {event.all_day ? (
                  <p className="text-sm font-medium text-purple-500/80">Celý den</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-purple-500/80">
                      {format(startTime, 'HH:mm')}
                    </p>
                    <p className="text-xs text-purple-500/60">
                      –{format(endTime, 'HH:mm')}
                    </p>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-12 bg-purple-500/20 flex-shrink-0" />

              {/* Info column */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {/* Calendar icon */}
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-purple-500" />
                </div>
                
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/80 truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Externí kalendář
                  </p>
                </div>
              </div>

              {/* Duration badge */}
              {!event.all_day && (
                <div className="flex-shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-500/10 text-purple-500">
                    {durationMinutes} min
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3 h-3 text-purple-500" />
              <p className="font-medium">{event.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {event.all_day 
                ? 'Celý den'
                : `${format(startTime, 'HH:mm')} – ${format(endTime, 'HH:mm')} (${durationMinutes} min)`
              }
            </p>
            <p className="text-xs text-muted-foreground/60">
              Zdroj: {event.source}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
