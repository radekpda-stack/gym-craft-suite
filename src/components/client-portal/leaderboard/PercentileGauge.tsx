import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PercentileGaugeProps {
  percentile: number | null;
  className?: string;
}

const ZONES = [
  { min: 0, max: 25, label: 'Prostor pro růst', color: 'from-orange-500 to-orange-400' },
  { min: 25, max: 50, label: 'Průměr', color: 'from-amber-500 to-yellow-400' },
  { min: 50, max: 75, label: 'Nad průměr', color: 'from-emerald-500 to-green-400' },
  { min: 75, max: 100, label: 'Špička', color: 'from-primary to-cyan-400' },
];

function getZone(percentile: number) {
  return ZONES.find(z => percentile >= z.min && percentile < z.max) || ZONES[3];
}

function getPercentileMessage(percentile: number): { message: string; icon: React.ReactNode } {
  if (percentile >= 90) {
    return { message: 'Vynikající! Patříš mezi elitu! 🏆', icon: <Trophy className="w-4 h-4" /> };
  }
  if (percentile >= 75) {
    return { message: 'Skvělé! Jsi ve špičce!', icon: <Sparkles className="w-4 h-4" /> };
  }
  if (percentile >= 50) {
    return { message: 'Dobrá práce! Jsi nad průměrem', icon: <TrendingUp className="w-4 h-4" /> };
  }
  if (percentile >= 25) {
    return { message: 'Solidní základ, pokračuj!', icon: <Target className="w-4 h-4" /> };
  }
  return { message: 'Máš prostor pro růst! 💪', icon: <Target className="w-4 h-4" /> };
}

export default function PercentileGauge({ percentile, className }: PercentileGaugeProps) {
  if (percentile === null) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-3", className)}>
        <div className="text-xs text-muted-foreground">Nedostatek dat pro srovnání</div>
      </div>
    );
  }

  const zone = getZone(percentile);
  const { message, icon } = getPercentileMessage(percentile);
  const markerPosition = Math.min(Math.max(percentile, 2), 98); // Keep marker visible

  return (
    <div className={cn("space-y-3", className)}>
      {/* Percentile display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn(
            "flex items-center gap-1.5 font-medium",
            percentile >= 75 ? "text-primary" :
            percentile >= 50 ? "text-emerald-500" :
            percentile >= 25 ? "text-amber-500" :
            "text-orange-500"
          )}>
            {icon}
            {zone.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{Math.round(percentile)}</span>
          <span className="text-sm text-muted-foreground">percentil</span>
        </div>
      </div>

      {/* Gauge bar with zones */}
      <div className="relative h-3 rounded-full overflow-hidden bg-muted/30">
        {/* Zone segments */}
        <div className="absolute inset-0 flex">
          {ZONES.map((z, i) => (
            <div 
              key={i} 
              className={cn(
                "h-full flex-1 bg-gradient-to-r opacity-30",
                z.color,
                i === 0 && "rounded-l-full",
                i === ZONES.length - 1 && "rounded-r-full"
              )}
            />
          ))}
        </div>
        
        {/* Filled progress */}
        <motion.div 
          className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", zone.color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentile}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Zone dividers */}
        <div className="absolute inset-0 flex pointer-events-none">
          {[25, 50, 75].map((pos) => (
            <div 
              key={pos}
              className="absolute top-0 bottom-0 w-px bg-background/50"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>

        {/* Position marker */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-lg shadow-primary/30"
          initial={{ left: 0 }}
          animate={{ left: `calc(${markerPosition}% - 8px)` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <div className="absolute inset-0.5 rounded-full bg-primary" />
        </motion.div>
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* Message */}
      <motion.div 
        className={cn(
          "text-center text-sm py-2 px-3 rounded-lg",
          percentile >= 75 ? "bg-primary/10 text-primary" :
          percentile >= 50 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          percentile >= 25 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          "bg-orange-500/10 text-orange-600 dark:text-orange-400"
        )}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {message}
      </motion.div>
    </div>
  );
}
