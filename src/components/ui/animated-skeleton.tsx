import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedSkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rounded' | 'text';
  animation?: 'pulse' | 'shimmer' | 'wave';
}

export function AnimatedSkeleton({
  className,
  variant = 'default',
  animation = 'shimmer',
}: AnimatedSkeletonProps) {
  const variants = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
    text: 'rounded h-4',
  };

  const animations = {
    pulse: 'animate-pulse bg-muted',
    shimmer: 'skeleton-shimmer',
    wave: 'skeleton-wave',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-muted',
        variants[variant],
        animations[animation],
        className
      )}
    />
  );
}

/**
 * Skeleton for cards with staggered animation
 */
interface CardSkeletonProps {
  className?: string;
  rows?: number;
  showAvatar?: boolean;
  showAction?: boolean;
}

export function CardSkeleton({
  className,
  rows = 2,
  showAvatar = true,
  showAction = false,
}: CardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn('glass rounded-xl p-4', className)}
    >
      <div className="flex items-start gap-4">
        {showAvatar && (
          <AnimatedSkeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <AnimatedSkeleton
              key={i}
              variant="text"
              className={cn('h-4', i === 0 ? 'w-3/4' : 'w-1/2')}
            />
          ))}
        </div>
        {showAction && (
          <AnimatedSkeleton className="w-20 h-8 rounded-full flex-shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton for lists with staggered children
 */
interface ListSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  showAvatar?: boolean;
  showAction?: boolean;
}

export function ListSkeleton({
  count = 5,
  className,
  itemClassName,
  showAvatar = true,
  showAction = false,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          <CardSkeleton
            className={itemClassName}
            showAvatar={showAvatar}
            showAction={showAction}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Skeleton for stats/KPI grids
 */
interface StatSkeletonProps {
  count?: number;
  className?: string;
}

export function StatSkeleton({ count = 4, className }: StatSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className="glass rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <AnimatedSkeleton variant="rounded" className="w-8 h-8" />
            <AnimatedSkeleton variant="text" className="w-16 h-3" />
          </div>
          <AnimatedSkeleton variant="text" className="w-24 h-6" />
          <AnimatedSkeleton variant="text" className="w-20 h-3" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Skeleton for charts
 */
interface ChartSkeletonProps {
  className?: string;
  showHeader?: boolean;
}

export function ChartSkeleton({ className, showHeader = true }: ChartSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('glass rounded-xl p-4 md:p-6', className)}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <AnimatedSkeleton variant="text" className="w-32 h-5" />
          <AnimatedSkeleton variant="rounded" className="w-24 h-8" />
        </div>
      )}
      <div className="relative h-48 md:h-64">
        {/* Fake chart bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around gap-2 h-full pt-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${30 + Math.random() * 60}%` }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
              className="flex-1 bg-muted rounded-t-md skeleton-shimmer"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
