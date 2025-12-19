import { cn } from '@/lib/utils';
import { Check, Clock, X, AlertTriangle, Wallet, Play } from 'lucide-react';

interface TrainingStatusBadgeProps {
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  className?: string;
  showLabel?: boolean;
}

/**
 * Training Status Badge with new visual interpretation:
 * - Scheduled (pending) → Grey dot
 * - Completed + Unpaid → Orange exclamation with payment method
 * - Completed + Paid → Green check
 * - Canceled → Red X
 */
/**
 * Get payment label based on payment_status
 */
function getPaymentLabel(paymentStatus: string | null | undefined): string {
  switch (paymentStatus) {
    case 'paid_credit':
      return 'Zaplaceno (kredit)';
    case 'paid_cash':
      return 'Zaplaceno (hotově)';
    case 'paid_card':
      return 'Zaplaceno (kartou)';
    case 'paid_bank':
      return 'Zaplaceno (převodem)';
    case 'pending':
    default:
      return 'Nezaplaceno';
  }
}

/**
 * Get awaiting payment label with intended payment method
 */
function getAwaitingPaymentLabel(paymentMethod: string | null | undefined): string {
  switch (paymentMethod) {
    case 'cash':
      return 'Čeká na platbu (hotově)';
    case 'card':
      return 'Čeká na platbu (kartou)';
    case 'bank':
      return 'Čeká na platbu (převodem)';
    default:
      return 'Čeká na platbu';
  }
}

export function TrainingStatusBadge({ 
  status, 
  paymentStatus, 
  paymentMethod,
  className,
  showLabel = true,
}: TrainingStatusBadgeProps) {
  // Determine visual state - isPaid is TRUE for any paid_* status
  const isPaid = paymentStatus && paymentStatus.startsWith('paid_');
  const isCompletedUnpaid = status === 'completed' && !isPaid;
  const isCompletedPaid = status === 'completed' && isPaid;
  const isScheduled = status === 'scheduled';
  const isInProgress = status === 'in_progress';
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
        label: getPaymentLabel(paymentStatus),
      };
    }
    
    if (isCompletedUnpaid) {
      return {
        icon: Wallet,
        bgColor: 'bg-warning/10',
        textColor: 'text-warning',
        iconColor: 'text-warning',
        label: getAwaitingPaymentLabel(paymentMethod),
      };
    }
    
    if (isInProgress) {
      return {
        icon: Play,
        bgColor: 'bg-primary/10',
        textColor: 'text-primary',
        iconColor: 'text-primary',
        label: 'Probíhá',
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
}: Omit<TrainingStatusBadgeProps, 'showLabel' | 'paymentMethod'>) {
  // isPaid is TRUE for any paid_* status
  const isPaid = paymentStatus && paymentStatus.startsWith('paid_');
  const isCompletedUnpaid = status === 'completed' && !isPaid;
  const isCompletedPaid = status === 'completed' && isPaid;
  const isInProgress = status === 'in_progress';
  const isCanceled = status === 'canceled';

  const getConfig = () => {
    if (isCanceled) {
      return { icon: X, color: 'text-destructive' };
    }
    if (isCompletedPaid) {
      return { icon: Check, color: 'text-success' };
    }
    if (isCompletedUnpaid) {
      return { icon: Wallet, color: 'text-warning' };
    }
    if (isInProgress) {
      return { icon: Play, color: 'text-primary' };
    }
    return { icon: Clock, color: 'text-muted-foreground' };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Icon className={cn('w-4 h-4', config.color, className)} />
  );
}
