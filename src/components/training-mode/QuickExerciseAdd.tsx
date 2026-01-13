import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Plus, Search, Star, Clock, Dumbbell, Timer, Loader2, X, ArrowUp, ArrowRight, Repeat, Footprints } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimeInputSimple } from '@/components/ui/time-input-simple';
import { SideSelector, type Side } from '@/components/ui/side-selector';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useRecentExercises } from '@/hooks/useRecentExercises';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formSchema = z.object({
  weight_kg: z.number().nullable(),
  reps: z.number().nullable(),
  sets: z.number().min(1).default(1),
  time_ms: z.number().nullable(),
  height_cm: z.number().nullable(),
  distance_cm: z.number().nullable(),
});

type FormData = z.infer<typeof formSchema>;

// Determine exercise type from supported_metrics or default_unit
type ExerciseInputType = 'strength' | 'time' | 'height' | 'distance' | 'reps_only';

function getExerciseInputType(exercise: Exercise): ExerciseInputType {
  const metrics = exercise.supported_metrics || [];
  const defaultUnit = exercise.default_unit;
  
  // Check supported_metrics first
  if (metrics.includes('height_cm')) return 'height';
  if (metrics.includes('distance_cm')) return 'distance';
  
  // Then check default_unit
  if (defaultUnit === 'height_cm') return 'height';
  if (defaultUnit === 'distance_cm') return 'distance';
  if (defaultUnit === 'seconds' || exercise.is_time_based) return 'time';
  
  // Check if bodyweight exercise without weight
  if (exercise.is_bodyweight && !metrics.includes('weight')) return 'reps_only';
  
  return 'strength';
}

function getExerciseTypeBadge(exercise: Exercise) {
  const type = getExerciseInputType(exercise);
  const badges: React.ReactNode[] = [];
  
  switch (type) {
    case 'height':
      badges.push(<Badge key="height" variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary">výška</Badge>);
      break;
    case 'distance':
      badges.push(<Badge key="distance" variant="secondary" className="text-[10px] shrink-0 bg-accent/10 text-accent">délka</Badge>);
      break;
    case 'time':
      badges.push(<Badge key="time" variant="secondary" className="text-[10px] shrink-0 bg-warning/10 text-warning">čas</Badge>);
      break;
  }
  
  if (exercise.is_unilateral) {
    badges.push(<Badge key="unilateral" variant="secondary" className="text-[10px] shrink-0 bg-accent/10 text-accent">L/R</Badge>);
  }
  
  return badges.length > 0 ? <div className="flex gap-1">{badges}</div> : null;
}

interface QuickExerciseAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  trainingSessionId?: string;
  onSuccess?: () => void;
}

