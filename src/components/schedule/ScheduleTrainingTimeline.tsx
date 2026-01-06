import { memo, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Play, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes, isBefore } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrainingSession } from '@/hooks/useTrainingSessions';

interface Client {
  id: string;
  name: string;
}

interface ScheduleTrainingTimelineProps {
  sessions: TrainingSession[];
  clients: Client[];
  className?: string;
}

interface TimelineItemProps {
  session: TrainingSession;
  client: Client | undefined;
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
  session, 
  client,
  index, 
  focusIndex, 
  onClick 
}: TimelineItemProps) {
  const isFocused = index === focusIndex;
  const isPast = index < focusIndex;
  const scale = getScale(index, focusIndex);
  const opacity = getOpacity(index, focusIndex);
  
  const now = new Date();
  const trainingTime = new Date(session.date);
  const minutesUntil = differenceInMinutes(trainingTime, now);
  
  const getTimeLabel = () => {
    if (session.status === 'completed') return 'Dokončeno';
    if (session.status === 'canceled') return 'Zrušeno';
    if (minutesUntil < 0) return 'Probíhá';
    if (minutesUntil < 60) return `Za ${minutesUntil} min`;
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    return mins > 0 ? `Za ${hours}h ${mins}min` : `Za ${hours}h`;
  };

  const getStatusIcon = () => {
    if (session.status === 'canceled') return <XCircle className="w-4 h-4 text-muted-foreground" />;
    if (session.status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (isFocused) return <Play className="w-5 h-5 text-primary" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getBackgroundStyles = () => {
    if (session.status === 'canceled') return 'bg-muted/30 opacity-50';
    if (session.status === 'completed') return 'bg-emerald-500/10 border-emerald-500/20';
    if (isFocused) return 'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10';
    if (isPast) return 'bg-muted/20 border-border/30';
    return 'bg-secondary/30 border-border/30';
  };

  const clientName = client?.name || 'Neznámý klient';
  const timeString = format(trainingTime, 'HH:mm');

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
        session.status === 'canceled' && 'line-through'
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
        {isFocused && session.status === 'scheduled' && (
          <span className="text-[10px] text-primary/70 font-medium uppercase tracking-wider">
            Příští
          </span>
        )}
        <span className={cn(
          'font-semibold text-center truncate w-full',
          isFocused ? 'text-sm text-foreground' : 'text-xs text-foreground/80',
          session.status === 'canceled' && 'text-muted-foreground'
        )}>
          {clientName}
        </span>
        <span className={cn(
          'text-muted-foreground tabular-nums',
          isFocused ? 'text-xs' : 'text-[10px]'
        )}>
          {timeString}
        </span>
        {isFocused && session.status === 'scheduled' && (
          <span className="text-[10px] text-primary font-medium mt-0.5">
            {getTimeLabel()}
          </span>
        )}
        {session.status === 'completed' && (
          <span className="text-[10px] text-emerald-500 font-medium">
            ✓ Hotovo
          </span>
        )}
      </div>
      
      {isFocused && (
        <ChevronRight className="w-4 h-4 text-primary/60 mt-1" />
      )}
    </motion.button>
  );
});

export const ScheduleTrainingTimeline = memo(function ScheduleTrainingTimeline({ 
  sessions,
  clients,
  className 
}: ScheduleTrainingTimelineProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Create a client lookup map for performance
  const clientMap = useMemo(() => {
    return new Map(clients.map(c => [c.id, c]));
  }, [clients]);
  
  // Find the focus index (next upcoming training)
  const focusIndex = useMemo(() => {
    const now = new Date();
    const idx = sessions.findIndex(s => 
      s.status === 'scheduled' && !isBefore(new Date(s.date), now)
    );
    // If no upcoming training found, focus on last completed or first item
    if (idx >= 0) return idx;
    
    // Find last completed training
    const lastCompleted = sessions.reduce((acc, s, i) => 
      s.status === 'completed' ? i : acc, -1
    );
    return lastCompleted >= 0 ? lastCompleted : 0;
  }, [sessions]);
  
  // Auto-scroll to focus item on mount and when focus changes
  useEffect(() => {
    if (scrollRef.current && sessions.length > 0) {
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
  }, [focusIndex, sessions.length]);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative border-b border-border/30 bg-background/50', className)}>
      {/* Gradient overlays for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Timeline container */}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-4 px-6 snap-x snap-mandatory"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {sessions.map((session, index) => (
          <TimelineItem
            key={session.id}
            session={session}
            client={clientMap.get(session.client_id)}
            index={index}
            focusIndex={focusIndex}
            onClick={() => navigate(`/trainings/${session.id}`)}
          />
        ))}
      </div>
    </div>
  );
});
