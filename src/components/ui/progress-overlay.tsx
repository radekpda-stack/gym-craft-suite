import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

interface ProgressOverlayProps {
  show: boolean;
  progress?: number;
  message?: string;
  subMessage?: string;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressOverlay({
  show,
  progress = 0,
  message = 'Zpracovávám...',
  subMessage,
  indeterminate = false,
  className,
}: ProgressOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="glass rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4"
          >
            {/* Animated icon */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 mx-auto rounded-full border-4 border-primary/30 border-t-primary"
            />

            {/* Message */}
            <div className="space-y-1">
              <p className="font-medium text-foreground">{message}</p>
              {subMessage && (
                <p className="text-sm text-muted-foreground">{subMessage}</p>
              )}
            </div>

            {/* Progress bar */}
            {!indeterminate && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
              </div>
            )}

            {/* Indeterminate animation */}
            {indeterminate && (
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ x: '-100%', width: '30%' }}
                  animate={{ x: '400%' }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline progress bar for forms/sections
 */
interface InlineProgressProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineProgress({
  progress,
  label,
  showPercentage = true,
  className,
  size = 'md',
}: InlineProgressProps) {
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-foreground font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className={cn('bg-secondary rounded-full overflow-hidden', heights[size])}>
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
}
