import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Dumbbell, Heart, Zap, Clock, Star, Activity, Plus, ExternalLink, User, BookOpen, RotateCcw } from 'lucide-react';
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
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useRecentExercises } from '@/hooks/useRecentExercises';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { useClients } from '@/hooks/useClients';
import { useRecentClientExercisePairs } from '@/hooks/useRecentClientExercisePairs';
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

interface UniversalSearchCommandProps {
  trigger?: React.ReactNode;
  onQuickLog?: (exerciseId: string, exerciseName: string, clientId?: string) => void;
  onSelectClient?: (clientId: string) => void;
}

export function UniversalSearchCommand({ trigger, onQuickLog, onSelectClient }: UniversalSearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: exercises = [] } = useExercisesWithUsage();
  const { data: recentExercises = [] } = useRecentExercises(5);
  const { favoriteIds, isFavorite } = useFavoriteExercises();
  const { data: clients = [] } = useClients();
  const { data: recentPairs = [] } = useRecentClientExercisePairs(5);

  const activeClients = clients.filter(c => !c.is_archived);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelectExercise = useCallback((exerciseId: string) => {
    if (onQuickLog) {
      setActionMenuId(exerciseId);
    } else {
      setOpen(false);
      navigate(`/exercises/${exerciseId}`);
    }
  }, [navigate, onQuickLog]);

  const handleQuickLog = useCallback((exerciseId: string, exerciseName: string, clientId?: string) => {
    setOpen(false);
    setActionMenuId(null);
    onQuickLog?.(exerciseId, exerciseName, clientId);
  }, [onQuickLog]);

  const handleViewDetail = useCallback((exerciseId: string) => {
    setOpen(false);
    setActionMenuId(null);
    navigate(`/exercises/${exerciseId}`);
  }, [navigate]);

  const handleSelectClient = useCallback((clientId: string) => {
    setOpen(false);
    setActionMenuId(null);
    onSelectClient?.(clientId);
  }, [onSelectClient]);

  const handleClientQuickLog = useCallback((clientId: string) => {
    setOpen(false);
    setActionMenuId(null);
    // Open QuickLog without a specific exercise but with client pre-selected
    onQuickLog?.('', '', clientId);
  }, [onQuickLog]);

  const handleRecentPairLog = useCallback((pair: { client_id: string; exercise_id: string; exercise_name: string }) => {
    setOpen(false);
    onQuickLog?.(pair.exercise_id, pair.exercise_name, pair.client_id);
  }, [onQuickLog]);

  const favoriteExercises = exercises.filter((ex) => favoriteIds.includes(ex.id)).slice(0, 5);

  // Render exercise action menu
  const renderExerciseActions = (exerciseId: string, exerciseName: string) => {
    if (actionMenuId !== exerciseId || !onQuickLog) return null;
    return (
      <div className="flex border-t border-border/40 w-full">
        <button
          onClick={(e) => { e.stopPropagation(); handleQuickLog(exerciseId, exerciseName); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Zapsat výkon
        </button>
        <div className="w-px bg-border/40" />
        <button
          onClick={(e) => { e.stopPropagation(); handleViewDetail(exerciseId); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Detail cviku
        </button>
      </div>
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className={cn(
            "w-full justify-start text-muted-foreground gap-2 h-10 sm:h-12",
            "bg-background/60 backdrop-blur-sm",
            "border-border/50 shadow-sm",
            "hover:bg-background hover:border-primary/40 hover:shadow-md",
            "transition-all duration-200"
          )}
        >
          <div className="p-1 sm:p-1.5 rounded-lg bg-muted/50">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex flex-col">
            <span className="flex-1 text-left text-xs sm:text-sm">Hledej klienta nebo cvik...</span>
            {onQuickLog && (
              <span className="text-[10px] text-primary/70">Rychlý zápis nebo detail</span>
            )}
          </div>
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

      <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setActionMenuId(null); }}>
        <CommandInput placeholder="Hledej klienta nebo cvik..." className="h-12" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nic nenalezeno.
          </CommandEmpty>

          {/* Clients section */}
          {activeClients.length > 0 && (
            <CommandGroup heading="Klienti">
              {activeClients.slice(0, 8).map((client) => {
                const isActionOpen = actionMenuId === `client-${client.id}`;
                return (
                  <CommandItem
                    key={`client-${client.id}`}
                    value={`client:${client.name}`}
                    onSelect={() => {
                      if (onQuickLog || onSelectClient) {
                        setActionMenuId(`client-${client.id}`);
                      } else {
                        handleSelectClient(client.id);
                      }
                    }}
                    className="flex flex-col gap-0 py-0 px-0 rounded-lg cursor-pointer overflow-hidden"
                  >
                    <div className="flex items-center gap-3 py-2.5 px-3 w-full">
                      <ClientAvatar name={client.name} size="xs" />
                      <span className="flex-1 truncate text-foreground font-medium">{client.name}</span>
                      {client.is_favorite && (
                        <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      )}
                    </div>
                    {isActionOpen && (
                      <div className="flex border-t border-border/40 w-full">
                        {onQuickLog && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleClientQuickLog(client.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Zapsat výkon
                          </button>
                        )}
                        {onQuickLog && onSelectClient && <div className="w-px bg-border/40" />}
                        {onSelectClient && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectClient(client.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Otevřít deník
                          </button>
                        )}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Recent client+exercise pairs */}
          {recentPairs.length > 0 && (
            <>
              <CommandSeparator className="my-2" />
              <CommandGroup heading="Nedávné kombinace">
                {recentPairs.map((pair) => {
                  const timeAgo = formatDistanceToNow(new Date(pair.last_date), { addSuffix: true, locale: cs });
                  return (
                    <CommandItem
                      key={`pair-${pair.client_id}-${pair.exercise_id}`}
                      value={`pair:${pair.client_name} ${pair.exercise_name}`}
                      onSelect={() => handleRecentPairLog(pair)}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-accent/50 shrink-0">
                        <RotateCcw className="w-3.5 h-3.5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {pair.client_name} · {pair.exercise_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Recent exercises */}
          {recentExercises.length > 0 && (
            <>
              <CommandSeparator className="my-2" />
              <CommandGroup heading="Nedávno použité cviky">
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
                      onSelect={() => handleSelectExercise(recent.exercise_id)}
                      className="flex flex-col gap-0 py-0 px-0 rounded-lg cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-center gap-3 py-3 px-3 w-full">
                        <div className={cn('p-2 rounded-lg shadow-sm shrink-0', config.bg)}>
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
                      </div>
                      {renderExerciseActions(recent.exercise_id, exercise.name_cs || exercise.name)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Favorite exercises */}
          {favoriteExercises.length > 0 && (
            <>
              <CommandSeparator className="my-2" />
              <CommandGroup heading="Oblíbené cviky">
                {favoriteExercises.map((exercise) => {
                  const catType = getCategoryType(exercise.category);
                  const config = CATEGORY_CONFIG[catType];
                  const Icon = config.icon;

                  return (
                    <CommandItem
                      key={exercise.id}
                      value={`fav-${exercise.name_cs || exercise.name}`}
                      onSelect={() => handleSelectExercise(exercise.id)}
                      className="flex flex-col gap-0 py-0 px-0 rounded-lg cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-center gap-3 py-3 px-3 w-full">
                        <div className={cn('p-2 rounded-lg shadow-sm shrink-0', config.bg)}>
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
                      </div>
                      {renderExerciseActions(exercise.id, exercise.name_cs || exercise.name)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* All exercises */}
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
                  onSelect={() => handleSelectExercise(exercise.id)}
                  className="flex flex-col gap-0 py-0 px-0 rounded-lg cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center gap-3 py-2.5 px-3 w-full">
                    <div className={cn('p-1.5 rounded-md shrink-0', config.bg)}>
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
                  </div>
                  {renderExerciseActions(exercise.id, exercise.name_cs || exercise.name)}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
