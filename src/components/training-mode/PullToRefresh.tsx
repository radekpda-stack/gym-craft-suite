import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  
  const pullDistance = useMotionValue(0);

  // Visual transforms
  const indicatorOpacity = useTransform(pullDistance, [0, 30, PULL_THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotate = useTransform(pullDistance, [0, PULL_THRESHOLD, MAX_PULL], [0, 180, 360]);
  const contentY = useTransform(pullDistance, [0, MAX_PULL], [0, MAX_PULL]);

  const resetPull = useCallback(() => {
    animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
    touchStartY.current = null;
    isPulling.current = false;
  }, [pullDistance]);

  const handleRefreshAction = useCallback(async () => {
    setIsRefreshing(true);
    if (navigator.vibrate) navigator.vibrate(30);
    
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
      resetPull();
    }
  }, [onRefresh, resetPull]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    // Only activate pull-to-refresh when at the very top
    if (scrollEl.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || touchStartY.current === null) return;
    
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Only handle pull-down gesture when at the top
    if (deltaY > 0 && scrollEl.scrollTop <= 0) {
      isPulling.current = true;
      
      // Apply resistance for rubber-band effect
      const resistance = 0.5;
      const pullValue = Math.min(deltaY * resistance, MAX_PULL);
      pullDistance.set(pullValue);
      
      // Prevent default only when actively pulling to refresh
      // This allows normal scroll behavior in all other cases
      if (pullValue > 10) {
        e.preventDefault();
      }
    } else if (!isPulling.current) {
      // Reset if we're not pulling (allows normal scroll)
      touchStartY.current = null;
    }
  }, [isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(() => {
    if (isRefreshing || !isPulling.current) {
      touchStartY.current = null;
      isPulling.current = false;
      return;
    }
    
    const currentPull = pullDistance.get();
    
    if (currentPull >= PULL_THRESHOLD) {
      // Trigger refresh
      handleRefreshAction();
    } else {
      // Snap back
      resetPull();
    }
  }, [isRefreshing, pullDistance, handleRefreshAction, resetPull]);

  // Also reset when refreshing completes
  useEffect(() => {
    if (!isRefreshing) {
      resetPull();
    }
  }, [isRefreshing, resetPull]);

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
    <div className={cn("relative h-full", className)}>
      {/* Pull indicator - positioned above content */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center h-16 z-10 pointer-events-none"
        style={{ 
          opacity: indicatorOpacity,
          y: useTransform(pullDistance, [0, MAX_PULL], [-64, MAX_PULL - 64]),
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

      {/* Scrollable content - native scroll, no drag */}
      <motion.div
        ref={scrollRef}
        className="h-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        style={{ y: isRefreshing ? 60 : contentY }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
