/**
 * ClientStreakBadge Component
 * 
 * Shows training streak (consecutive weeks) as a badge
 */
import { Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useClientReadiness } from '@/hooks/useClientReadiness';

interface ClientStreakBadgeProps {
  clientId: string;
}

export function ClientStreakBadge({ clientId }: ClientStreakBadgeProps) {
  const { data, isLoading } = useClientReadiness(clientId);

  if (isLoading || !data || data.trainingStreak === 0) {
    return null;
  }

  const streak = data.trainingStreak;
  const isHot = streak >= 4;
  const isOnFire = streak >= 8;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline"
          className={cn(
            'gap-1 text-xs',
            isOnFire && 'border-orange-500/50 text-orange-500 bg-orange-500/10',
            isHot && !isOnFire && 'border-yellow-500/50 text-yellow-600 bg-yellow-500/10',
            !isHot && 'border-border text-muted-foreground'
          )}
        >
          <Flame className={cn(
            'w-3 h-3',
            isOnFire && 'text-orange-500',
            isHot && !isOnFire && 'text-yellow-500'
          )} />
          {streak} týdnů
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{streak} týdnů v řadě s tréninkem</p>
        {isOnFire && <p className="text-orange-500">🔥 Skvělá série!</p>}
      </TooltipContent>
    </Tooltip>
  );
}
