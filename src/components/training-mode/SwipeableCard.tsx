import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
}

const SWIPE_THRESHOLD = 100;
const MAX_ROTATION = 8;

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className,
  leftLabel = "Zrušit",
  rightLabel = "Dokončit",
}: SwipeableCardProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  // Visual feedback transforms
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30, 0], [1, 0.5, 0]);
  const rightOpacity = useTransform(x, [0, 30, SWIPE_THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const rotate = useTransform(x, [-200, 0, 200], [-MAX_ROTATION, 0, MAX_ROTATION]);

  // Background colors based on swipe direction
  const leftBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0.3, 0]);
  const rightBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.3]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);

      if (disabled) return;

      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Check if swipe threshold reached (either by distance or velocity)
      if (offset < -SWIPE_THRESHOLD || velocity < -500) {
        // Swipe left - cancel
        if (onSwipeLeft) {
          if (navigator.vibrate) navigator.vibrate(50);
          onSwipeLeft();
        }
      } else if (offset > SWIPE_THRESHOLD || velocity > 500) {
        // Swipe right - complete
        if (onSwipeRight) {
          if (navigator.vibrate) navigator.vibrate(50);
          onSwipeRight();
        }
      }
    },
    [disabled, onSwipeLeft, onSwipeRight]
  );

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {/* Left action indicator (Cancel) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6 bg-destructive/20 rounded-xl"
        style={{ opacity: leftOpacity }}
      >
        <div className="flex items-center gap-2 text-destructive font-medium">
          <X className="w-6 h-6" />
          <span>{leftLabel}</span>
        </div>
      </motion.div>

      {/* Right action indicator (Complete) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 bg-success/20 rounded-xl"
        style={{ opacity: rightOpacity }}
      >
        <div className="flex items-center gap-2 text-success font-medium">
          <span>{rightLabel}</span>
          <Check className="w-6 h-6" />
        </div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, scale, rotate }}
        className={cn(
          "relative touch-pan-y cursor-grab active:cursor-grabbing",
          isDragging && "z-10",
          className
        )}
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
