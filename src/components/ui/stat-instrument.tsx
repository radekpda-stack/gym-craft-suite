/**
 * StatInstrument - Combined stat + visual indicator
 * 
 * Displays a metric value with an optional visual indicator:
 * - ring: Activity Ring style progress
 * - gauge: Linear gauge bar
 * - trend: Trend arrow indicator
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cardInteraction } from '@/lib/animations';

interface StatInstrumentProps {
  label: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percent' | 'custom';
  indicator?: 'ring' | 'gauge' | 'trend' | 'none';
  progress?: number; // 0-100 for ring/gauge
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatInstrument({
  label,
  value,
  format = 'number',
  indicator = 'none',
  progress = 0,
  trend,
  variant = 'default',
  subLabel,
  icon,
  onClick,
  className,
  size = 'md',
}: StatInstrumentProps) {
  const formattedValue = (() => {
    if (format === 'currency' && typeof value === 'number') {
      return formatCurrency(value, false);
    }
    if (format === 'percent' && typeof value === 'number') {
      return `${value}%`;
    }
    return String(value);
  })();

  const variantColors = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  const ringColor = {
    default: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    danger: 'stroke-destructive',
  };

  const gaugeColor = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
  };

  const sizeClasses = {
    sm: 'p-2.5',
    md: 'p-3',
    lg: 'p-4',
  };

  const valueClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const ringSize = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm",
        "transition-all",
        onClick && "cursor-pointer hover:bg-card/80",
        sizeClasses[size],
        className
      )}
      {...(onClick ? cardInteraction : {})}
    >
      <div className="flex items-center gap-3">
        {/* Visual indicator */}
        {indicator === 'ring' && (
          <MiniRing 
            progress={progress} 
            size={ringSize[size]} 
            colorClass={ringColor[variant]} 
          />
        )}

        {icon && indicator === 'none' && (
          <div className="shrink-0 text-muted-foreground">
            {icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-bold tracking-tight",
              valueClasses[size],
              variantColors[variant]
            )}>
              {formattedValue}
            </p>
            
            {/* Trend indicator */}
            {indicator === 'trend' && trend && (
              <TrendIndicator trend={trend} />
            )}
          </div>
          
          {subLabel && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {subLabel}
            </p>
          )}
          
          {/* Gauge bar */}
          {indicator === 'gauge' && (
            <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", gaugeColor[variant])}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          )}
        </div>
      </div>
    </Component>
  );
}

// Mini Activity Ring component
function MiniRing({ 
  progress, 
  size, 
  colorClass 
}: { 
  progress: number; 
  size: number; 
  colorClass: string;
}) {
  const strokeWidth = size > 40 ? 4 : 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClass}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

// Trend indicator arrow
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn("p-1 rounded-full", colorClass)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}
