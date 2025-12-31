import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, Dumbbell, Timer, Loader2, Trophy } from 'lucide-react';
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
import { useClients } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  client_id: z.string().min(1, 'Vyberte klienta'),
  exercise_id: z.string().min(1, 'Vyberte cvik'),
  date: z.date(),
  weight_kg: z.number().nullable(),
  reps: z.number().nullable(),
  sets: z.number().min(1).default(1),
  time_seconds: z.number().nullable(),
  notes: z.string().optional(),
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
      time_seconds: null,
      notes: '',
    },
  });

  // Reset when dialog opens with pre-selected values
  useEffect(() => {
    if (open) {
      form.reset({
        client_id: clientId || '',
        exercise_id: exerciseId || '',
        date: new Date(),
        weight_kg: null,
        reps: null,
        sets: 1,
        time_seconds: null,
        notes: '',
      });
    }
  }, [open, clientId, exerciseId, form]);

  const selectedExercise = exercises.find(e => e.id === form.watch('exercise_id'));
  const isTimeBased = selectedExercise?.is_time_based;
  const isCardio = selectedExercise?.category?.toLowerCase().includes('kardio') || 
                   selectedExercise?.category?.toLowerCase().includes('cardio');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const exercise = exercises.find(e => e.id === data.exercise_id);
      
      await createEntry.mutateAsync({
        client_id: data.client_id,
        exercise_id: data.exercise_id,
        exercise_name: exercise?.name_cs || exercise?.name || '',
        date: format(data.date, 'yyyy-MM-dd'),
        weight_kg: data.weight_kg,
        reps: data.reps,
        sets: data.sets,
        time_seconds: data.time_seconds,
        is_bodyweight: exercise?.is_bodyweight || false,
        tempo: null,
        notes: data.notes || null,
        is_pr: false, // Will be calculated by the mutation
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse time input (mm:ss or just seconds)
  const parseTimeInput = (value: string): number | null => {
    if (!value) return null;
    if (value.includes(':')) {
      const [mins, secs] = value.split(':').map(Number);
      return (mins * 60) + (secs || 0);
    }
    return parseInt(value, 10) || null;
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte klienta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
            {(isTimeBased || isCardio) ? (
              /* Time-based / Cardio */
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="time_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Čas (mm:ss)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="3:45"
                          value={formatTime(field.value)}
                          onChange={(e) => field.onChange(parseTimeInput(e.target.value))}
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
                      <FormLabel>Počet pokusů</FormLabel>
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
