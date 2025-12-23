import { cn } from '@/lib/utils';
import { Check, Clock, X, Wallet, Play } from 'lucide-react';
import { 
  getCombinedStatus, 
  getPaymentStatusConfig, 
  isPaid,
  PAYMENT_STATUS_CONFIG,
  PaymentStatusType 
} from '@/lib/payment-status';

interface TrainingStatusBadgeProps {
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled';
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  className?: string;
  showLabel?: boolean;
}

/**
 * Training Status Badge with unified visual interpretation:
 * - Scheduled (pending) → Grey clock
 * - In Progress → Primary play
 * - Completed + Unpaid → Orange wallet (warning)
 * - Completed + Paid → Green check with payment method icon
 * - Completed + Debt → Red alert
 * - Canceled → Red X
 * - Late Cancel → Grey X (with note about deduction)
 */

export function TrainingStatusBadge({ 
  status, 
  paymentStatus, 
  paymentMethod,
  className,
  showLabel = true,
}: TrainingStatusBadgeProps) {
  const isInProgress = status === 'in_progress';
  const isCanceled = status === 'canceled';
  const isCompleted = status === 'completed';
  const isLateCancel = paymentStatus === 'late_cancel';
  const paidStatus = isPaid(paymentStatus);
  const isUnpaidDebt = paymentStatus === 'unpaid';

  // Get icon and styling based on state
  const getConfig = () => {
    // Canceled
    if (isCanceled) {
      if (isLateCancel) {
        return {
          icon: X,
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          iconColor: 'text-muted-foreground',
          label: 'Pozdní zrušení',
        };
      }
      return {
        icon: X,
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        iconColor: 'text-destructive',
        label: 'Zrušeno',
      };
    }
    
    // In Progress
    if (isInProgress) {
      return {
        icon: Play,
        bgColor: 'bg-primary/10',
        textColor: 'text-primary',
        iconColor: 'text-primary',
        label: 'Probíhá',
      };
    }
    
    // Completed with payment status
    if (isCompleted) {
      // Unpaid debt
      if (isUnpaidDebt) {
        const config = PAYMENT_STATUS_CONFIG.unpaid;
        return {
          icon: config.icon,
          bgColor: config.bgColor,
          textColor: config.color,
          iconColor: config.color,
          label: config.label,
        };
      }
      
      // Paid
      if (paidStatus && paymentStatus) {
        const config = getPaymentStatusConfig(paymentStatus);
        return {
          icon: config.icon,
          bgColor: config.bgColor,
          textColor: config.color,
          iconColor: config.color,
          label: config.label,
        };
      }
      
      // Awaiting payment (pending)
      const pendingConfig = PAYMENT_STATUS_CONFIG.pending;
      return {
        icon: Wallet,
        bgColor: pendingConfig.bgColor,
        textColor: pendingConfig.color,
        iconColor: pendingConfig.color,
        label: paymentMethod 
          ? `Čeká na platbu (${getMethodLabel(paymentMethod)})`
          : 'Čeká na platbu',
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

function getMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'hotově';
    case 'card': return 'kartou';
    case 'bank': return 'převodem';
    case 'credit': return 'kreditem';
    default: return method;
  }
}

/**
 * Compact status indicator (just the icon)
 */
export function TrainingStatusDot({ 
  status, 
  paymentStatus, 
  className,
}: Omit<TrainingStatusBadgeProps, 'showLabel' | 'paymentMethod'>) {
  const paidStatus = isPaid(paymentStatus);
  const isCompletedUnpaid = status === 'completed' && !paidStatus;
  const isCompletedPaid = status === 'completed' && paidStatus;
  const isUnpaidDebt = paymentStatus === 'unpaid';
  const isInProgress = status === 'in_progress';
  const isCanceled = status === 'canceled';
  const isLateCancel = paymentStatus === 'late_cancel';

  const getConfig = () => {
    if (isCanceled) {
      return { 
        icon: X, 
        color: isLateCancel ? 'text-muted-foreground' : 'text-destructive' 
      };
    }
    if (isCompletedPaid) {
      return { icon: Check, color: 'text-success' };
    }
    if (isUnpaidDebt) {
      return { icon: PAYMENT_STATUS_CONFIG.unpaid.icon, color: 'text-destructive' };
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

/**
 * Payment Status Badge (standalone for payment-only views)
 */
export function PaymentStatusBadge({
  status,
  className,
  showLabel = true,
}: {
  status: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}) {
  const config = getPaymentStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', config.color)} />
      {showLabel && <span>{config.shortLabel}</span>}
    </div>
  );
}
