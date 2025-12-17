import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  onClick,
}: KPICardProps) {
  const variantStyles = {
    default: 'border-border/50',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
  };

  const iconBgStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <div
      className={cn(
        'glass rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer',
        'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        'border',
        variantStyles[variant]
      )}
      onClick={onClick}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('p-2 rounded-xl', iconBgStyles[variant])}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>

      {/* Value */}
      <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight', valueStyles[variant])}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>

      {/* Trend or Subtitle */}
      <div className="flex items-center justify-between mt-2">
        {trend !== undefined ? (
          <div
            className={cn(
              'flex items-center gap-1 text-xs sm:text-sm font-medium',
              trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {trend > 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : trend < 0 ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : null}
            <span>{formatPercent(Math.abs(trend))}</span>
            {trendLabel && <span className="text-muted-foreground ml-1 hidden sm:inline">{trendLabel}</span>}
          </div>
        ) : subtitle ? (
          <span className="text-xs sm:text-sm text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}
