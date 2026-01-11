/**
 * ExerciseHistorySheet - Shows chronological history of exercise results
 * Displays all entries for a specific exercise with dates and values
 */
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Dumbbell, Timer, Repeat, Ruler, TrendingUp, TrendingDown, Calendar, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useExerciseHistory, ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { ExercisePR } from '@/hooks/useClientExercisePRs';
import { cn } from '@/lib/utils';

interface ExerciseHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pr: ExercisePR | null;
  clientId: string;
  clientName?: string;
}

// Metric type icon helper
function MetricIcon({ type, className }: { type: ExerciseHistoryEntry['metricType']; className?: string }) {
  switch (type) {
    case 'weight':
      return <Dumbbell className={cn("w-4 h-4", className)} />;
    case 'time':
      return <Timer className={cn("w-4 h-4", className)} />;
    case 'reps':
      return <Repeat className={cn("w-4 h-4", className)} />;
    case 'distance':
      return <Ruler className={cn("w-4 h-4", className)} />;
    default:
      return <Dumbbell className={cn("w-4 h-4", className)} />;
  }
}

// Get color classes for metric type
function getMetricColorClasses(type: ExerciseHistoryEntry['metricType']) {
  switch (type) {
    case 'weight':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        border: 'border-orange-500/20',
      };
    case 'time':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-500',
        border: 'border-blue-500/20',
      };
    case 'reps':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-500',
        border: 'border-green-500/20',
      };
    case 'distance':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-500',
        border: 'border-purple-500/20',
      };
    default:
      return {
        bg: 'bg-primary/10',
        text: 'text-primary',
        border: 'border-primary/20',
      };
  }
}

// Single history entry row
function HistoryRow({ 
  entry, 
  previousEntry,
  isFirst 
}: { 
  entry: ExerciseHistoryEntry; 
  previousEntry?: ExerciseHistoryEntry;
  isFirst: boolean;
}) {
  const colors = getMetricColorClasses(entry.metricType);
  
  // Calculate trend compared to previous entry (chronologically older)
  // Note: entries are sorted DESC, so previousEntry is actually older
  let trend: 'up' | 'down' | null = null;
  if (previousEntry) {
    const currentValue = entry.weight_kg || entry.time_seconds || entry.distance_meters || entry.reps || 0;
    const previousValue = previousEntry.weight_kg || previousEntry.time_seconds || previousEntry.distance_meters || previousEntry.reps || 0;
    
    if (currentValue > previousValue) {
      // For time-based (cardio), higher is worse. For others, higher is better.
      trend = entry.metricType === 'time' ? 'down' : 'up';
    } else if (currentValue < previousValue) {
      trend = entry.metricType === 'time' ? 'up' : 'down';
    }
  }
  
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 px-3 rounded-xl transition-colors",
      isFirst ? "bg-primary/5 border border-primary/20" : "bg-secondary/50"
    )}>
      {/* Date */}
      <div className="flex flex-col items-center justify-center min-w-[60px]">
        <span className="text-xs text-muted-foreground uppercase">
          {format(parseISO(entry.date), 'MMM', { locale: cs })}
        </span>
        <span className="text-lg font-bold">
          {format(parseISO(entry.date), 'd')}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(parseISO(entry.date), 'yyyy')}
        </span>
      </div>
      
      {/* Metric icon */}
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <MetricIcon type={entry.metricType} className={colors.text} />
      </div>
      
      {/* Value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", isFirst && "text-primary")}>
            {entry.displayValue}
          </span>
          {isFirst && (
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
              PR
            </Badge>
          )}
        </div>
        {entry.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {entry.notes}
          </p>
        )}
      </div>
      
      {/* Trend indicator */}
      {trend && (
        <div className={cn(
          "p-1.5 rounded-full",
          trend === 'up' ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
}

export function ExerciseHistorySheet({ 
  open, 
  onOpenChange, 
  pr, 
  clientId,
  clientName 
}: ExerciseHistorySheetProps) {
  const { data: history = [], isLoading } = useExerciseHistory(
    open ? clientId : null,
    pr?.exerciseName,
    pr?.exerciseId,
    pr?.side
  );
  
  // Find the best value entry (for highlighting)
  const bestEntryId = history.length > 0 
    ? history.reduce((best, entry) => {
        const currentValue = entry.weight_kg || entry.time_seconds || entry.distance_meters || entry.reps || 0;
        const bestValue = best.weight_kg || best.time_seconds || best.distance_meters || best.reps || 0;
        
        // For time-based (cardio), lower is better
        if (entry.metricType === 'time') {
          return currentValue < bestValue ? entry : best;
        }
        return currentValue > bestValue ? entry : best;
      }, history[0]).id
    : null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            {pr && (
              <div className={cn(
                "p-2.5 rounded-xl",
                getMetricColorClasses(pr.metricType).bg
              )}>
                <MetricIcon type={pr.metricType} className={getMetricColorClasses(pr.metricType).text} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left truncate">
                {pr?.exerciseName || 'Historie cviku'}
              </SheetTitle>
              {clientName && (
                <p className="text-sm text-muted-foreground mt-0.5">{clientName}</p>
              )}
            </div>
            {pr && (
              <Badge variant="secondary" className="font-mono font-bold text-base shrink-0">
                {pr.bestDisplay}
              </Badge>
            )}
          </div>
        </SheetHeader>
        
        {isLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Calendar className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              Žádné záznamy pro tento cvik
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(85vh-120px)]">
            <div className="space-y-2 pb-8">
              {history.map((entry, index) => (
                <HistoryRow 
                  key={entry.id}
                  entry={entry}
                  previousEntry={history[index + 1]}
                  isFirst={entry.id === bestEntryId}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Stats footer */}
        {history.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{history.length} záznamů</span>
              <span>•</span>
              <span>
                {format(parseISO(history[history.length - 1].date), 'd. M. yyyy', { locale: cs })} – {format(parseISO(history[0].date), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
