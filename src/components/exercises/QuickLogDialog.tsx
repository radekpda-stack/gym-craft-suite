import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, Dumbbell, Timer, Loader2, Trophy, ChevronDown, Zap, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { TimeInputSimple } from '@/components/ui/time-input-simple';
import { useClients } from '@/hooks/useClients';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { cn } from '@/lib/utils';
import { detectExerciseMetricCategory, getRpeBgColor } from '@/lib/exerciseMetrics';

const formSchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  exercise_id: z.string().min(1, 'Vyberte cvik'),
  date: z.date(),
  weight_kg: z.number().nullable(),
  reps: z.number().nullable(),
  sets: z.number().min(1).default(1),
  time_ms: z.number().nullable(),
  notes: z.string().optional(),
  // Extended metrics
  distance_meters: z.number().nullable().optional(),
  avg_watts: z.number().nullable().optional(),
  max_watts: z.number().nullable().optional(),
  pace_sec_per_500m: z.number().nullable().optional(),
  pace_sec_per_km: z.number().nullable().optional(),
  cadence_spm: z.number().nullable().optional(),
  strokes: z.number().nullable().optional(),
  incline_percent: z.number().nullable().optional(),
  avg_speed_kmh: z.number().nullable().optional(),
  calories_kcal: z.number().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  level: z.number().nullable().optional(),
  resistance: z.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuickLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId?: string | null;
  clientId?: string | null;
}

