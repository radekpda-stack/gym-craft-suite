/**
 * TrainingDetailView Component
 * 
 * Displays training session information in view mode (read-only) or edit mode.
 * Handles inline editing of training data without page navigation.
 */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  Users,
  Dumbbell,
  Loader2,
  Repeat,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { RatingDisplay, RatingInput } from '@/components/ui/rating-input';
import { TrainingTagsSelector } from '@/components/trainings/TrainingTagsSelector';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
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
import { DateTimePicker } from '@/components/ui/date-time-picker';

const trainingDetailSchema = z.object({
  date: z.date(),
  duration: z.number().min(15).max(240),
  participant_count: z.number().min(1).max(10),
  notes: z.string().optional(),
  subjective_rating: z.number().min(1).max(10).nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'canceled']),
});

type TrainingDetailFormValues = z.infer<typeof trainingDetailSchema>;

interface TrainingDetailViewProps {
  training: TrainingSession;
  client: Client | null;
  onSave: (data: { date?: Date; duration?: number; participant_count?: number; notes?: string; subjective_rating?: number | null; status?: 'scheduled' | 'completed' | 'canceled' }, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  tagIds: string[];
}

const statusColors = {
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels = {
  scheduled: 'Naplánováno',
  completed: 'Dokončeno',
  canceled: 'Zrušeno',
};

export function TrainingDetailView({ 
  training, 
  client, 
  onSave, 
  isLoading,
  tagIds: initialTagIds 
}: TrainingDetailViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);

  const form = useForm<TrainingDetailFormValues>({
    resolver: zodResolver(trainingDetailSchema),
    defaultValues: {
      date: new Date(training.date),
      duration: training.duration,
      participant_count: training.participant_count || 1,
      notes: training.notes || '',
      subjective_rating: training.subjective_rating,
      status: training.status as 'scheduled' | 'completed' | 'canceled',
    },
  });

  // Reset form when training data changes or when exiting edit mode
  useEffect(() => {
    form.reset({
      date: new Date(training.date),
      duration: training.duration,
      participant_count: training.participant_count || 1,
      notes: training.notes || '',
      subjective_rating: training.subjective_rating,
      status: training.status as 'scheduled' | 'completed' | 'canceled',
    });
    setSelectedTagIds(initialTagIds);
  }, [training, form, initialTagIds]);

  /** Handle form submission */
  const handleSubmit = async (data: TrainingDetailFormValues) => {
    await onSave(data, selectedTagIds);
    setIsEditMode(false);
  };

  /** Cancel editing and reset form */
  const handleCancel = () => {
    form.reset();
    setSelectedTagIds(initialTagIds);
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with icon, client name, and edit controls */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {client ? (
            <ClientAvatar name={client.name} size="xl" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {client?.name || 'Trénink'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(training.date), "EEEE d. MMMM yyyy 'v' HH:mm", { locale: cs })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium border',
                  statusColors[training.status as keyof typeof statusColors]
                )}
              >
                {statusLabels[training.status as keyof typeof statusLabels]}
              </span>
              {(training.recurrence_type || training.parent_session_id) && (
                <span className="flex items-center gap-1 text-primary text-sm">
                  <Repeat className="w-4 h-4" />
                  Opakující se
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel buttons */}
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Zrušit
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Uložit
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditMode(true)}
            >
              <Edit2 className="w-4 h-4" />
              Upravit
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date & Time */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Datum a čas</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={(date) => field.onChange(typeof date === 'string' ? new Date(date) : date)}
                        returnString={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div>
                <p className="font-medium text-foreground">
                  {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(training.date), 'HH:mm', { locale: cs })}
                </p>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Délka tréninku</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[30, 45, 60, 75, 90, 120].map((min) => (
                          <SelectItem key={min} value={min.toString()}>
                            {min} minut
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">{training.duration} minut</p>
            )}
          </div>

          {/* Participants */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Počet účastníků</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="participant_count"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osob'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">
                {training.participant_count || 1} {(training.participant_count || 1) === 1 ? 'osoba' : (training.participant_count || 1) < 5 ? 'osoby' : 'osob'}
              </p>
            )}
          </div>

          {/* Rating */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">Hodnocení</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="subjective_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RatingInput
                        value={field.value}
                        onChange={field.onChange}
                        max={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <RatingDisplay value={training.subjective_rating} />
            )}
          </div>
        </div>

        {/* Status & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm font-medium">Stav tréninku</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Naplánováno</SelectItem>
                        <SelectItem value="completed">Dokončeno</SelectItem>
                        <SelectItem value="canceled">Zrušeno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <span
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border inline-block',
                  statusColors[training.status as keyof typeof statusColors]
                )}
              >
                {statusLabels[training.status as keyof typeof statusLabels]}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Tagy</span>
            </div>
            {isEditMode ? (
              <TrainingTagsSelector
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            ) : (
              <TrainingTagsSelector
                selectedTagIds={selectedTagIds}
                onChange={() => {}}
              />
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Poznámky</h3>
          {isEditMode ? (
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Poznámky k tréninku..."
                      className="bg-secondary border-border min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {training.notes || <span className="italic">Žádné poznámky</span>}
            </p>
          )}
        </div>
      </Form>
    </div>
  );
}
