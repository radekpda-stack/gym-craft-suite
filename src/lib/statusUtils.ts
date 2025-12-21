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

// Status visual configuration - uses Tailwind classes with CSS variables
// IMPORTANT: Always use these classes instead of hardcoded HSL values!
export const STATUS_CONFIG = {
  ok: {
    label: 'V pořádku',
    labelShort: 'OK',
    icon: CheckCircle2,
    // Background with opacity - NEUTRAL for "ok" state (color = problem philosophy)
    bgClass: 'bg-muted/50',
    bgClassStrong: 'bg-muted/70',
    bgClassSubtle: 'bg-muted/30',
    // Border with opacity
    borderClass: 'border-muted/50',
    borderClassStrong: 'border-muted/70',
    // Text color - neutral
    textClass: 'text-muted-foreground',
    // Hover states
    hoverBgClass: 'hover:bg-muted/70',
    hoverBorderClass: 'hover:border-muted/70',
    // Ring for focus
    ringClass: 'ring-muted/50',
  },
  warning: {
    label: 'Vyžaduje pozornost',
    labelShort: 'Pozor',
    icon: AlertCircle,
    bgClass: 'bg-status-warning/10',
    bgClassStrong: 'bg-status-warning/15',
    bgClassSubtle: 'bg-status-warning/5',
    borderClass: 'border-status-warning/30',
    borderClassStrong: 'border-status-warning/50',
    textClass: 'text-status-warning',
    hoverBgClass: 'hover:bg-status-warning/15',
    hoverBorderClass: 'hover:border-status-warning/50',
    ringClass: 'ring-status-warning/30',
  },
  error: {
    label: 'Kritický problém',
    labelShort: 'Kritické',
    icon: XCircle,
    bgClass: 'bg-status-error/10',
    bgClassStrong: 'bg-status-error/15',
    bgClassSubtle: 'bg-status-error/5',
    borderClass: 'border-status-error/30',
    borderClassStrong: 'border-status-error/50',
    textClass: 'text-status-error',
    hoverBgClass: 'hover:bg-status-error/15',
    hoverBorderClass: 'hover:border-status-error/50',
    ringClass: 'ring-status-error/30',
  },
} as const;

// Trend visual configuration
export const TREND_CONFIG = {
  improving: {
    label: 'Zlepšení',
    icon: TrendingUp,
    textClass: 'text-status-ok',
    bgClass: 'bg-status-ok/10',
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
    textClass: 'text-status-error',
    bgClass: 'bg-status-error/10',
  },
} as const;

// Priority configuration (for alerts, tasks, etc.)
export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_CONFIG = {
  high: {
    label: 'Vysoká',
    bgClass: 'bg-status-error/10',
    borderClass: 'border-status-error/30',
    textClass: 'text-status-error',
  },
  medium: {
    label: 'Střední',
    bgClass: 'bg-status-warning/10',
    borderClass: 'border-status-warning/30',
    textClass: 'text-status-warning',
  },
  low: {
    label: 'Nízká',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/30',
    textClass: 'text-primary',
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
    bgStrong: config.bgClassStrong,
    bgSubtle: config.bgClassSubtle,
    border: config.borderClass,
    borderStrong: config.borderClassStrong,
    text: config.textClass,
    hoverBg: config.hoverBgClass,
    hoverBorder: config.hoverBorderClass,
    ring: config.ringClass,
    // Combined classes for common patterns
    chip: `${config.bgClass} ${config.textClass}`,
    card: `${config.bgClass} ${config.borderClass} border`,
    cardInteractive: `${config.bgClass} ${config.borderClass} border ${config.hoverBorderClass}`,
    badge: `${config.bgClass} ${config.textClass} ${config.borderClass} border`,
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

export function getPriorityClasses(priority: Priority) {
  const config = PRIORITY_CONFIG[priority];
  return {
    bg: config.bgClass,
    border: config.borderClass,
    text: config.textClass,
    combined: `${config.bgClass} ${config.borderClass} ${config.textClass} border`,
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
