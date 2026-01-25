import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Rocket, Gem, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';

interface PercentileGaugeProps {
  percentile: number | null;
  className?: string;
  compact?: boolean;
}

// Positive framing zones - never negative!
const ZONES = [
  { min: 0, max: 25, label: 'Na startu cesty', emoji: '🌱', color: 'sky-400', icon: Rocket, message: 'Tvá cesta právě začíná! Každý krok se počítá.' },
  { min: 25, max: 50, label: 'Stavíš základy', emoji: '🧱', color: 'amber-400', icon: TrendingUp, message: 'Skvělý pokrok! Základy jsou položeny.' },
  { min: 50, max: 75, label: 'Nad průměrem', emoji: '📈', color: 'emerald-400', icon: TrendingUp, message: 'Výborně! Patříš mezi lepší polovinu.' },
  { min: 75, max: 90, label: 'Mezi nejlepšími', emoji: '⭐', color: 'primary', icon: Gem, message: 'Úžasné! Jsi mezi top 25%.' },
  { min: 90, max: 101, label: 'Absolutní špička', emoji: '🏆', color: 'amber-500', icon: Crown, message: 'Legendární! Patříš mezi elitu!' },
];

function getZone(percentile: number) {
  return ZONES.find(z => percentile >= z.min && percentile < z.max) || ZONES[4];
}

function getColorClasses(colorKey: string) {
  const colorMap: Record<string, { text: string; bg: string; border: string; fill: string }> = {
    'sky-400': { text: 'text-sky-400', bg: 'bg-sky-400', border: 'border-sky-400/30', fill: 'bg-sky-400/10' },
    'amber-400': { text: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400/30', fill: 'bg-amber-400/10' },
    'emerald-400': { text: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400/30', fill: 'bg-emerald-400/10' },
    'primary': { text: 'text-primary', bg: 'bg-primary', border: 'border-primary/30', fill: 'bg-primary/10' },
    'amber-500': { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500/30', fill: 'bg-amber-500/10' },
  };
  return colorMap[colorKey] || colorMap['primary'];
}

export function PercentileGauge({ percentile, className, compact = false }: PercentileGaugeProps) {
  if (percentile === null) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-3", className)}>
        <div className="text-xs text-muted-foreground">Připrav se na start! 🚀</div>
      </div>
    );
  }

  const zone = getZone(percentile);
  const colors = getColorClasses(zone.color);
  const markerPosition = Math.min(Math.max(percentile, 2), 98);
  const Icon = zone.icon;

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Compact gauge bar */}
        <div className="relative h-2 rounded-full overflow-hidden bg-muted/30">
          <motion.div 
            className={cn("absolute inset-y-0 left-0 rounded-full", colors.bg)}
            initial={{ width: 0 }}
            animate={{ width: `${percentile}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn("flex items-center gap-1 font-medium", colors.text)}>
            {zone.emoji} {zone.label}
          </span>
          <span className="font-bold tabular-nums">{Math.round(percentile)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with percentile display */}
      <div className="flex items-center justify-between">
        <motion.div 
          className={cn("flex items-center gap-2", colors.text)}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm font-semibold">{zone.label}</span>
        </motion.div>
        <div className="flex items-baseline gap-1">
          <AnimatedCounter 
            value={Math.round(percentile)} 
            className="text-2xl font-bold tabular-nums"
          />
          <span className="text-sm text-muted-foreground">percentil</span>
        </div>
      </div>

      {/* Enhanced gauge bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-muted/20">
        {/* Zone segments with subtle coloring */}
        <div className="absolute inset-0 flex">
          {ZONES.map((z, i) => {
            const zColors = getColorClasses(z.color);
            return (
              <div 
                key={i} 
                className={cn(
                  "h-full flex-1 opacity-20",
                  zColors.bg,
                  i === 0 && "rounded-l-full",
                  i === ZONES.length - 1 && "rounded-r-full"
                )}
              />
            );
          })}
        </div>
        
        {/* Filled progress with gradient */}
        <motion.div 
          className={cn("absolute inset-y-0 left-0 rounded-full", colors.bg)}
          initial={{ width: 0 }}
          animate={{ width: `${percentile}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            boxShadow: percentile >= 75 ? `0 0 12px hsl(var(--primary) / 0.4)` : undefined
          }}
        />

        {/* Zone dividers */}
        <div className="absolute inset-0 flex pointer-events-none">
          {[25, 50, 75, 90].map((pos) => (
            <div 
              key={pos}
              className="absolute top-0 bottom-0 w-px bg-background/40"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>

        {/* Position marker */}
        <motion.div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 shadow-lg",
            colors.border
          )}
          initial={{ left: 0, scale: 0 }}
          animate={{ left: `calc(${markerPosition}% - 8px)`, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <div className={cn("absolute inset-1 rounded-full", colors.bg)} />
        </motion.div>
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground/70 px-0.5">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* Motivational message */}
      <motion.div 
        className={cn(
          "text-center text-sm py-2.5 px-4 rounded-xl border",
          colors.fill,
          colors.border,
          colors.text
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <span className="mr-1.5">{zone.emoji}</span>
        {zone.message}
      </motion.div>
    </div>
  );
}
