import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
        'glass rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 transition-all duration-300 cursor-pointer',
        'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        'border',
        variantStyles[variant]
      )}
      onClick={onClick}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 mb-2 sm:mb-3">
        <div className={cn('p-1.5 sm:p-2 rounded-lg sm:rounded-xl', iconBgStyles[variant])}>
          {icon}
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {title}
        </span>
      </div>

      {/* Value */}
      <p className={cn('text-lg sm:text-2xl md:text-3xl font-bold tracking-tight', valueStyles[variant])}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>

      {/* Trend or Subtitle */}
      <div className="flex items-center justify-between mt-1.5 sm:mt-2">
        {trend !== undefined && trend !== null ? (
          trend === 0 ? (
            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>0%</span>
              {trendLabel && <span className="ml-0.5 sm:ml-1 hidden sm:inline">{trendLabel}</span>}
            </div>
          ) : (
            <div
              className={cn(
                'flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium',
                trend > 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {trend > 0 ? (
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span>{formatPercent(Math.abs(trend))}</span>
              {trendLabel && <span className="text-muted-foreground ml-0.5 sm:ml-1 hidden sm:inline">{trendLabel}</span>}
            </div>
          )
        ) : trend === null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] sm:text-xs text-muted-foreground">—</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Srovnání není k dispozici</p>
            </TooltipContent>
          </Tooltip>
        ) : subtitle ? (
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}
