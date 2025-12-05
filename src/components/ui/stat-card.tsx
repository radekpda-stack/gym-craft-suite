import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: StatCardProps) {
  return (
    <div className={cn('stat-card group', className)}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={cn(
            'p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground',
            iconClassName
          )}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-2 sm:gap-3">
        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={cn(
            'text-xs sm:text-sm font-medium mb-0.5 sm:mb-1',
            trend.positive ? 'text-success' : 'text-destructive'
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      
      {subtitle && (
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
