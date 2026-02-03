import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Zap, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface RecentExercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'plyometric';
  lastUsed: string;
}

interface RecentExercisesChipsProps {
  recentExercises: RecentExercise[];
  isLoading?: boolean;
}

const CATEGORY_CONFIG = {
  strength: { 
    icon: Dumbbell, 
    color: 'text-primary', 
    bg: 'bg-primary/10', 
    border: 'border-primary/30',
    hoverBg: 'hover:bg-primary/20',
    hoverShadow: 'hover:shadow-primary/20',
  },
  cardio: { 
    icon: Heart, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30',
    hoverBg: 'hover:bg-emerald-500/20',
    hoverShadow: 'hover:shadow-emerald-500/20',
  },
  plyometric: { 
    icon: Zap, 
    color: 'text-warning', 
    bg: 'bg-warning/10', 
    border: 'border-warning/30',
    hoverBg: 'hover:bg-warning/20',
    hoverShadow: 'hover:shadow-warning/20',
  },
};

export function RecentExercisesChips({ recentExercises, isLoading }: RecentExercisesChipsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-36 h-4" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (recentExercises.length === 0) {
    return null;
  }

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">Nedávno použité cviky</span>
      </div>
      
      {/* Chips */}
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {recentExercises.map((exercise) => {
            const config = CATEGORY_CONFIG[exercise.category];
            const Icon = config.icon;
            const timeAgo = formatDistanceToNow(new Date(exercise.lastUsed), { 
              addSuffix: true, 
              locale: cs 
            });
            
            return (
              <Tooltip key={exercise.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(`/exercises/${exercise.id}`)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-full',
                      'text-sm font-medium',
                      'bg-background/60 backdrop-blur-sm',
                      'border shadow-sm',
                      config.border,
                      config.hoverBg,
                      'hover:shadow-md hover:-translate-y-0.5',
                      config.hoverShadow,
                      'transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                  >
                    <div className={cn('p-1 rounded-md', config.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                    <span className="truncate max-w-[120px] text-foreground">{exercise.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>Použito {timeAgo}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
