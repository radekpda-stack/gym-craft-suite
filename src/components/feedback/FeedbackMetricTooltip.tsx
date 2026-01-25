/**
 * Tooltip component for feedback metrics
 * Provides explanations and reference values for trainers
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { METRIC_EXPLANATIONS } from '@/lib/feedbackCalculations';

interface FeedbackMetricTooltipProps {
  metricKey: keyof typeof METRIC_EXPLANATIONS;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function FeedbackMetricTooltip({ 
  metricKey, 
  children,
  showIcon = true,
}: FeedbackMetricTooltipProps) {
  const metric = METRIC_EXPLANATIONS[metricKey];
  
  if (!metric) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            {showIcon && <HelpCircle className="w-3 h-3 text-muted-foreground/50" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{metric.label}</p>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
            <p className="text-xs text-primary/80 font-mono">{metric.scale}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Format a change value with capping indicator
 */
export function formatChange(
  value: number | null, 
  options?: { 
    maxDisplay?: number;
    suffix?: string;
    showSign?: boolean;
  }
): string {
  if (value == null || isNaN(value)) return '—';
  
  const { maxDisplay = 500, suffix = '', showSign = true } = options || {};
  
  // Show indicator for capped values
  if (Math.abs(value) >= maxDisplay) {
    const sign = value > 0 ? '+' : '';
    return `${sign}>${maxDisplay}${suffix}`;
  }
  
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

/**
 * Format a metric value safely, returning "—" for null/NaN
 */
export function formatMetricValue(
  value: number | null | undefined,
  options?: {
    decimals?: number;
    suffix?: string;
    fallback?: string;
  }
): string {
  const { decimals = 1, suffix = '', fallback = '—' } = options || {};
  
  if (value == null || isNaN(value) || !isFinite(value)) {
    return fallback;
  }
  
  const formatted = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
  return `${formatted}${suffix}`;
}