export function QuickExerciseAdd({
  open,
  onOpenChange,
  clientId,
  trainingSessionId,
  onSuccess,
}: QuickExerciseAddProps) {
  const { exercises } = useExercises();
  const { createEntry } = useExerciseEntries();
  const { data: recentExercises = [] } = useRecentExercises(8);
  const { favoriteIds } = useFavoriteExercises();
  
  const [step, setStep] = useState<'select' | 'log'>('select');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [side, setSide] = useState<Side>('both');

  const activeExercises = exercises.filter(e => !e.is_archived);
  const isUnilateral = selectedExercise?.is_unilateral || false;

  // Organize exercises
  const organizedExercises = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = query
      ? activeExercises.filter(e => 
          (e.name_cs || e.name || '').toLowerCase().includes(query)
        )
      : activeExercises;

    const favorites = filtered.filter(e => favoriteIds.includes(e.id));
    const recentIds = recentExercises.map(r => r.exercise_id);
    const recent = filtered.filter(e => 
      recentIds.includes(e.id) && !favoriteIds.includes(e.id)
    ).sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    const rest = filtered.filter(e => 
      !favoriteIds.includes(e.id) && !recentIds.includes(e.id)
    );
    
    return { favorites, recent, rest };
  }, [activeExercises, favoriteIds, recentExercises, searchQuery]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight_kg: null,
      reps: null,
      sets: 1,
      time_ms: null,
      height_cm: null,
      distance_cm: null,
    },
  });

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    form.reset({
      weight_kg: null,
      reps: null,
      sets: 1,
      time_ms: null,
      height_cm: null,
      distance_cm: null,
    });
    // Reset side to 'both' for unilateral exercises, 'none' for others
    setSide(exercise.is_unilateral ? 'both' : 'both');
    setStep('log');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedExercise(null);
  };

  const handleClose = () => {
    setStep('select');
    setSelectedExercise(null);
    setSearchQuery('');
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedExercise) return;
    
    setIsSubmitting(true);
    try {
      const timeSeconds = data.time_ms ? Math.round(data.time_ms / 1000) : null;
      
      // Convert height/distance from cm to meters for storage (distance_meters column)
      let distanceMeters: number | null = null;
      if (data.distance_cm) {
        distanceMeters = data.distance_cm / 100;
      }

      // Determine side value for storage
      const sideValue = isUnilateral ? side : 'none';

      await createEntry.mutateAsync({
        client_id: clientId,
        exercise_id: selectedExercise.id,
        exercise_name: selectedExercise.name_cs || selectedExercise.name || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        weight_kg: data.weight_kg,
        reps: data.reps,
        sets: data.sets,
        time_seconds: timeSeconds,
        time_ms: data.time_ms,
        is_bodyweight: selectedExercise.is_bodyweight || false,
        tempo: null,
        notes: null,
        is_pr: false,
        distance_meters: distanceMeters,
        height_cm: data.height_cm,
        side: sideValue,
      });

      toast.success(`${selectedExercise.name_cs || selectedExercise.name} uložen`);
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error('Chyba při ukládání cviku');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exerciseType = selectedExercise ? getExerciseInputType(selectedExercise) : 'strength';

  const ExerciseList = ({ items, icon, title }: { items: Exercise[]; icon: React.ReactNode; title: string }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1">
          {icon}
          {title}
        </div>
        <div className="grid gap-1">
          {items.map(exercise => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => handleSelectExercise(exercise)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                "bg-card hover:bg-accent border border-border/50",
                "flex items-center justify-between gap-2"
              )}
            >
              <span className="font-medium text-sm truncate">
                {exercise.name_cs || exercise.name}
              </span>
              {getExerciseTypeBadge(exercise)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render side selector for unilateral exercises
  const renderSideSelector = () => {
    if (!isUnilateral) return null;
    
    return (
      <div className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          <Footprints className="w-4 h-4" />
          Strana
        </div>
        <SideSelector value={side} onChange={setSide} />
      </div>
    );
  };

  // Render input fields based on exercise type
  const renderInputFields = () => {
    switch (exerciseType) {
      case 'time':
        return (
          <div className="space-y-4">
            {renderSideSelector()}
            <FormField
              control={form.control}
              name="time_ms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4" />
                    Čas
                  </FormLabel>
                  <FormControl>
                    <TimeInputSimple
                      value={field.value}
                      onChange={field.onChange}
                      maxMinutes={59}
                      showCentiseconds={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 'height':
        return (
          <div className="space-y-4">
            {renderSideSelector()}
            {/* Height input */}
            <FormField
              control={form.control}
              name="height_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <ArrowUp className="w-4 h-4 text-primary" />
                    Výška (cm)
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(Math.max(0, current - 5));
                        }}
                      >
                        -5
                      </Button>
                    </div>
                    
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className="text-center text-2xl font-bold h-14 flex-1"
                      />
                    </FormControl>
                    
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(current + 5);
                        }}
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Quick height presets */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Rychlá volba výšky:</p>
              <div className="flex flex-wrap gap-2">
                {[30, 40, 50, 60, 70, 80, 90, 100].map(height => (
                  <Button
                    key={height}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 px-3 text-base font-semibold",
                      form.watch('height_cm') === height && "bg-primary/10 border-primary text-primary"
                    )}
                    onClick={() => form.setValue('height_cm', height)}
                  >
                    {height}cm
                  </Button>
                ))}
              </div>
            </div>

            {/* Sets */}
            {renderSetsField()}
          </div>
        );

      case 'distance':
        return (
          <div className="space-y-4">
            {renderSideSelector()}
            {/* Distance input */}
            <FormField
              control={form.control}
              name="distance_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-accent" />
                    Vzdálenost (cm)
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(Math.max(0, current - 10));
                        }}
                      >
                        -10
                      </Button>
                    </div>
                    
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className="text-center text-2xl font-bold h-14 flex-1"
                      />
                    </FormControl>
                    
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(current + 10);
                        }}
                      >
                        +10
                      </Button>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Quick distance presets */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Rychlá volba vzdálenosti:</p>
              <div className="flex flex-wrap gap-2">
                {[150, 180, 200, 220, 240, 260, 280, 300].map(dist => (
                  <Button
                    key={dist}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 px-3 text-base font-semibold",
                      form.watch('distance_cm') === dist && "bg-accent/10 border-accent text-accent"
                    )}
                    onClick={() => form.setValue('distance_cm', dist)}
                  >
                    {dist}cm
                  </Button>
                ))}
              </div>
            </div>

            {/* Sets */}
            {renderSetsField()}
          </div>
        );

      case 'reps_only':
        return (
          <div className="space-y-4">
            {renderSideSelector()}
            {/* Reps and Sets */}
            <div className="grid grid-cols-2 gap-3">
              {renderRepsField()}
              {renderSetsField()}
            </div>

            {/* Quick preset buttons for common reps values */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Rychlá volba opakování:</p>
              <div className="flex flex-wrap gap-2">
                {[5, 6, 8, 10, 12, 15, 20].map(reps => (
                  <Button
                    key={reps}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 px-4 text-base font-semibold",
                      form.watch('reps') === reps && "bg-primary/10 border-primary text-primary"
                    )}
                    onClick={() => form.setValue('reps', reps)}
                  >
                    {reps}×
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      default: // 'strength'
        return (
          <div className="space-y-4">
            {renderSideSelector()}
            {/* Weight with quick adjust buttons */}
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4" />
                    Váha (kg)
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(Math.max(0, current - 5));
                        }}
                      >
                        -5
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-10 text-base font-semibold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(Math.max(0, current - 2.5));
                        }}
                      >
                        -2.5
                      </Button>
                    </div>
                    
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        className="text-center text-2xl font-bold h-14 flex-1"
                      />
                    </FormControl>
                    
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-10 text-base font-semibold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(current + 2.5);
                        }}
                      >
                        +2.5
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 text-lg font-bold shrink-0"
                        onClick={() => {
                          const current = field.value || 0;
                          field.onChange(current + 5);
                        }}
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Reps and Sets row */}
            <div className="grid grid-cols-2 gap-3">
              {renderRepsField()}
              {renderSetsField()}
            </div>

            {/* Quick preset buttons for common reps values */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Rychlá volba opakování:</p>
              <div className="flex flex-wrap gap-2">
                {[5, 6, 8, 10, 12, 15, 20].map(reps => (
                  <Button
                    key={reps}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 px-4 text-base font-semibold",
                      form.watch('reps') === reps && "bg-primary/10 border-primary text-primary"
                    )}
                    onClick={() => form.setValue('reps', reps)}
                  >
                    {reps}×
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const renderRepsField = () => (
    <FormField
      control={form.control}
      name="reps"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-1.5">
            <Repeat className="w-4 h-4" />
            Opakování
          </FormLabel>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl shrink-0"
              onClick={() => {
                const current = field.value || 0;
                field.onChange(Math.max(0, current - 1));
              }}
            >
              -
            </Button>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                className="text-center text-xl font-bold h-12"
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl shrink-0"
              onClick={() => {
                const current = field.value || 0;
                field.onChange(current + 1);
              }}
            >
              +
            </Button>
          </div>
        </FormItem>
      )}
    />
  );

  const renderSetsField = () => (
    <FormField
      control={form.control}
      name="sets"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Série</FormLabel>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl shrink-0"
              onClick={() => {
                field.onChange(Math.max(1, field.value - 1));
              }}
            >
              -
            </Button>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="1"
                value={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                className="text-center text-xl font-bold h-12"
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl shrink-0"
              onClick={() => {
                field.onChange(field.value + 1);
              }}
            >
              +
            </Button>
          </div>
        </FormItem>
      )}
    />
  );

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {step === 'select' ? 'Přidat cvik' : selectedExercise?.name_cs || selectedExercise?.name}
            </SheetTitle>
            {step === 'log' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Zpět
              </Button>
            )}
          </div>
        </SheetHeader>

        {step === 'select' ? (
          <div className="flex flex-col h-[calc(100%-60px)]">
            {/* Search */}
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat cvik..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Exercise list */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                <ExerciseList
                  items={organizedExercises.favorites}
                  icon={<Star className="w-3 h-3 text-yellow-500" />}
                  title="Oblíbené"
                />
                <ExerciseList
                  items={organizedExercises.recent}
                  icon={<Clock className="w-3 h-3" />}
                  title="Nedávné"
                />
                <ExerciseList
                  items={organizedExercises.rest}
                  icon={<Dumbbell className="w-3 h-3" />}
                  title="Všechny cviky"
                />
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {renderInputFields()}

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-5 h-5 mr-2" />
                    )}
                    Uložit cvik
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
