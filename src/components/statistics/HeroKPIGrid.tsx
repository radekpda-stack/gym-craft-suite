import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
  onClick,
  clickable = false,
}: KPICardProps) {
  const variantStyles = {
    default: 'from-secondary/80 to-secondary/40 border-border',
    success: 'from-success/20 to-success/5 border-success/30',
    warning: 'from-warning/20 to-warning/5 border-warning/30',
    destructive: 'from-destructive/20 to-destructive/5 border-destructive/30',
    primary: 'from-primary/20 to-primary/5 border-primary/30',
  };

  const iconStyles = {
    default: 'bg-secondary text-foreground',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-destructive/20 text-destructive',
    primary: 'bg-primary/20 text-primary',
  };

  const isClickable = clickable || !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 sm:p-5',
        'bg-gradient-to-br backdrop-blur-sm',
        'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
        variantStyles[variant],
        isClickable && 'cursor-pointer active:scale-[0.98]',
        className
      )}
    >
      {/* Clickable indicator */}
      {isClickable && (
        <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3 text-destructive" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend > 0 && 'text-success',
                  trend < 0 && 'text-destructive',
                  trend === 0 && 'text-muted-foreground'
                )}
              >
                {trend > 0 ? '+' : ''}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl flex-shrink-0',
            iconStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface HeroKPIGridProps {
  children: ReactNode;
  className?: string;
}

export function HeroKPIGrid({ children, className }: HeroKPIGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}
