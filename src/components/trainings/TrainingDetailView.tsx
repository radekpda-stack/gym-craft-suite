/**
 * TrainingDetailView Component
 * 
 * Displays training session information in view mode (read-only) or edit mode.
 * Handles inline editing of training data without page navigation.
 * Includes workout exercise management for tracking exercises and sets.
 */
import { useState, useEffect, useCallback } from 'react';
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
  CreditCard,
  ClipboardList,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { RatingDisplay, RatingInput } from '@/components/ui/rating-input';
import { TrainingTagsSelector } from '@/components/trainings/TrainingTagsSelector';
import { WorkoutExerciseManager } from '@/components/trainings/WorkoutExerciseManager';
import { InlineTextarea } from '@/components/trainings/InlineTextarea';
import { TrainingSession, useChangePaymentMethod } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { ChangePaymentMethodDialog, PaymentMethod } from '@/components/trainings/ChangePaymentMethodDialog';
import { TrainingStatusBadge } from '@/components/ui/training-status-badge';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFeedbackRequests } from '@/hooks/useFeedbackRequests';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const trainingDetailSchema = z.object({
  date: z.date(),
  duration: z.number().min(15).max(240),
  participant_count: z.number().min(1).max(10),
  notes: z.string().optional(),
  subjective_rating: z.number().min(1).max(10).nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'canceled']),
  // New fields
  prep_notes: z.string().optional(),
  trainer_went_well: z.string().optional(),
  trainer_problems: z.string().optional(),
  trainer_recommendations: z.string().optional(),
  pain_reported: z.boolean().optional(),
  pain_notes: z.string().optional(),
});

type TrainingDetailFormValues = z.infer<typeof trainingDetailSchema>;

interface TrainingDetailViewProps {
  training: TrainingSession;
  client: Client | null;
  onSave: (data: { 
    date?: Date; 
    duration?: number; 
    participant_count?: number; 
    notes?: string; 
    subjective_rating?: number | null; 
    status?: 'scheduled' | 'completed' | 'canceled';
    prep_notes?: string;
    trainer_went_well?: string;
    trainer_problems?: string;
    trainer_recommendations?: string;
    pain_reported?: boolean;
    pain_notes?: string;
  }, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  tagIds: string[];
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  onTagsChange?: (tagIds: string[]) => Promise<void>;
  onFieldUpdate?: (field: string, value: string | boolean) => Promise<void>;
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
  tagIds: initialTagIds,
  onDelete,
  isDeleting,
  onTagsChange,
  onFieldUpdate,
}: TrainingDetailViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const changePaymentMethod = useChangePaymentMethod();
  const { data: settings } = useAppSettings();
  const { data: feedbackRequests = [] } = useFeedbackRequests();
  const trainingPrices = settings?.training_prices as { "1": number; "2": number; "3": number } || { "1": 800, "2": 1000, "3": 1200 };
  
  // Get feedback request for this training
  const feedbackRequest = feedbackRequests.find(
    fr => fr.training_session_id === training.id && fr.status !== 'cancelled'
  );
  
  // Calculate price for this training
  const participantCount = training.participant_count || 1;
  const trainingPrice = training.final_price || (
    participantCount >= 3 ? trainingPrices["3"] :
    participantCount === 2 ? trainingPrices["2"] :
    trainingPrices["1"]
  );

  const handleChangePaymentMethod = async (newMethod: PaymentMethod) => {
    await changePaymentMethod.mutateAsync({
      trainingId: training.id,
      clientId: training.client_id,
      currentPaymentStatus: training.payment_status,
      newPaymentStatus: newMethod,
      price: trainingPrice,
    });
  };

