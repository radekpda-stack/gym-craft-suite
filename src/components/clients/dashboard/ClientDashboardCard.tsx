/**
 * ClientDashboardCard Component
 * 
 * Universal dashboard card with:
 * - Icon and section title
 * - 2-4 metric rows
 * - Badge for alerts
 * - Expandable detail view
 */
import { ReactNode, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface DashboardMetric {
  label: string;
  value: string | number;
  icon?: ReactNode;
  highlight?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

interface ClientDashboardCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  metrics: DashboardMetric[];
  badge?: number;
  badgeVariant?: 'default' | 'warning' | 'error';
  isFavorite?: boolean;
  children?: ReactNode;
  className?: string;
}

export function ClientDashboardCard({
  id,
  icon,
  title,
  metrics,
  badge,
  badgeVariant = 'default',
  isFavorite,
  children,
  className,
}: ClientDashboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const badgeColors = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-destructive/10 text-destructive',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '',
  };

  return (
    <div className={cn('glass rounded-xl overflow-hidden', className)}>
      {/* Card Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-primary shrink-0">{icon}</span>
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            {isFavorite && (
              <Star className="w-4 h-4 text-warning fill-warning shrink-0" />
            )}
            {badge !== undefined && badge > 0 && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full shrink-0',
                badgeColors[badgeVariant]
              )}>
                {badge}
              </span>
            )}
          </div>
          <ChevronRight className={cn(
            'w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )} />
        </div>

        {/* Metrics Preview */}
        <div className="mt-3 space-y-1.5">
          {metrics.slice(0, 3).map((metric, index) => (
            <div 
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm',
                metric.highlight && 'text-primary font-medium'
              )}
            >
              {metric.icon && (
                <span className="text-muted-foreground shrink-0">{metric.icon}</span>
              )}
              <span className="text-muted-foreground truncate">{metric.label}:</span>
              <span className={cn(
                'font-medium truncate',
                metric.highlight ? 'text-primary' : 'text-foreground'
              )}>
                {metric.value}
                {metric.trend && (
                  <span className={cn(
                    'ml-1',
                    metric.trend === 'up' && 'text-success',
                    metric.trend === 'down' && 'text-destructive'
                  )}>
                    {trendIcons[metric.trend]}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
