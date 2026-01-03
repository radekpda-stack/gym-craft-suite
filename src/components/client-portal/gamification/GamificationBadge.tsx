import { Flame, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyXPLevel, getLevelName } from '@/hooks/useClientXPLevel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GamificationBadgeProps {
  className?: string;
}

export function GamificationBadge({ className }: GamificationBadgeProps) {
  const { xpLevel, streak, isLoading } = useMyXPLevel();
  
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
      </div>
    );
  }
  
  const level = xpLevel?.level ?? 1;
  const levelName = getLevelName(level);
  const currentStreak = streak?.currentStreak ?? 0;
  
  return (
    <Link to="/zona/badges" className={cn("flex items-center gap-2 flex-wrap", className)}>
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
  );
}
