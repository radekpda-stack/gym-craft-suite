import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy, ChevronRight, Dumbbell, Timer, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { formatTimeSimple } from '@/lib/timeUtils';
import { ClientExerciseProgress, ExerciseProgressEntry } from '@/hooks/useClientAllExercises';
import { haptic } from '@/lib/haptics';

interface ExerciseSparklineItemProps {
  exercise: ClientExerciseProgress;
  onClick: () => void;
  index?: number;
}

const TYPE_ICONS = {
  strength: Dumbbell,
  cardio: Timer,
  skill: Zap,
};

const TYPE_COLORS = {
  strength: 'hsl(var(--primary))',
  cardio: 'hsl(217 91% 60%)', // blue
  skill: 'hsl(38 92% 50%)', // amber
};

// Sanitize ID for SVG gradients - remove all non-alphanumeric characters
const sanitizeGradientId = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
};

export function ExerciseSparklineItem({ exercise, onClick, index = 0 }: ExerciseSparklineItemProps) {
  const { exerciseName, data, exerciseType, isTimeBased, maxWeight, bestTime, prCount } = exercise;
  
  // Determine if lower is better (cardio time = lower is better)
  const lowerIsBetter = exerciseType === 'cardio' || (exerciseType === 'skill' && isTimeBased);
  
  // Calculate trend and current value
  const { trend, trendPercent, currentValue, sparklineData, displayValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { trend: 0, trendPercent: 0, currentValue: 0, sparklineData: [], displayValue: '—' };
    }

    // Sort by date ascending for sparkline
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Get the value based on exercise type
    const getValue = (entry: ExerciseProgressEntry): number => {
      if (exerciseType === 'cardio' || isTimeBased) {
        return entry.timeSeconds || 0;
      }
      return entry.weight || 0;
    };
    
    // Prepare sparkline data
    const sparkData = sorted.slice(-10).map(entry => ({
      value: getValue(entry),
    }));
    
    // Calculate trend (compare first half avg vs second half avg)
    const recentEntries = sorted.slice(-6);
    if (recentEntries.length >= 2) {
      const firstValue = getValue(recentEntries[0]);
      const lastValue = getValue(recentEntries[recentEntries.length - 1]);
      
      if (firstValue > 0) {
        const change = ((lastValue - firstValue) / firstValue) * 100;
        const isImprovement = lowerIsBetter ? change < 0 : change > 0;
        
        return {
          trend: isImprovement ? 1 : change === 0 ? 0 : -1,
          trendPercent: Math.abs(Math.round(change)),
          currentValue: lastValue,
          sparklineData: sparkData,
          displayValue: exerciseType === 'cardio' || isTimeBased
            ? formatTimeSimple(lastValue)
            : `${lastValue} kg`,
        };
      }
    }
    
    const lastEntry = sorted[sorted.length - 1];
    const val = getValue(lastEntry);
    
    return {
      trend: 0,
      trendPercent: 0,
      currentValue: val,
      sparklineData: sparkData,
      displayValue: exerciseType === 'cardio' || isTimeBased
        ? formatTimeSimple(val)
        : `${val} kg`,
    };
  }, [data, exerciseType, isTimeBased, lowerIsBetter]);

  const Icon = TYPE_ICONS[exerciseType] || Dumbbell;
  const color = TYPE_COLORS[exerciseType] || TYPE_COLORS.strength;
  
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';
  const trendBg = trend > 0 ? 'bg-success/10' : trend < 0 ? 'bg-destructive/10' : 'bg-muted';
  
  // Trend label for cardio (lower = better) should say "rychlejší!"
  const trendLabel = useMemo(() => {
    if (trend === 0) return 'stabilní';
    if (lowerIsBetter) {
      return trend > 0 ? 'rychlejší!' : 'pomalejší';
    }
    return trend > 0 ? 'stoupá!' : 'klesá';
  }, [trend, lowerIsBetter]);

  const handleClick = () => {
    haptic('selection');
    onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        "flex-shrink-0 w-[160px] rounded-xl p-3 cursor-pointer",
        "bg-card/80 backdrop-blur-sm border border-border/50",
        "hover:bg-card hover:border-border hover:shadow-md",
        "active:scale-[0.98] transition-all duration-200"
      )}
    >
      {/* Header with icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {exerciseName}
        </span>
        {prCount > 0 && (
          <Trophy className="w-3 h-3 text-warning flex-shrink-0" />
        )}
      </div>
      
      {/* Current value - large */}
      <div className="mb-2">
        <span className="text-lg font-bold text-foreground">
          {displayValue}
        </span>
      </div>
      
      {/* Sparkline */}
      {sparklineData.length > 1 && (
        <div className="h-8 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`gradient-${sanitizeGradientId(exercise.exerciseName)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#gradient-${sanitizeGradientId(exercise.exerciseName)})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
          trendBg, trendColor
        )}>
          <TrendIcon className="w-3 h-3" />
          {trendPercent > 0 && <span>{trend > 0 ? '+' : '-'}{trendPercent}%</span>}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
}
