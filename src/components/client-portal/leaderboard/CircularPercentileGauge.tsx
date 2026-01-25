import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';

interface CircularPercentileGaugeProps {
  percentile: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const ZONES = [
  { min: 0, max: 25, label: 'Na startu cesty', emoji: '🌱', color: 'stroke-sky-400', bgColor: 'text-sky-400', gradient: 'from-sky-400 to-sky-300' },
  { min: 25, max: 50, label: 'Stavíš základy', emoji: '🧱', color: 'stroke-amber-400', bgColor: 'text-amber-400', gradient: 'from-amber-400 to-amber-300' },
  { min: 50, max: 75, label: 'Nad průměrem', emoji: '📈', color: 'stroke-emerald-400', bgColor: 'text-emerald-400', gradient: 'from-emerald-400 to-emerald-300' },
  { min: 75, max: 90, label: 'Mezi nejlepšími', emoji: '⭐', color: 'stroke-primary', bgColor: 'text-primary', gradient: 'from-primary to-primary/80' },
  { min: 90, max: 100, label: 'Absolutní špička', emoji: '🏆', color: 'stroke-amber-500', bgColor: 'text-amber-500', gradient: 'from-amber-500 to-yellow-400' },
];

function getZone(percentile: number) {
  return ZONES.find(z => percentile >= z.min && percentile < z.max) || ZONES[4];
}

const sizeConfig = {
  sm: { size: 80, stroke: 6, fontSize: 'text-lg' },
  md: { size: 120, stroke: 8, fontSize: 'text-2xl' },
  lg: { size: 160, stroke: 10, fontSize: 'text-4xl' },
};

export function CircularPercentileGauge({ 
  percentile, 
  size = 'md',
  className,
  showLabel = true
}: CircularPercentileGaugeProps) {
  const zone = getZone(percentile);
  const config = sizeConfig[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentile / 100) * circumference;
  
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        {/* Background circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.size}
          height={config.size}
        >
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/20"
          />
        </svg>
        
        {/* Animated progress circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.size}
          height={config.size}
        >
          <defs>
            <linearGradient id={`gauge-gradient-${percentile}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={cn("stop-current", zone.bgColor)} />
              <stop offset="100%" className={cn("stop-current", zone.bgColor)} style={{ opacity: 0.6 }} />
            </linearGradient>
          </defs>
          <motion.circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gauge-gradient-${percentile})`}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ 
              duration: 1.2, 
              ease: [0.4, 0, 0.2, 1],
              delay: 0.2 
            }}
            className="drop-shadow-sm"
            style={{
              filter: percentile >= 75 ? `drop-shadow(0 0 6px hsl(var(--primary) / 0.4))` : undefined
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedCounter 
            value={Math.round(percentile)} 
            className={cn("font-bold tabular-nums", config.fontSize, zone.bgColor)}
            suffix="%"
          />
        </div>
        
        {/* Glow effect for top performers */}
        {percentile >= 75 && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-gradient-to-r opacity-20 blur-xl -z-10",
              zone.gradient
            )}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.3 }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        )}
      </div>
      
      {/* Label */}
      {showLabel && (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-lg mr-1.5">{zone.emoji}</span>
          <span className={cn("text-sm font-medium", zone.bgColor)}>
            {zone.label}
          </span>
        </motion.div>
      )}
    </div>
  );
}
