import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Dumbbell, Heart, Zap, Clock, Star, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useRecentExercises } from '@/hooks/useRecentExercises';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG: Record<string, { icon: typeof Dumbbell; color: string; bg: string; label: string }> = {
  strength: { icon: Dumbbell, color: 'text-primary', bg: 'bg-primary/10', label: 'Síla' },
  cardio: { icon: Heart, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Kardio' },
  plyometric: { icon: Zap, color: 'text-warning', bg: 'bg-warning/10', label: 'Plyo' },
};

function getCategoryType(category: string | null): 'strength' | 'cardio' | 'plyometric' {
  const cat = (category || '').toLowerCase();
  if (cat === 'cardio' || cat === 'conditioning' || cat.includes('kardio')) return 'cardio';
  if (cat.includes('plyometric') || cat.includes('skok') || cat.includes('jump')) return 'plyometric';
  return 'strength';
}

interface ExerciseSearchCommandProps {
  trigger?: React.ReactNode;
}

export function ExerciseSearchCommand({ trigger }: ExerciseSearchCommandProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: exercises = [] } = useExercisesWithUsage();
  const { data: recentExercises = [] } = useRecentExercises(5);
  const { favoriteIds, isFavorite } = useFavoriteExercises();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((exerciseId: string) => {
    setOpen(false);
    navigate(`/exercises/${exerciseId}`);
  }, [navigate]);

  const favoriteExercises = exercises.filter((ex) => favoriteIds.includes(ex.id)).slice(0, 5);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className={cn(
            "w-full justify-start text-muted-foreground gap-2 h-12",
            "bg-background/60 backdrop-blur-sm",
            "border-border/50 shadow-sm",
            "hover:bg-background hover:border-primary/40 hover:shadow-md",
            "transition-all duration-200"
          )}
        >
          <div className="p-1.5 rounded-lg bg-muted/50">
            <Search className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left">Rychle hledat cvik...</span>
          <kbd className={cn(
            "pointer-events-none hidden h-6 select-none items-center gap-1 rounded-md px-2",
            "border border-border/50 bg-secondary/60 backdrop-blur-sm",
            "font-mono text-[10px] font-medium text-muted-foreground",
            "sm:flex"
          )}>
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Hledej cvik..." className="h-12" />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Žádné cviky nenalezeny.
          </CommandEmpty>

          {/* Recent exercises */}
          {recentExercises.length > 0 && (
            <CommandGroup heading="Nedávno použité">
              {recentExercises.map((recent) => {
                const exercise = exercises.find((e) => e.id === recent.exercise_id);
                if (!exercise) return null;
                const catType = getCategoryType(exercise.category);
                const config = CATEGORY_CONFIG[catType];
                const Icon = config.icon;

                return (
                  <CommandItem
                    key={recent.exercise_id}
                    value={recent.exercise_name}
                    onSelect={() => handleSelect(recent.exercise_id)}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg cursor-pointer"
                  >
                    <div className={cn('p-2 rounded-lg shadow-sm', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">
                        {exercise.name_cs || exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(recent.last_used), { addSuffix: true, locale: cs })}
                      </p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] font-medium", config.bg, config.color)}>
                      {config.label}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Favorite exercises */}
          {favoriteExercises.length > 0 && (
            <>
              <CommandSeparator className="my-2" />
              <CommandGroup heading="Oblíbené">
                {favoriteExercises.map((exercise) => {
                  const catType = getCategoryType(exercise.category);
                  const config = CATEGORY_CONFIG[catType];
                  const Icon = config.icon;

                  return (
                    <CommandItem
                      key={exercise.id}
                      value={`fav-${exercise.name_cs || exercise.name}`}
                      onSelect={() => handleSelect(exercise.id)}
                      className="flex items-center gap-3 py-3 px-3 rounded-lg cursor-pointer"
                    >
                      <div className={cn('p-2 rounded-lg shadow-sm', config.bg)}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate flex items-center gap-1.5 text-foreground">
                          {exercise.name_cs || exercise.name}
                          <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {exercise.usageCount}× použito
                        </p>
                      </div>
                      <Badge variant="secondary" className={cn("text-[10px] font-medium", config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* All exercises (filtered by search) */}
          <CommandSeparator className="my-2" />
          <CommandGroup heading="Všechny cviky">
            {exercises.slice(0, 20).map((exercise) => {
              const catType = getCategoryType(exercise.category);
              const config = CATEGORY_CONFIG[catType];
              const Icon = config.icon;

              return (
                <CommandItem
                  key={exercise.id}
                  value={exercise.name_cs || exercise.name}
                  onSelect={() => handleSelect(exercise.id)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
                >
                  <div className={cn('p-1.5 rounded-md', config.bg)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  <span className="flex-1 truncate text-foreground">{exercise.name_cs || exercise.name}</span>
                  {isFavorite(exercise.id) && (
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  )}
                  {exercise.usageCount > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {exercise.usageCount}×
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
