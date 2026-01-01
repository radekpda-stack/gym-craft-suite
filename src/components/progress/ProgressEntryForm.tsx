import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Trophy, TrendingUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-time-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const formSchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  exercise_name: z.string().min(1, 'Zadejte název cviku'),
  exercise_id: z.string().optional(),
  date: z.date(),
  sets: z.number().min(1, 'Minimálně 1 série'),
  reps: z.number().nullable(),
  weight_kg: z.number().nullable(),
  is_bodyweight: z.boolean(),
  time_seconds: z.number().nullable(),
  tempo: z.string().nullable(),
  notes: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProgressEntryFormProps {
  onSuccess?: () => void;
}

export function ProgressEntryForm({ onSuccess }: ProgressEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [lastEntryData, setLastEntryData] = useState<{
    weight_kg: number | null;
    suggestedWeight: number | null;
  } | null>(null);
  const { data: clients = [] } = useClients();
  const { exercises } = useExercises();
  const { createEntry, getLastEntry } = useExerciseEntries();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: '',
      exercise_name: '',
      exercise_id: undefined,
      date: new Date(),
      sets: 3,
      reps: null,
      weight_kg: null,
      is_bodyweight: false,
      time_seconds: null,
      tempo: null,
      notes: null,
    },
  });

  const clientId = form.watch('client_id');
  const exerciseName = form.watch('exercise_name');
  const isBodyweight = form.watch('is_bodyweight');
  const currentWeight = form.watch('weight_kg');

  // Filter exercises based on search
  const filteredExercises = exercises.filter(e => 
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    e.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  // Pre-fill with last entry values and calculate suggested weight
  useEffect(() => {
    if (clientId && exerciseName) {
      getLastEntry(clientId, exerciseName).then(lastEntry => {
        if (lastEntry) {
          form.setValue('sets', lastEntry.sets);
          form.setValue('reps', lastEntry.reps);
          form.setValue('is_bodyweight', lastEntry.is_bodyweight ?? false);
          form.setValue('tempo', lastEntry.tempo);
          
          // Pre-fill time_seconds if exists (for cardio exercises)
          if (lastEntry.time_seconds) {
            form.setValue('time_seconds', lastEntry.time_seconds);
          }
          
          // Set last weight and calculate progressive suggestion (+2.5kg)
          const lastWeight = lastEntry.weight_kg;
          const suggested = lastWeight ? lastWeight + 2.5 : null;
          setLastEntryData({
            weight_kg: lastWeight,
            suggestedWeight: suggested,
          });
          
          // Pre-fill with suggested progressive weight
          if (suggested && !lastEntry.is_bodyweight) {
            form.setValue('weight_kg', suggested);
          } else if (lastWeight) {
            form.setValue('weight_kg', lastWeight);
          }
        } else {
          setLastEntryData(null);
        }
      });
    } else {
      setLastEntryData(null);
    }
  }, [clientId, exerciseName]);

  const applySuggestedWeight = () => {
    if (lastEntryData?.suggestedWeight) {
      form.setValue('weight_kg', lastEntryData.suggestedWeight);
    }
  };

  const applyLastWeight = () => {
    if (lastEntryData?.weight_kg) {
      form.setValue('weight_kg', lastEntryData.weight_kg);
    }
  };

  const handleSelectExercise = (exercise: { id: string; name: string }) => {
    form.setValue('exercise_name', exercise.name);
    form.setValue('exercise_id', exercise.id);
    setExerciseSearch(exercise.name);
    setShowExerciseList(false);
  };

  const handleQuickParse = (value: string) => {
    // Parse multiple formats:
    // "Deadlift 5×3 110kg" or "bench press | 3×5 | 80 kg"
    const trimmed = value.trim();
    
    // Try pipe-separated format first
    if (trimmed.includes('|')) {
      const parts = trimmed.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        form.setValue('exercise_name', parts[0]);
        setExerciseSearch(parts[0]);
        
        const setsReps = parts[1].match(/(\d+)[×x](\d+)/);
        if (setsReps) {
          form.setValue('sets', parseInt(setsReps[1]));
          form.setValue('reps', parseInt(setsReps[2]));
        }
        
        if (parts[2]) {
          const weight = parts[2].match(/(\d+(?:\.\d+)?)/);
          if (weight) {
            form.setValue('weight_kg', parseFloat(weight[1]));
          }
        }
      }
      return;
    }
    
    // Try space-separated format: "Deadlift 5×3 110kg"
    // Pattern: exercise name, then sets×reps, then optional weight
    const match = trimmed.match(/^(.+?)\s+(\d+)[×x](\d+)\s*(\d+(?:\.\d+)?)?(?:\s*kg)?$/i);
    if (match) {
      const [, exerciseName, sets, reps, weight] = match;
      form.setValue('exercise_name', exerciseName.trim());
      setExerciseSearch(exerciseName.trim());
      form.setValue('sets', parseInt(sets));
      form.setValue('reps', parseInt(reps));
      if (weight) {
        form.setValue('weight_kg', parseFloat(weight));
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    await createEntry.mutateAsync({
      client_id: values.client_id,
      exercise_id: values.exercise_id || null,
      exercise_name: values.exercise_name,
      date: format(values.date, 'yyyy-MM-dd'),
      sets: values.sets,
      reps: values.reps,
      weight_kg: values.weight_kg,
      is_bodyweight: values.is_bodyweight,
      time_seconds: values.time_seconds,
      tempo: values.tempo,
      notes: values.notes,
      is_pr: false,
    });
    
    form.reset();
    setExerciseSearch('');
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nový záznam
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Nový tréninkový záznam
          </SheetTitle>
          <SheetDescription>
            Rychle zadejte výkon ve formátu: „bench press | 3×5 | 80 kg"
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Quick parse input */}
            <div className="glass-subtle p-3 rounded-lg">
              <Input
                placeholder="Deadlift 5×3 110kg nebo bench press | 3×5 | 80 kg"
                onChange={(e) => handleQuickParse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value;
                    handleQuickParse(value);
                  }
                }}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rychlé zadání: "Deadlift 5×3 110kg" nebo "název | série×opakování | váha"
              </p>
            </div>

            {/* Client selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klient *</FormLabel>
                  <FormControl>
                    <ClientSearchSelect
                      clients={clients}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Vyhledat klienta..."
                      filterArchived
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exercise selection with autocomplete */}
            <FormField
              control={form.control}
              name="exercise_name"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Cvik *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        value={exerciseSearch}
                        onChange={(e) => {
                          setExerciseSearch(e.target.value);
                          field.onChange(e.target.value);
                          setShowExerciseList(true);
                        }}
                        onFocus={() => setShowExerciseList(true)}
                        onBlur={() => {
                          // Delay hiding to allow click on options
                          setTimeout(() => setShowExerciseList(false), 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            field.onChange(exerciseSearch);
                            setShowExerciseList(false);
                          }
                          if (e.key === 'Tab') {
                            field.onChange(exerciseSearch);
                            setShowExerciseList(false);
                          }
                        }}
                        placeholder="Vyhledejte nebo zadejte cvik"
                      />
                      {showExerciseList && exerciseSearch && (
                        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md bg-popover border shadow-lg">
                          {filteredExercises.length > 0 ? (
                            filteredExercises.slice(0, 10).map((exercise) => (
                              <button
                                key={exercise.id}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                                onClick={() => handleSelectExercise(exercise)}
                              >
                                <span className="font-medium">{exercise.name}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {exercise.category}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Cvik nenalezen - bude vytvořen vlastní
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
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
                  <FormControl>
                    <DatePicker
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(dateStr) => {
                        if (dateStr) {
                          field.onChange(new Date(dateStr));
                        }
                      }}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sets and Reps */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série *</FormLabel>
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
              <FormField
                control={form.control}
                name="reps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opakování</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bodyweight toggle and weight */}
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="is_bodyweight"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Vlastní váha</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {!isBodyweight && (
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Váha (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        placeholder="—"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    {/* Progressive weight suggestion */}
                    {lastEntryData && lastEntryData.weight_kg && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={applySuggestedWeight}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            currentWeight === lastEntryData.suggestedWeight
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          +2,5 kg → {lastEntryData.suggestedWeight} kg
                        </button>
                        <button
                          type="button"
                          onClick={applyLastWeight}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            currentWeight === lastEntryData.weight_kg
                              ? "bg-muted text-foreground border border-border"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50"
                          )}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Poslední: {lastEntryData.weight_kg} kg
                        </button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Time input with minutes:seconds format for cardio exercises */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time_seconds"
                render={({ field }) => {
                  const minutes = field.value ? Math.floor(field.value / 60) : '';
                  const seconds = field.value ? field.value % 60 : '';
                  
                  const handleTimeChange = (min: string, sec: string) => {
                    const minNum = parseInt(min) || 0;
                    const secNum = Math.min(59, parseInt(sec) || 0);
                    const totalSeconds = minNum * 60 + secNum;
                    field.onChange(totalSeconds > 0 ? totalSeconds : null);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Čas (min:sek)</FormLabel>
                      <div className="flex gap-1 items-center">
                        <Input
                          type="number"
                          min={0}
                          placeholder="min"
                          value={minutes}
                          onChange={(e) => handleTimeChange(e.target.value, String(seconds || 0))}
                          className="w-16 text-center"
                        />
                        <span className="text-muted-foreground">:</span>
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          placeholder="sek"
                          value={seconds}
                          onChange={(e) => handleTimeChange(String(minutes || 0), e.target.value)}
                          className="w-16 text-center"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="3-1-2-0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámka</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Volitelná poznámka..."
                      className="resize-none"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createEntry.isPending}
              >
                {createEntry.isPending ? 'Ukládám...' : 'Uložit'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