  const form = useForm<TrainingDetailFormValues>({
    resolver: zodResolver(trainingDetailSchema),
    defaultValues: {
      date: new Date(training.date),
      duration: training.duration,
      participant_count: training.participant_count || 1,
      notes: training.notes || '',
      subjective_rating: training.subjective_rating,
      status: training.status as 'scheduled' | 'completed' | 'canceled',
      // New fields
      prep_notes: training.prep_notes || '',
      trainer_went_well: training.trainer_went_well || '',
      trainer_problems: training.trainer_problems || '',
      trainer_recommendations: training.trainer_recommendations || '',
      pain_reported: training.pain_reported || false,
      pain_notes: training.pain_notes || '',
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
      // New fields
      prep_notes: training.prep_notes || '',
      trainer_went_well: training.trainer_went_well || '',
      trainer_problems: training.trainer_problems || '',
      trainer_recommendations: training.trainer_recommendations || '',
      pain_reported: training.pain_reported || false,
      pain_notes: training.pain_notes || '',
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

  /** Handle delete confirmation */
  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete();
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with icon, client name, and edit controls - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {client ? (
            <ClientAvatar name={client.name} size="lg" className="sm:w-16 sm:h-16" />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
              {client?.name || 'Trénink'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {format(new Date(training.date), "d. MMMM 'v' HH:mm", { locale: cs })}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={cn(
                  'px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium border',
                  statusColors[training.status as keyof typeof statusColors]
                )}
              >
                {statusLabels[training.status as keyof typeof statusLabels]}
              </span>
              {(training.recurrence_type || training.parent_session_id) && (
                <span className="flex items-center gap-1 text-primary text-xs sm:text-sm">
                  <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Opakující se</span>
                </span>
              )}
            </div>
          </div>
        </div>

          {/* Edit/Save/Cancel buttons - Full width on mobile */}
        <div className="flex gap-2 sm:flex-shrink-0">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="gap-2 flex-1 sm:flex-initial h-11 sm:h-10"
              >
                <X className="w-4 h-4" />
                <span>Zrušit</span>
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
                className="gap-2 flex-1 sm:flex-initial h-11 sm:h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Uložit</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="gap-2 h-11 sm:h-10 w-full sm:w-auto"
              onClick={() => setIsEditMode(true)}
            >
              <Edit2 className="w-4 h-4" />
              <span>Upravit</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards - 2 columns on mobile */}
      <Form {...form}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Date & Time */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Datum</span>
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Délka tréninku</span>
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Počet účastníků</span>
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-2">
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Hodnocení</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Status */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-3">
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Stav tréninku</span>
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-3">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Tagy</span>
            </div>
            <TrainingTagsSelector
              selectedTagIds={selectedTagIds}
              onChange={(newTagIds) => {
                setSelectedTagIds(newTagIds);
                // Save tags immediately if not in edit mode
                if (!isEditMode && onTagsChange) {
                  onTagsChange(newTagIds);
                }
              }}
            />
          </div>
        </div>

        {/* Payment Status - Only for completed trainings */}
        {training.status === 'completed' && (
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-2">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Platba</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrainingStatusBadge 
                    status={training.status} 
                    paymentStatus={training.payment_status} 
                  />
                  {training.final_price && (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(training.final_price)}
                    </span>
                  )}
                </div>
              </div>
              <ChangePaymentMethodDialog
                currentPaymentStatus={training.payment_status}
                onChangePaymentMethod={handleChangePaymentMethod}
                isLoading={changePaymentMethod.isPending}
              />
            </div>
          </div>
        )}

        {/* PREP NOTES Section - Before training - ALWAYS EDITABLE */}
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-3">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Příprava na trénink</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Poznámky pro přípravu tréninku (cíle, zaměření, na co se soustředit)
          </p>
          {onFieldUpdate ? (
            <InlineTextarea
              initialValue={training.prep_notes || ''}
              onSave={(value) => onFieldUpdate('prep_notes', value)}
              placeholder="Co je cílem dnešního tréninku? Na co se zaměřit?"
              minHeight="80px"
            />
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {training.prep_notes || <span className="italic">Žádné poznámky k přípravě</span>}
            </p>
          )}
        </div>

        {/* WORKOUT Section */}
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <WorkoutExerciseManager
            trainingSessionId={training.id}
            clientId={training.client_id}
            trainingDate={training.date}
            trainingStatus={training.status}
          />
        </div>

        {/* SUMMARY Section - After training - ALWAYS EDITABLE */}
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground mb-1">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Shrnutí po tréninku</h3>
          </div>

          {/* What went well */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-success">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">Co šlo dobře</span>
            </div>
            {onFieldUpdate ? (
              <InlineTextarea
                initialValue={training.trainer_went_well || ''}
                onSave={(value) => onFieldUpdate('trainer_went_well', value)}
                placeholder="Cviky, techniky, pokroky..."
                minHeight="60px"
              />
            ) : (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap pl-6">
                {training.trainer_went_well || <span className="italic">Nezadáno</span>}
              </p>
            )}
          </div>

          {/* Problems */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-warning">
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm font-medium">Co nešlo / na čem pracovat</span>
            </div>
            {onFieldUpdate ? (
              <InlineTextarea
                initialValue={training.trainer_problems || ''}
                onSave={(value) => onFieldUpdate('trainer_problems', value)}
                placeholder="Problémy, slabiny, omezení..."
                minHeight="60px"
              />
            ) : (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap pl-6">
                {training.trainer_problems || <span className="italic">Nezadáno</span>}
              </p>
            )}
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Doporučení pro další trénink</span>
            </div>
            {onFieldUpdate ? (
              <InlineTextarea
                initialValue={training.trainer_recommendations || ''}
                onSave={(value) => onFieldUpdate('trainer_recommendations', value)}
                placeholder="Doporučení, tipy, úpravy pro příště..."
                minHeight="60px"
              />
            ) : (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap pl-6">
                {training.trainer_recommendations || <span className="italic">Nezadáno</span>}
              </p>
            )}
          </div>

          {/* Pain reporting - ALWAYS EDITABLE */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Hlášená bolest</span>
              </div>
              {onFieldUpdate ? (
                <Switch
                  checked={training.pain_reported || false}
                  onCheckedChange={(checked) => onFieldUpdate('pain_reported', checked)}
                />
              ) : (
                <span className={cn(
                  "text-sm font-medium",
                  training.pain_reported ? "text-destructive" : "text-muted-foreground"
                )}>
                  {training.pain_reported ? "Ano" : "Ne"}
                </span>
              )}
            </div>
            {training.pain_reported && (
              <div className="pl-6">
                {onFieldUpdate ? (
                  <InlineTextarea
                    initialValue={training.pain_notes || ''}
                    onSave={(value) => onFieldUpdate('pain_notes', value)}
                    placeholder="Popis bolesti - kde, kdy, intenzita..."
                    minHeight="60px"
                  />
                ) : (
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {training.pain_notes || <span className="italic">Bez popisu</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* General Notes Section - ALWAYS EDITABLE */}
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Poznámky</h3>
          {onFieldUpdate ? (
            <InlineTextarea
              initialValue={training.notes || ''}
              onSave={(value) => onFieldUpdate('notes', value)}
              placeholder="Další poznámky k tréninku..."
              minHeight="100px"
            />
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {training.notes || <span className="italic">Žádné poznámky</span>}
            </p>
          )}
        </div>

        {/* Feedback Section - Only for completed trainings */}
        {training.status === 'completed' && client && (
          <TrainingFeedbackSection
            trainingId={training.id}
            trainingDate={training.date}
            trainingStatus={training.status}
            clientId={client.id}
            clientName={client.name}
            feedbackEnabled={client.feedback_enabled !== false}
            existingFeedback={feedbackRequest?.status === 'completed'}
            feedbackRequest={feedbackRequest ? {
              id: feedbackRequest.id,
              token: feedbackRequest.token,
              status: feedbackRequest.status,
              expires_at: feedbackRequest.expires_at,
              sent_at: feedbackRequest.sent_at,
              reminder_count: feedbackRequest.reminder_count || 0,
            } : undefined}
          />
        )}

        {/* Delete Training Section */}
        {onDelete && (
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5 border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Nebezpečná zóna
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Trvale smazat tento trénink a všechna související data
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Smazat trénink
              </Button>
            </div>
          </div>
        )}
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Smazat trénink?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p className="text-foreground font-medium">
                  Tato akce je NEVRATNÁ a ovlivní:
                </p>
                
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="text-lg">📊</div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Historii tréninků</p>
                      <p className="text-muted-foreground text-sm">
                        Trénink zmizí z historie klienta. Statistiky (počet tréninků, frekvence) budou přepočítány.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="text-lg">💰</div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Kreditový systém</p>
                      <p className="text-muted-foreground text-sm">
                        Transakce spojené s tímto tréninkem ZŮSTANOU v historii. Kredit NEBUDE automaticky vrácen - pro opravu použijte manuální transakci.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="text-lg">🏋️</div>
                    <div>
                      <p className="font-medium text-foreground text-sm">Data cvičení</p>
                      <p className="text-muted-foreground text-sm">
                        Všechny záznamy cviků a sérií budou smazány. Případné osobní rekordy budou ztraceny.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm italic">
                  Opravdu chcete pokračovat?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Smazat trénink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