export function QuickLogDialog({ 
  open, 
  onOpenChange, 
  exerciseId = null, 
  clientId = null 
}: QuickLogDialogProps) {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { exercises } = useExercises();
  const { createEntry } = useExerciseEntries();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeClients = clients.filter(c => !c.is_archived);
  const activeExercises = exercises.filter(e => !e.is_archived);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: clientId || '',
      exercise_id: exerciseId || '',
      date: new Date(),
      weight_kg: null,
      reps: null,
      sets: 1,
      time_ms: null,
      notes: '',
      distance_meters: null,
      avg_watts: null,
      max_watts: null,
      pace_sec_per_500m: null,
      pace_sec_per_km: null,
      cadence_spm: null,
      strokes: null,
      incline_percent: null,
      avg_speed_kmh: null,
      calories_kcal: null,
      rpe: null,
      level: null,
      resistance: null,
    },
  });

  // Reset when dialog opens with pre-selected values
  useEffect(() => {
    if (open) {
      const selectedExercise = exercises.find(e => e.id === exerciseId);
      const category = selectedExercise 
        ? detectExerciseMetricCategory(selectedExercise.name_cs || selectedExercise.name || '', selectedExercise.category)
        : 'strength';
      
      // Set default distance for rower/skierg
      let defaultDistance: number | null = null;
      if (category === 'rower' || category === 'skierg') {
        defaultDistance = 500;
      }
      
      form.reset({
        client_id: clientId || '',
        exercise_id: exerciseId || '',
        date: new Date(),
        weight_kg: null,
        reps: null,
        sets: 1,
        time_ms: null,
        notes: '',
        distance_meters: defaultDistance,
        avg_watts: null,
        max_watts: null,
        pace_sec_per_500m: null,
        pace_sec_per_km: null,
        cadence_spm: null,
        strokes: null,
        incline_percent: null,
        avg_speed_kmh: null,
        calories_kcal: null,
        rpe: null,
        level: null,
        resistance: null,
      });
      setShowAdvanced(false);
    }
  }, [open, clientId, exerciseId, form, exercises]);

  const selectedExercise = exercises.find(e => e.id === form.watch('exercise_id'));
  const isTimeBased = selectedExercise?.is_time_based;
  const isCardio = selectedExercise?.category?.toLowerCase().includes('kardio') || 
                   selectedExercise?.category?.toLowerCase().includes('cardio');
  
  const exerciseCategory = selectedExercise 
    ? detectExerciseMetricCategory(selectedExercise.name_cs || selectedExercise.name || '', selectedExercise.category)
    : 'strength';

  const showCardioMetrics = exerciseCategory !== 'strength';
  const rpeValue = form.watch('rpe');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const exercise = exercises.find(e => e.id === data.exercise_id);
      
      // Auto-calculate pace if we have time and distance
      let pace500m = data.pace_sec_per_500m;
      let paceKm = data.pace_sec_per_km;
      
      // Convert ms to seconds for pace calculation and storage
      const timeSeconds = data.time_ms ? Math.round(data.time_ms / 1000) : null;
      
      if (data.time_ms && data.distance_meters && !pace500m && !paceKm) {
        if (exerciseCategory === 'rower' || exerciseCategory === 'skierg') {
          pace500m = (data.time_ms / 1000 / data.distance_meters) * 500;
        } else if (exerciseCategory === 'treadmill') {
          paceKm = (data.time_ms / 1000 / data.distance_meters) * 1000;
        }
      }
      
      await createEntry.mutateAsync({
        client_id: data.client_id,
        exercise_id: data.exercise_id,
        exercise_name: exercise?.name_cs || exercise?.name || '',
        date: format(data.date, 'yyyy-MM-dd'),
        weight_kg: data.weight_kg,
        reps: data.reps,
        sets: data.sets,
        time_seconds: timeSeconds,
        time_ms: data.time_ms,
        is_bodyweight: exercise?.is_bodyweight || false,
        tempo: null,
        notes: data.notes || null,
        is_pr: false,
        // Extended metrics
        distance_meters: data.distance_meters ?? null,
        avg_watts: data.avg_watts ?? null,
        max_watts: data.max_watts ?? null,
        pace_sec_per_500m: pace500m != null ? Math.round(pace500m) : null,
        pace_sec_per_km: paceKm != null ? Math.round(paceKm) : null,
        cadence_spm: data.cadence_spm ?? null,
        strokes: data.strokes ?? null,
        incline_percent: data.incline_percent ?? null,
        avg_speed_kmh: data.avg_speed_kmh ?? null,
        calories_kcal: data.calories_kcal ?? null,
        rpe: data.rpe ?? null,
        level: data.level ?? null,
        resistance: data.resistance ?? null,
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Zapsat výkon
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klient *</FormLabel>
                  <FormControl>
                    <ClientSearchSelect
                      clients={activeClients}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Vyberte klienta"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exercise Selection */}
            <FormField
              control={form.control}
              name="exercise_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cvik *</FormLabel>
                  <Select value={field.value} onValueChange={(val) => {
                    field.onChange(val);
                    // Update default distance when exercise changes
                    const newExercise = exercises.find(e => e.id === val);
                    if (newExercise) {
                      const newCategory = detectExerciseMetricCategory(
                        newExercise.name_cs || newExercise.name || '', 
                        newExercise.category
                      );
                      if (newCategory === 'rower' || newCategory === 'skierg') {
                        form.setValue('distance_meters', 500);
                      } else {
                        form.setValue('distance_meters', null);
                      }
                    }
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte cvik" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeExercises.map(exercise => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.name_cs || exercise.name}
                          {exercise.is_time_based && (
                            <Badge variant="secondary" className="ml-2 text-xs">čas</Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'd. MMMM yyyy', { locale: cs }) : 'Vyberte datum'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={cs}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metrics - conditional based on exercise type */}
            {(isTimeBased || isCardio || showCardioMetrics) ? (
              /* Time-based / Cardio */
              <div className="space-y-4">
                {/* Time input - full width for better mobile UX */}
                <FormField
                  control={form.control}
                  name="time_ms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Čas *
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
                
                {/* Distance */}
                <FormField
                  control={form.control}
                  name="distance_meters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vzdálenost (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="500"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* RPE Slider */}
                <FormField
                  control={form.control}
                  name="rpe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          RPE (vnímaná náročnost)
                        </span>
                        {field.value && (
                          <Badge className={cn('text-xs', getRpeBgColor(field.value))}>
                            {field.value}/10
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={field.value ? [field.value] : [5]}
                          onValueChange={([val]) => field.onChange(val)}
                          className="py-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Lehké</span>
                        <span>Maximální</span>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Advanced Metrics Collapsible */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Rozšířené metriky
                      </span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* Power metrics */}
                    {(exerciseCategory === 'rower' || exerciseCategory === 'skierg' || exerciseCategory === 'bike') && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="avg_watts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prům. výkon (W)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="180"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="max_watts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max. výkon (W)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="250"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Cadence / Strokes */}
                    {(exerciseCategory === 'rower' || exerciseCategory === 'skierg') && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cadence_spm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kadence (spm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="28"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="strokes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Záběry</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="45"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Treadmill specific */}
                    {exerciseCategory === 'treadmill' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="avg_speed_kmh"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rychlost (km/h)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="10.5"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="incline_percent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sklon (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.5"
                                  placeholder="2.0"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* SkiErg specific */}
                    {exerciseCategory === 'skierg' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Úroveň (1-10)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  placeholder="5"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="resistance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Odpor (0-3)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={3}
                                  placeholder="-"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Calories for all cardio */}
                    <FormField
                      control={form.control}
                      name="calories_kcal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kalorie (kcal)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="85"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              /* Strength */
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        Váha (kg)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="80"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opakování</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="10"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Série</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámka</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Volitelná poznámka k výkonu..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Uložit výkon
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
