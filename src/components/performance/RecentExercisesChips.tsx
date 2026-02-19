import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Zap, Clock, Plus } from 'lucide-react';
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
  onQuickLog?: (exerciseId: string, exerciseName: string) => void;
}

const CATEGORY_CONFIG = {
  strength: { 
    icon: Dumbbell, 
    color: 'text-primary', 
    bg: 'bg-primary/10', 
    border: 'border-primary/30',
    hoverBg: 'hover:bg-primary/15',
    activeBg: 'bg-primary/15',
  },
  cardio: { 
    icon: Heart, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30',
    hoverBg: 'hover:bg-emerald-500/15',
    activeBg: 'bg-emerald-500/15',
  },
  plyometric: { 
    icon: Zap, 
    color: 'text-warning', 
    bg: 'bg-warning/10', 
    border: 'border-warning/30',
    hoverBg: 'hover:bg-warning/15',
    activeBg: 'bg-warning/15',
  },
};

export function RecentExercisesChips({ recentExercises, isLoading, onQuickLog }: RecentExercisesChipsProps) {
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
        {onQuickLog && (
          <span className="text-[10px] text-muted-foreground/60 ml-auto">Klikni + pro rychlý zápis</span>
        )}
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
              <div
                key={exercise.id}
                className={cn(
                  'inline-flex items-center rounded-full',
                  'border shadow-sm',
                  'bg-background/60 backdrop-blur-sm',
                  config.border,
                  'transition-all duration-200',
                  'overflow-hidden',
                )}
              >
                {/* Main chip – navigate to detail */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                      className={cn(
                        'inline-flex items-center gap-2 pl-2.5 pr-3 py-2',
                        'text-sm font-medium',
                        config.hoverBg,
                        'hover:-translate-y-0.5',
                        'transition-all duration-200',
                        'focus:outline-none'
                      )}
                    >
                      <div className={cn('p-1 rounded-md', config.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', config.color)} />
                      </div>
                      <span className="truncate max-w-[100px] text-foreground text-xs">{exercise.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-md">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>Použito {timeAgo}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Quick log "+" button */}
                {onQuickLog && (
                  <>
                    <div className={cn('w-px h-5', 'bg-border/50')} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onQuickLog(exercise.id, exercise.name)}
                          className={cn(
                            'flex items-center justify-center w-8 h-full py-2 shrink-0',
                            config.hoverBg,
                            config.color,
                            'hover:-translate-y-0.5',
                            'transition-all duration-200',
                            'focus:outline-none'
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-md">
                        <span className="text-xs font-medium">Zapsat výkon</span>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
