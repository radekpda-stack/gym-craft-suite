import { Flame, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyXPLevel, getLevelName } from '@/hooks/useClientXPLevel';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GamificationBadgeProps {
  className?: string;
}

export function GamificationBadge({ className }: GamificationBadgeProps) {
  const { xpLevel, streak, isLoading } = useMyXPLevel();
  
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
      </div>
    );
  }
  
  const level = xpLevel?.level ?? 1;
  const levelName = getLevelName(level);
  const currentStreak = streak?.currentStreak ?? 0;
  const levelXp = xpLevel?.level_xp ?? 0;
  const xpToNext = xpLevel?.xp_to_next ?? 100;
  const totalForLevel = levelXp + xpToNext;
  const progressPercent = totalForLevel > 0 ? (levelXp / totalForLevel) * 100 : 0;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Badges row */}
      <Link to="/zona/badges" className="flex items-center gap-2 flex-wrap">
        {/* Level Badge */}
        <Badge 
          variant="secondary" 
          className="gap-1.5 py-1 px-2.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="font-medium">Level {level}</span>
          <span className="text-primary/70">·</span>
          <span className="font-normal">{levelName}</span>
        </Badge>
        
        {/* Streak Badge - only show if streak > 0 */}
        {currentStreak > 0 && (
          <Badge 
            variant="secondary" 
            className="gap-1.5 py-1 px-2.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="font-medium">{currentStreak}</span>
            <span className="font-normal">{currentStreak === 1 ? 'týden' : currentStreak < 5 ? 'týdny' : 'týdnů'}</span>
          </Badge>
        )}
      </Link>
      
      {/* XP Progress Bar */}
      <Link to="/zona/badges" className="block group">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>{levelXp} XP</span>
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              Level {level + 1} za {xpToNext} XP
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
