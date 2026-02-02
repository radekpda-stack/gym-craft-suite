import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Zone {
  from: number;
  to: number;
  color: 'success' | 'warning' | 'destructive' | 'primary' | 'muted';
}

interface GaugeMeterProps {
  value: number;
  min?: number;
  max?: number;
  zones?: Zone[];
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  unit?: string;
  showValue?: boolean;
  animate?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80, height: 48, strokeWidth: 6, fontSize: 'text-sm' },
  md: { width: 120, height: 72, strokeWidth: 8, fontSize: 'text-lg' },
  lg: { width: 160, height: 96, strokeWidth: 10, fontSize: 'text-xl' },
};

const colorMap = {
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted))',
};

const defaultZones: Zone[] = [
  { from: 0, to: 33, color: 'destructive' },
  { from: 33, to: 66, color: 'warning' },
  { from: 66, to: 100, color: 'success' },
];

export function GaugeMeter({
  value,
  min = 0,
  max = 100,
  zones = defaultZones,
  size = 'md',
  label,
  unit,
  showValue = true,
  animate = true,
  className,
}: GaugeMeterProps) {
  const { width, height, strokeWidth, fontSize } = sizeConfig[size];
  
  // Normalize value to percentage
  const range = max - min;
  const normalizedValue = Math.min(Math.max((value - min) / range, 0), 1);
  const percentage = normalizedValue * 100;
  
  // SVG arc calculations (180 degree arc)
  const centerX = width / 2;
  const centerY = height;
  const radius = Math.min(width, height * 2) / 2 - strokeWidth;
  
  // Create arc path for a semicircle
  const createArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };
  
  // Full arc path (180 degrees, from left to right)
  const fullArcPath = createArc(180, 0);
  
  // Calculate arc length for animation
  const arcLength = Math.PI * radius;
  const progressOffset = arcLength * (1 - normalizedValue);
  
  // Determine current zone color
  const currentZone = zones.find(z => percentage >= z.from && percentage <= z.to) || zones[zones.length - 1];
  const currentColor = colorMap[currentZone.color];

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg
        width={width}
        height={height + 8}
        viewBox={`0 0 ${width} ${height + 8}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={fullArcPath}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Zone indicators (optional tick marks) */}
        {zones.map((zone, index) => {
          const zoneStart = 180 - (zone.from / 100) * 180;
          const tickRad = (zoneStart * Math.PI) / 180;
          const innerRadius = radius - strokeWidth / 2 - 4;
          const outerRadius = radius - strokeWidth / 2 + 4;
          
          return (
            <line
              key={index}
              x1={centerX + innerRadius * Math.cos(tickRad)}
              y1={centerY + innerRadius * Math.sin(tickRad)}
              x2={centerX + outerRadius * Math.cos(tickRad)}
              y2={centerY + outerRadius * Math.sin(tickRad)}
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth={1}
            />
          );
        })}
        
        {/* Progress arc */}
        <motion.path
          d={fullArcPath}
          fill="none"
          stroke={currentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={animate ? { strokeDashoffset: arcLength } : false}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{
            duration: animate ? 1 : 0,
            ease: [0.25, 0.1, 0.25, 1],
            delay: 0.1,
          }}
          style={{
            filter: `drop-shadow(0 0 6px ${currentColor})`,
          }}
        />
        
        {/* Needle indicator */}
        <motion.g
          initial={animate ? { rotate: -90 } : false}
          animate={{ rotate: -90 + normalizedValue * 180 }}
          transition={{
            duration: animate ? 1.2 : 0,
            ease: [0.25, 0.1, 0.25, 1],
            delay: 0.1,
          }}
          style={{ transformOrigin: `${centerX}px ${centerY}px` }}
        >
          <circle
            cx={centerX}
            cy={centerY}
            r={strokeWidth / 2 + 2}
            fill="hsl(var(--foreground))"
          />
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - radius + strokeWidth + 4}
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
      
      {/* Value display */}
      {showValue && (
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <span className={cn('font-bold tracking-tight', fontSize)}>
            {Math.round(value)}
          </span>
          {unit && (
            <span className="text-muted-foreground text-xs">{unit}</span>
          )}
        </div>
      )}
      
      {/* Label */}
      {label && (
        <span className="mt-1 label-caps text-center">{label}</span>
      )}
    </div>
  );
}

// Simple linear progress bar with zones
interface LinearGaugeProps {
  value: number;
  max?: number;
  zones?: Zone[];
  height?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function LinearGauge({
  value,
  max = 100,
  zones = defaultZones,
  height = 8,
  label,
  showValue = true,
  className,
}: LinearGaugeProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const currentZone = zones.find(z => percentage >= z.from && percentage <= z.to) || zones[zones.length - 1];

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="label-caps">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium">{Math.round(value)}</span>
          )}
        </div>
      )}
      
      <div 
        className="relative w-full rounded-full overflow-hidden bg-muted/30"
        style={{ height }}
      >
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            currentZone.color === 'success' && 'bg-success',
            currentZone.color === 'warning' && 'bg-warning',
            currentZone.color === 'destructive' && 'bg-destructive',
            currentZone.color === 'primary' && 'bg-primary',
            currentZone.color === 'muted' && 'bg-muted-foreground'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      </div>
    </div>
  );
}
