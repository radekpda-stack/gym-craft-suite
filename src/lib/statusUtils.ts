import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Wallet,
  MessageSquare,
  Clock,
  AlertTriangle,
  Utensils,
  Dumbbell,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  LucideIcon,
} from 'lucide-react';

// ============================================
// UNIFIED STATUS SYSTEM
// Use these constants across all modules
// ============================================

export type Status = 'ok' | 'warning' | 'error';
export type Trend = 'improving' | 'stable' | 'declining';

// Status visual configuration (uses CSS variables from index.css)
export const STATUS_CONFIG = {
  ok: {
    label: 'V pořádku',
    labelShort: 'OK',
    icon: CheckCircle2,
    // Uses --success from index.css
    bgClass: 'bg-[hsl(142_76%_36%/0.1)]',
    borderClass: 'border-[hsl(142_76%_36%/0.3)]',
    textClass: 'text-[hsl(142_76%_36%)]',
    hoverBorderClass: 'hover:border-[hsl(142_76%_36%/0.5)]',
  },
  warning: {
    label: 'Vyžaduje pozornost',
    labelShort: 'Pozor',
    icon: AlertCircle,
    // Uses --warning from index.css
    bgClass: 'bg-[hsl(38_92%_50%/0.1)]',
    borderClass: 'border-[hsl(38_92%_50%/0.3)]',
    textClass: 'text-[hsl(38_92%_50%)]',
    hoverBorderClass: 'hover:border-[hsl(38_92%_50%/0.5)]',
  },
  error: {
    label: 'Kritický problém',
    labelShort: 'Kritické',
    icon: XCircle,
    // Uses --destructive from index.css
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/30',
    textClass: 'text-destructive',
    hoverBorderClass: 'hover:border-destructive/50',
  },
} as const;

// Trend visual configuration
export const TREND_CONFIG = {
  improving: {
    label: 'Zlepšení',
    icon: TrendingUp,
    textClass: 'text-[hsl(142_76%_36%)]',
    bgClass: 'bg-[hsl(142_76%_36%/0.1)]',
  },
  stable: {
    label: 'Stabilní',
    icon: Minus,
    textClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
  },
  declining: {
    label: 'Zhoršení',
    icon: TrendingDown,
    textClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
  },
} as const;

// Alert type configuration
export type AlertType = 'credit' | 'feedback' | 'unpaid' | 'overload' | 'nutrition' | 'training';

export const ALERT_TYPE_CONFIG: Record<AlertType, { icon: LucideIcon; label: string }> = {
  credit: { icon: Wallet, label: 'Kredit' },
  feedback: { icon: MessageSquare, label: 'Feedback' },
  unpaid: { icon: Clock, label: 'Platba' },
  overload: { icon: AlertTriangle, label: 'Přetížení' },
  nutrition: { icon: Utensils, label: 'Strava' },
  training: { icon: Dumbbell, label: 'Trénink' },
};

// Credit thresholds
export const CREDIT_THRESHOLDS = {
  critical: 0,
  warning: 800,
} as const;

// Helper functions
export function getCreditStatus(balance: number, hasUnpaid: boolean = false): Status {
  if (hasUnpaid || balance <= CREDIT_THRESHOLDS.critical) return 'error';
  if (balance < CREDIT_THRESHOLDS.warning) return 'warning';
  return 'ok';
}

export function getStatusClasses(status: Status) {
  const config = STATUS_CONFIG[status];
  return {
    bg: config.bgClass,
    border: config.borderClass,
    text: config.textClass,
    hoverBorder: config.hoverBorderClass,
    combined: `${config.bgClass} ${config.borderClass}`,
    interactive: `${config.bgClass} ${config.borderClass} ${config.hoverBorderClass}`,
  };
}

export function getTrendClasses(trend: Trend) {
  const config = TREND_CONFIG[trend];
  return {
    text: config.textClass,
    bg: config.bgClass,
    combined: `${config.bgClass} ${config.textClass}`,
  };
}

// Status indicator component helper
export function getStatusIndicatorProps(status: Status) {
  const config = STATUS_CONFIG[status];
  return {
    Icon: config.icon,
    label: config.labelShort,
    className: `${config.bgClass} ${config.textClass}`,
  };
}

// Quick status check helpers
export function isOk(status: Status): boolean {
  return status === 'ok';
}

export function needsAttention(status: Status): boolean {
  return status === 'warning' || status === 'error';
}

export function isCritical(status: Status): boolean {
  return status === 'error';
}
