import { memo, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes, isBefore } from 'date-fns';
import { ScheduleItem } from '@/hooks/useDashboardViewModel';

interface TrainingFocusTimelineProps {
  schedule: ScheduleItem[];
  className?: string;
}

interface TimelineItemProps {
  item: ScheduleItem;
  index: number;
  focusIndex: number;
  onClick: () => void;
}

const getScale = (index: number, focusIndex: number): number => {
  const distance = Math.abs(index - focusIndex);
  return Math.max(0.75, 1 - distance * 0.08);
};

const getOpacity = (index: number, focusIndex: number): number => {
  const distance = Math.abs(index - focusIndex);
  return Math.max(0.5, 1 - distance * 0.15);
};

const TimelineItem = memo(function TimelineItem({ 
  item, 
  index, 
  focusIndex, 
  onClick 
}: TimelineItemProps) {
  const isFocused = index === focusIndex;
  const isPast = index < focusIndex;
  const scale = getScale(index, focusIndex);
  const opacity = getOpacity(index, focusIndex);
  
  const now = new Date();
  const trainingTime = new Date(item.date);
  const minutesUntil = differenceInMinutes(trainingTime, now);
  
  const getTimeLabel = () => {
    if (minutesUntil < 0) return 'Proběhlo';
    if (minutesUntil < 60) return `Za ${minutesUntil} min`;
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    return mins > 0 ? `Za ${hours}h ${mins}min` : `Za ${hours}h`;
  };

  const getStatusIcon = () => {
    if (item.status === 'cancelled') return <XCircle className="w-4 h-4 text-muted-foreground" />;
    if (item.status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (isFocused) return <Play className="w-5 h-5 text-primary" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getBackgroundStyles = () => {
    if (item.status === 'cancelled') return 'bg-muted/30 opacity-50';
    if (item.status === 'completed') return 'bg-emerald-500/10 border-emerald-500/20';
    if (isFocused) return 'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10';
    if (isPast) return 'bg-muted/20 border-border/30';
    return 'bg-secondary/30 border-border/30';
  };

  return (
    <motion.button
      onClick={onClick}
      initial={false}
      animate={{
        scale,
        opacity,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className={cn(
        'flex-shrink-0 flex flex-col items-center gap-2 rounded-xl border transition-colors',
        'hover:bg-secondary/50 active:scale-95',
        getBackgroundStyles(),
        isFocused ? 'w-36 py-4 px-3' : 'w-28 py-3 px-2',
        item.status === 'cancelled' && 'line-through'
      )}
      style={{ transformOrigin: 'center center' }}
    >
      {/* Icon */}
      <div className={cn(
        'rounded-xl flex items-center justify-center',
        isFocused ? 'p-2.5 bg-primary/20' : 'p-2 bg-secondary/50'
      )}>
        {getStatusIcon()}
      </div>
      
      {/* Content */}
      <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
        {isFocused && (
          <span className="text-[10px] text-primary/70 font-medium uppercase tracking-wider">
            Příští
          </span>
        )}
        <span className={cn(
          'font-semibold text-center truncate w-full',
          isFocused ? 'text-sm text-foreground' : 'text-xs text-foreground/80',
          item.status === 'cancelled' && 'text-muted-foreground'
        )}>
          {item.clientName}
        </span>
        <span className={cn(
          'text-muted-foreground tabular-nums',
          isFocused ? 'text-xs' : 'text-[10px]'
        )}>
          {item.time}
        </span>
        {isFocused && item.status === 'scheduled' && (
          <span className="text-[10px] text-primary font-medium mt-0.5">
            {getTimeLabel()}
          </span>
        )}
      </div>
      
      {isFocused && (
        <ChevronRight className="w-4 h-4 text-primary/60 mt-1" />
      )}
    </motion.button>
  );
});

export const TrainingFocusTimeline = memo(function TrainingFocusTimeline({ 
  schedule,
  className 
}: TrainingFocusTimelineProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Find the focus index (next upcoming training)
  const focusIndex = useMemo(() => {
    const now = new Date();
    const idx = schedule.findIndex(t => 
      t.status === 'scheduled' && !isBefore(new Date(t.date), now)
    );
    // If no upcoming training found, focus on last item or 0
    return idx >= 0 ? idx : Math.max(0, schedule.length - 1);
  }, [schedule]);
  
  // Auto-scroll to focus item on mount
  useEffect(() => {
    if (scrollRef.current && schedule.length > 0) {
      const container = scrollRef.current;
      const focusedItem = container.children[focusIndex] as HTMLElement;
      
      if (focusedItem) {
        const containerWidth = container.offsetWidth;
        const itemLeft = focusedItem.offsetLeft;
        const itemWidth = focusedItem.offsetWidth;
        
        // Center the focused item
        const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  }, [focusIndex, schedule.length]);

  if (schedule.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Gradient overlays for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Timeline container */}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-6 snap-x snap-mandatory"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {schedule.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            index={index}
            focusIndex={focusIndex}
            onClick={() => navigate(`/trainings/${item.id}`)}
          />
        ))}
      </div>
    </div>
  );
});
