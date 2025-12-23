import { 
  Check, 
  Clock, 
  X, 
  Wallet, 
  Banknote, 
  CreditCard, 
  Building2,
  AlertCircle
} from 'lucide-react';

// Payment status types
export type PaymentStatusType = 
  | 'pending' 
  | 'paid_credit' 
  | 'paid_cash' 
  | 'paid_card' 
  | 'paid_bank'
  | 'unpaid'
  | 'late_cancel';

// Training status types  
export type TrainingStatusType = 
  | 'scheduled' 
  | 'in_progress' 
  | 'completed' 
  | 'canceled';

export interface PaymentStatusConfig {
  label: string;
  shortLabel: string;
  icon: typeof Check;
  color: string; // Tailwind text color
  bgColor: string; // Tailwind bg color
  badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
}

export interface TrainingStatusConfig {
  label: string;
  icon: typeof Check;
  color: string;
  bgColor: string;
}

// Payment status configuration
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatusType, PaymentStatusConfig> = {
  pending: {
    label: 'Čeká na platbu',
    shortLabel: 'Čeká',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    badgeVariant: 'warning',
  },
  paid_credit: {
    label: 'Zaplaceno z kreditu',
    shortLabel: 'Kredit',
    icon: Wallet,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'success',
  },
  paid_cash: {
    label: 'Zaplaceno hotově',
    shortLabel: 'Hotově',
    icon: Banknote,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'success',
  },
  paid_card: {
    label: 'Zaplaceno kartou',
    shortLabel: 'Kartou',
    icon: CreditCard,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'success',
  },
  paid_bank: {
    label: 'Zaplaceno převodem',
    shortLabel: 'Převodem',
    icon: Building2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    badgeVariant: 'success',
  },
  unpaid: {
    label: 'Nezaplaceno (dluh)',
    shortLabel: 'Dluh',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    badgeVariant: 'destructive',
  },
  late_cancel: {
    label: 'Pozdní zrušení (strženo)',
    shortLabel: 'Strženo',
    icon: X,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeVariant: 'secondary',
  },
};

// Training status configuration
export const TRAINING_STATUS_CONFIG: Record<TrainingStatusType, TrainingStatusConfig> = {
  scheduled: {
    label: 'Naplánováno',
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  in_progress: {
    label: 'Probíhá',
    icon: Clock, // Will be replaced with Play icon in component
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    label: 'Dokončeno',
    icon: Check,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  canceled: {
    label: 'Zrušeno',
    icon: X,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

// Utility functions
export function getPaymentStatusConfig(status: string | null | undefined): PaymentStatusConfig {
  if (!status) return PAYMENT_STATUS_CONFIG.pending;
  return PAYMENT_STATUS_CONFIG[status as PaymentStatusType] || PAYMENT_STATUS_CONFIG.pending;
}

export function getTrainingStatusConfig(status: string): TrainingStatusConfig {
  return TRAINING_STATUS_CONFIG[status as TrainingStatusType] || TRAINING_STATUS_CONFIG.scheduled;
}

export function isPaid(paymentStatus: string | null | undefined): boolean {
  if (!paymentStatus) return false;
  return paymentStatus.startsWith('paid_');
}

export function isUnpaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === 'unpaid';
}

export function isPending(paymentStatus: string | null | undefined): boolean {
  return !paymentStatus || paymentStatus === 'pending';
}

// Combined status for UI display
export function getCombinedStatus(
  trainingStatus: string,
  paymentStatus: string | null | undefined
): {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Check;
} {
  // Canceled trainings
  if (trainingStatus === 'canceled') {
    // Check if it was a late cancel with deducted credit
    if (paymentStatus === 'late_cancel') {
      return {
        label: 'Pozdní zrušení',
        ...PAYMENT_STATUS_CONFIG.late_cancel,
      };
    }
    return {
      label: 'Zrušeno',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      icon: X,
    };
  }
  
  // In progress
  if (trainingStatus === 'in_progress') {
    return TRAINING_STATUS_CONFIG.in_progress;
  }
  
  // Completed trainings - show payment status
  if (trainingStatus === 'completed') {
    const paymentConfig = getPaymentStatusConfig(paymentStatus);
    return {
      label: paymentConfig.label,
      color: paymentConfig.color,
      bgColor: paymentConfig.bgColor,
      icon: paymentConfig.icon,
    };
  }
  
  // Scheduled
  return TRAINING_STATUS_CONFIG.scheduled;
}
