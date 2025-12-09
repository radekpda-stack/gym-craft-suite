import { cn } from '@/lib/utils';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';

interface TrainingStatusBadgeProps {
  status: 'scheduled' | 'completed' | 'canceled';
  paymentStatus?: string | null;
  className?: string;
  showLabel?: boolean;
}

/**
 * Training Status Badge with new visual interpretation:
 * - Scheduled (pending) → Grey dot
 * - Completed + Unpaid → Orange exclamation
 * - Completed + Paid → Green check
 * - Canceled → Red X
 */
export function TrainingStatusBadge({ 
  status, 
  paymentStatus, 
  className,
  showLabel = true,
}: TrainingStatusBadgeProps) {
  // Determine visual state
  const isPaid = paymentStatus && ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank'].includes(paymentStatus);
  const isCompletedUnpaid = status === 'completed' && !isPaid;
  const isCompletedPaid = status === 'completed' && isPaid;
  const isScheduled = status === 'scheduled';
  const isCanceled = status === 'canceled';

  // Get icon and styling based on state
  const getConfig = () => {
    if (isCanceled) {
      return {
        icon: X,
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        iconColor: 'text-destructive',
        label: 'Zrušeno',
      };
    }
    
    if (isCompletedPaid) {
      return {
        icon: Check,
        bgColor: 'bg-success/10',
        textColor: 'text-success',
        iconColor: 'text-success',
        label: 'Zaplaceno',
      };
    }
    
    if (isCompletedUnpaid) {
      return {
        icon: AlertTriangle,
        bgColor: 'bg-warning/10',
        textColor: 'text-warning',
        iconColor: 'text-warning',
        label: 'Nezaplaceno',
      };
    }
    
    // Default: Scheduled
    return {
      icon: Clock,
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      iconColor: 'text-muted-foreground',
      label: 'Naplánováno',
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

/**
 * Compact status indicator (just the dot/icon)
 */
export function TrainingStatusDot({ 
  status, 
  paymentStatus, 
  className,
}: Omit<TrainingStatusBadgeProps, 'showLabel'>) {
  const isPaid = paymentStatus && ['paid_credit', 'paid_cash', 'paid_card', 'paid_bank'].includes(paymentStatus);
  const isCompletedUnpaid = status === 'completed' && !isPaid;
  const isCompletedPaid = status === 'completed' && isPaid;
  const isCanceled = status === 'canceled';

  const getConfig = () => {
    if (isCanceled) {
      return { icon: X, color: 'text-destructive' };
    }
    if (isCompletedPaid) {
      return { icon: Check, color: 'text-success' };
    }
    if (isCompletedUnpaid) {
      return { icon: AlertTriangle, color: 'text-warning' };
    }
    return { icon: Clock, color: 'text-muted-foreground' };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Icon className={cn('w-4 h-4', config.color, className)} />
  );
}
