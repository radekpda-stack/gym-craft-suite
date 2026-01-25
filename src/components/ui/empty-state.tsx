import { ReactNode } from 'react';
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
      iconWrapper: 'w-12 h-12',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-8',
      icon: 'w-10 h-10',
      iconWrapper: 'w-16 h-16',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      container: 'py-12',
      icon: 'w-12 h-12',
      iconWrapper: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const variantClasses = {
    default: 'bg-transparent',
    muted: 'bg-muted/30 rounded-2xl',
    card: 'bg-card border border-border rounded-2xl shadow-sm',
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
      <div
        className={cn(
          'rounded-full bg-muted/50 flex items-center justify-center mb-4',
          classes.iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', classes.icon)} />
      </div>
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
        <Button onClick={onAction} className="mt-4" size={size === 'sm' ? 'sm' : 'default'}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
