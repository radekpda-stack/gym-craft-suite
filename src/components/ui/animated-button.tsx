import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';
import { haptic } from '@/lib/haptics';
import { type VariantProps } from 'class-variance-authority';

export interface AnimatedButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  hapticFeedback?: boolean;
  successAnimation?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      loading = false,
      loadingText,
      hapticFeedback = true,
      successAnimation = false,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showSuccess, setShowSuccess] = React.useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      if (hapticFeedback) {
        haptic('medium');
      }

      if (successAnimation) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);
      }

      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        onClick={handleClick}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText && <span className="ml-2">{loadingText}</span>}
          </>
        ) : showSuccess ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-lg"
          >
            ✓
          </motion.span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

export { AnimatedButton };
