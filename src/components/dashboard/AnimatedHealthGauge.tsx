import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedHealthGaugeProps {
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showLabel?: boolean;
}

const SIZE_CONFIG = {
  sm: { width: 80, strokeWidth: 6, fontSize: 'text-xl', sublabelSize: 'text-[10px]' },
  md: { width: 100, strokeWidth: 8, fontSize: 'text-2xl', sublabelSize: 'text-xs' },
  lg: { width: 140, strokeWidth: 10, fontSize: 'text-4xl', sublabelSize: 'text-sm' },
};

const STATUS_CONFIG = {
  excellent: {
    color: 'hsl(var(--success))',
    gradient: ['hsl(142, 76%, 36%)', 'hsl(142, 71%, 45%)'],
    glow: 'rgba(34, 197, 94, 0.4)',
    bg: 'hsl(var(--success) / 0.1)',
  },
  good: {
    color: 'hsl(var(--primary))',
    gradient: ['hsl(262, 83%, 58%)', 'hsl(280, 65%, 60%)'],
    glow: 'rgba(139, 92, 246, 0.4)',
    bg: 'hsl(var(--primary) / 0.1)',
  },
  warning: {
    color: 'hsl(var(--warning))',
    gradient: ['hsl(38, 92%, 50%)', 'hsl(45, 93%, 47%)'],
    glow: 'rgba(245, 158, 11, 0.4)',
    bg: 'hsl(var(--warning) / 0.1)',
  },
  critical: {
    color: 'hsl(var(--destructive))',
    gradient: ['hsl(0, 84%, 60%)', 'hsl(0, 72%, 51%)'],
    glow: 'rgba(239, 68, 68, 0.4)',
    bg: 'hsl(var(--destructive) / 0.1)',
  },
};

export const AnimatedHealthGauge = memo(function AnimatedHealthGauge({
  score,
  status,
  size = 'md',
  animated = true,
  showLabel = true,
}: AnimatedHealthGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const config = SIZE_CONFIG[size];
  const statusConfig = STATUS_CONFIG[status];
  
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    
    const duration = 1000;
    const startTime = Date.now();
    const startScore = displayScore;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + (score - startScore) * eased);
      
      setDisplayScore(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score, animated]);

  const gradientId = `gauge-gradient-${status}`;
  const glowId = `gauge-glow-${status}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={statusConfig.gradient[0]} />
            <stop offset="100%" stopColor={statusConfig.gradient[1]} />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={config.strokeWidth}
          opacity={0.3}
        />
        
        {/* Progress arc */}
        <motion.circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: animated ? 1 : 0, ease: 'easeOut' }}
          filter={`url(#${glowId})`}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn('font-bold tabular-nums', config.fontSize)}
          style={{ color: statusConfig.color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {displayScore}
        </motion.span>
        {showLabel && (
          <motion.span
            className={cn('text-muted-foreground', config.sublabelSize)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            / 100
          </motion.span>
        )}
      </div>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `0 0 ${size === 'lg' ? 30 : 20}px ${statusConfig.glow}`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: status === 'critical' ? [0.5, 1, 0.5] : 0.6 }}
        transition={
          status === 'critical'
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.5 }
        }
      />
    </div>
  );
});
