import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'blue' | 'purple';
  label?: string;
  sublabel?: string;
  showValue?: boolean;
  strokeWidth?: number;
  className?: string;
  animated?: boolean;
}

const SIZE_MAP = {
  sm: { dimension: 80, fontSize: 'text-lg', sublabelSize: 'text-[10px]' },
  md: { dimension: 120, fontSize: 'text-2xl', sublabelSize: 'text-xs' },
  lg: { dimension: 160, fontSize: 'text-3xl', sublabelSize: 'text-sm' },
  xl: { dimension: 200, fontSize: 'text-4xl', sublabelSize: 'text-base' },
};

const VARIANT_COLORS = {
  primary: {
    stroke: 'hsl(68 100% 50%)',
    glow: 'hsl(68 100% 50% / 0.4)',
    bg: 'hsl(68 100% 50% / 0.1)',
  },
  success: {
    stroke: 'hsl(142 76% 45%)',
    glow: 'hsl(142 76% 45% / 0.4)',
    bg: 'hsl(142 76% 45% / 0.1)',
  },
  warning: {
    stroke: 'hsl(38 92% 50%)',
    glow: 'hsl(38 92% 50% / 0.4)',
    bg: 'hsl(38 92% 50% / 0.1)',
  },
  destructive: {
    stroke: 'hsl(0 84% 60%)',
    glow: 'hsl(0 84% 60% / 0.4)',
    bg: 'hsl(0 84% 60% / 0.1)',
  },
  blue: {
    stroke: 'hsl(217 91% 60%)',
    glow: 'hsl(217 91% 60% / 0.4)',
    bg: 'hsl(217 91% 60% / 0.1)',
  },
  purple: {
    stroke: 'hsl(271 81% 56%)',
    glow: 'hsl(271 81% 56% / 0.4)',
    bg: 'hsl(271 81% 56% / 0.1)',
  },
};

export function CircularGauge({
  value,
  maxValue = 100,
  size = 'md',
  variant = 'primary',
  label,
  sublabel,
  showValue = true,
  strokeWidth = 8,
  className,
  animated = true,
}: CircularGaugeProps) {
  const { dimension, fontSize, sublabelSize } = SIZE_MAP[size];
  const colors = VARIANT_COLORS[variant];
  
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value / maxValue, 0), 1);
  const strokeDashoffset = circumference * (1 - percentage);
  
  const displayValue = label || (showValue ? Math.round(value) : null);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={dimension}
        height={dimension}
        className={cn(animated && 'transition-all duration-700 ease-out')}
      >
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          strokeOpacity={0.3}
        />
        
        {/* Progress arc */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${variant})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${dimension / 2} ${dimension / 2})`}
          filter={`url(#glow-${variant})`}
          className={cn(
            animated && 'transition-all duration-700 ease-out',
            'gauge-arc'
          )}
          style={{
            '--gauge-color': colors.stroke,
            '--gauge-glow': colors.glow,
          } as React.CSSProperties}
        />
        
        {/* End dot */}
        {percentage > 0 && (
          <circle
            cx={dimension / 2 + radius * Math.cos((percentage * 360 - 90) * (Math.PI / 180))}
            cy={dimension / 2 + radius * Math.sin((percentage * 360 - 90) * (Math.PI / 180))}
            r={strokeWidth / 2 + 2}
            fill={colors.stroke}
            filter={`url(#glow-${variant})`}
            className="gauge-dot"
          />
        )}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {displayValue !== null && (
          <span 
            className={cn(fontSize, 'font-bold tracking-tight')}
            style={{ color: colors.stroke }}
          >
            {displayValue}
          </span>
        )}
        {sublabel && (
          <span className={cn(sublabelSize, 'text-muted-foreground uppercase tracking-wider')}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
