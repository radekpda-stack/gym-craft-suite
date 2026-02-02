import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'card';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
  size = 'md',
  variant = 'default',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'w-8 h-8',
      iconWrapper: 'w-14 h-14',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-8',
      icon: 'w-10 h-10',
      iconWrapper: 'w-18 h-18',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      container: 'py-12',
      icon: 'w-12 h-12',
      iconWrapper: 'w-24 h-24',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const variantClasses = {
    default: 'bg-transparent',
    muted: 'bg-muted/20 rounded-2xl backdrop-blur-sm',
    card: 'bg-card/60 border border-border/30 rounded-2xl shadow-sm backdrop-blur-sm',
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        classes.container,
        variantClasses[variant],
        className
      )}
    >
      {/* Animated icon with breathing effect */}
      <motion.div
        className={cn(
          'rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center mb-4',
          classes.iconWrapper
        )}
        animate={{ 
          scale: [1, 1.03, 1],
          opacity: [0.7, 0.9, 0.7] 
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Icon className={cn('text-muted-foreground/60', classes.icon)} />
      </motion.div>
      
      <h3 className={cn('font-medium text-foreground mb-1', classes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-[280px]', classes.description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
      {!action && actionLabel && onAction && (
        <motion.div 
          className="mt-4"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            onClick={onAction} 
            size={size === 'sm' ? 'sm' : 'default'}
            className="rounded-xl"
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
