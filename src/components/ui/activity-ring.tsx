import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActivityRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  strokeWidth?: number;
  label?: string;
  value?: string | number;
  showPercentage?: boolean;
  animate?: boolean;
  pulse?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dimension: 48, stroke: 4, fontSize: 'text-xs' },
  md: { dimension: 72, stroke: 5, fontSize: 'text-sm' },
  lg: { dimension: 96, stroke: 6, fontSize: 'text-base' },
  xl: { dimension: 128, stroke: 8, fontSize: 'text-lg' },
};

const colorConfig = {
  primary: {
    stroke: 'stroke-primary',
    bg: 'stroke-primary/20',
    glow: 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]',
  },
  success: {
    stroke: 'stroke-success',
    bg: 'stroke-success/20',
    glow: 'drop-shadow-[0_0_8px_hsl(var(--success)/0.5)]',
  },
  warning: {
    stroke: 'stroke-warning',
    bg: 'stroke-warning/20',
    glow: 'drop-shadow-[0_0_8px_hsl(var(--warning)/0.5)]',
  },
  destructive: {
    stroke: 'stroke-destructive',
    bg: 'stroke-destructive/20',
    glow: 'drop-shadow-[0_0_8px_hsl(var(--destructive)/0.5)]',
  },
};

export function ActivityRing({
  progress,
  size = 'md',
  color = 'primary',
  strokeWidth,
  label,
  value,
  showPercentage = false,
  animate = true,
  pulse = false,
  className,
}: ActivityRingProps) {
  const { dimension, stroke, fontSize } = sizeConfig[size];
  const { stroke: strokeColor, bg: bgColor, glow } = colorConfig[color];
  
  const finalStroke = strokeWidth ?? stroke;
  const radius = (dimension - finalStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div className={cn('relative', pulse && 'ring-pulse')}>
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className={cn('-rotate-90', normalizedProgress > 0 && glow)}
        >
          {/* Background circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            strokeWidth={finalStroke}
            className={bgColor}
            strokeLinecap="round"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            strokeWidth={finalStroke}
            className={strokeColor}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animate ? { strokeDashoffset: circumference } : false}
            animate={{ strokeDashoffset }}
            transition={{
              duration: animate ? 1 : 0,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.1,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          {value !== undefined ? (
            <span className={cn('font-bold tracking-tight', fontSize)}>
              {value}
            </span>
          ) : showPercentage ? (
            <span className={cn('font-bold tracking-tight', fontSize)}>
              {Math.round(normalizedProgress)}%
            </span>
          ) : null}
        </div>
      </div>
      
      {/* Label below */}
      {label && (
        <span className="mt-2 label-caps text-center">{label}</span>
      )}
    </div>
  );
}

// Multi-ring component (Apple Fitness style)
interface MultiRingProps {
  rings: Array<{
    progress: number;
    color: 'primary' | 'success' | 'warning' | 'destructive';
    label?: string;
  }>;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

export function MultiRing({ rings, size = 'lg', className }: MultiRingProps) {
  const baseSize = size === 'xl' ? 128 : size === 'lg' ? 96 : 72;
  const strokeWidth = size === 'xl' ? 10 : size === 'lg' ? 8 : 6;
  const gap = strokeWidth + 4;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={baseSize}
        height={baseSize}
        viewBox={`0 0 ${baseSize} ${baseSize}`}
        className="-rotate-90"
      >
        {rings.map((ring, index) => {
          const radius = (baseSize - strokeWidth) / 2 - index * gap;
          const circumference = 2 * Math.PI * radius;
          const progress = Math.min(Math.max(ring.progress, 0), 100);
          const strokeDashoffset = circumference - (progress / 100) * circumference;
          const colors = colorConfig[ring.color];

          return (
            <g key={index}>
              {/* Background */}
              <circle
                cx={baseSize / 2}
                cy={baseSize / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className={colors.bg}
                strokeLinecap="round"
              />
              {/* Progress */}
              <motion.circle
                cx={baseSize / 2}
                cy={baseSize / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className={colors.stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{
                  duration: 1,
                  ease: [0.25, 0.1, 0.25, 1],
                  delay: 0.1 + index * 0.15,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
