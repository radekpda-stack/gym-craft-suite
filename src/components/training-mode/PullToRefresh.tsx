import { ReactNode, useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  // Visual transforms
  const indicatorOpacity = useTransform(y, [0, 30, PULL_THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotate = useTransform(y, [0, PULL_THRESHOLD, MAX_PULL], [0, 180, 360]);

  const handleDragEnd = useCallback(
    async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isRefreshing) return;

      // Check if we're at the top of scroll
      const container = containerRef.current;
      if (container && container.scrollTop > 5) return;

      if (info.offset.y > PULL_THRESHOLD) {
        setIsRefreshing(true);
        if (navigator.vibrate) navigator.vibrate(30);
        
        try {
          await onRefresh();
          setLastRefresh(new Date());
        } finally {
          setIsRefreshing(false);
        }
      }
    },
    [isRefreshing, onRefresh]
  );

  const getLastRefreshText = () => {
    if (!lastRefresh) return null;
    
    const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (diff < 60) return 'právě teď';
    if (diff < 120) return 'před 1 min';
    if (diff < 3600) return `před ${Math.floor(diff / 60)} min`;
    return null;
  };

  const lastRefreshText = getLastRefreshText();

  return (
    <div className={cn("relative", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center h-16 -mt-16 z-10"
        style={{ 
          opacity: indicatorOpacity,
          y: useTransform(y, [0, MAX_PULL], [0, MAX_PULL]),
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : (
          <motion.div style={{ scale: indicatorScale, rotate: indicatorRotate }}>
            <ArrowDown className="w-6 h-6 text-primary" />
          </motion.div>
        )}
        <span className="text-xs text-muted-foreground mt-1">
          {isRefreshing ? 'Aktualizuji...' : 'Potáhni pro aktualizaci'}
        </span>
      </motion.div>

      {/* Last refresh indicator */}
      {lastRefreshText && !isRefreshing && (
        <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <span className="text-[10px] text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded-full">
            Aktualizováno {lastRefreshText}
          </span>
        </div>
      )}

      {/* Content with drag */}
      <motion.div
        ref={containerRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y: isRefreshing ? 60 : y }}
        className="h-full overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
