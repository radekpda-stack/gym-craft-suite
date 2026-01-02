/**
 * TrainingDetailView Component - Compact Version
 * 
 * Simplified layout focused on:
 * 1. Compact meta section (date/time, duration)
 * 2. Tags immediately visible
 * 3. Exercises as main content
 * 4. Previous training as collapsible
 * 5. Single optional note with toggle
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Trash2,
  MoreHorizontal,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { TrainingTagsSelector } from '@/components/trainings/TrainingTagsSelector';
import { WorkoutExerciseManager } from '@/components/trainings/WorkoutExerciseManager';
import { TrainingParticipantsManager } from '@/components/trainings/TrainingParticipantsManager';
import { InlineTextarea } from '@/components/trainings/InlineTextarea';
import { PreviousTrainingPreview } from '@/components/trainings/PreviousTrainingPreview';
import { TrainingSession, useChangePaymentMethod } from '@/hooks/useTrainingSessions';
import { Client, useClients } from '@/hooks/useClients';
import { ChangePaymentMethodDialog, PaymentMethod } from '@/components/trainings/ChangePaymentMethodDialog';
import { TrainingStatusBadge } from '@/components/ui/training-status-badge';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFeedbackRequests } from '@/hooks/useFeedbackRequests';
import { ClientProfilePanel } from '@/components/trainings/ClientProfilePanel';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
  participant_count: z.number().min(1).max(5),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'completed', 'canceled']),
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
    status?: 'scheduled' | 'completed' | 'canceled';
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
  const [showNote, setShowNote] = useState(!!training.notes);
  
  const changePaymentMethod = useChangePaymentMethod();
  const { data: settings } = useAppSettings();
  const { data: feedbackRequests = [] } = useFeedbackRequests();
  const { data: allClients = [] } = useClients();
  
  // Get training participants (for group trainings)
  const { data: trainingParticipants = [] } = useTrainingParticipants(training.id);
  
  // Build participants list: if we have training_participants, use them; otherwise use primary client
  const participants = useMemo(() => {
    if (trainingParticipants.length > 0) {
      return trainingParticipants.map(tp => {
        const clientData = allClients.find(c => c.id === tp.client_id);
        return {
          client_id: tp.client_id,
          name: clientData?.name || 'Neznámý klient',
        };
      });
    }
    // Default to primary client if no participants
    if (client) {
      return [{ client_id: client.id, name: client.name }];
    }
    return [{ client_id: training.client_id, name: 'Primární klient' }];
  }, [trainingParticipants, allClients, client, training.client_id]);
  
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
      status: training.status as 'scheduled' | 'completed' | 'canceled',
    });
    setSelectedTagIds(initialTagIds);
    setShowNote(!!training.notes);
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

  const trainingDate = new Date(training.date);

  return (
    <div className="space-y-4">
      {/* COMPACT HEADER with meta info and dropdown menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {client ? (
            <ClientAvatar name={client.name} size="lg" className="shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              {client?.name || 'Trénink'}
            </h1>
            
            {/* Compact meta row - DATE/TIME is key info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                {format(trainingDate, "EEEE d.M.", { locale: cs })}
                <span className="text-primary font-semibold">
                  v {format(trainingDate, "HH:mm")}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {training.duration} min
              </span>
              {participantCount > 1 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {participantCount} {participantCount < 5 ? 'osoby' : 'osob'}
                </span>
              )}
              {(training.recurrence_type || training.parent_session_id) && (
                <span className="flex items-center gap-1 text-primary">
                  <Repeat className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Status badge */}
            <div className="mt-2">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium border inline-block',
                  statusColors[training.status as keyof typeof statusColors]
                )}
              >
                {statusLabels[training.status as keyof typeof statusLabels]}
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown menu with Edit and Delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditMode(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Upravit detaily
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat trénink
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit mode form (collapsible) */}
      {isEditMode && (
        <Form {...form}>
          <div className="glass rounded-xl p-4 space-y-4 border-2 border-primary/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Upravit trénink</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading}>
                  <X className="w-4 h-4 mr-1" />
                  Zrušit
                </Button>
                <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Uložit
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Date/Time */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Datum a čas</Label>
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
              
              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs text-muted-foreground">Délka</Label>
                    <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[30, 45, 60, 75, 90, 120].map((min) => (
                          <SelectItem key={min} value={min.toString()}>{min} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Participants */}
              <FormField
                control={form.control}
                name="participant_count"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs text-muted-foreground">Účastníků</Label>
                    <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      )}

      {/* Client Profile Panel - show restrictions/alerts */}
      {client && <ClientProfilePanel client={client} />}

      {/* PARTICIPANTS - show for scheduled/in_progress trainings */}
      {(training.status === 'scheduled' || training.status === 'in_progress') && (
        <TrainingParticipantsManager
          trainingId={training.id}
          primaryClientId={training.client_id}
          primaryClientName={client?.name || 'Primární klient'}
          currentParticipantCount={training.participant_count || 1}
          isEditable={true}
        />
      )}

      {/* TAGS - immediately after header */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Tagy</span>
        </div>
        <TrainingTagsSelector
          selectedTagIds={selectedTagIds}
          onChange={(newTagIds) => {
            setSelectedTagIds(newTagIds);
            if (!isEditMode && onTagsChange) {
              onTagsChange(newTagIds);
            }
          }}
        />
      </div>

      {/* EXERCISES - main content */}
      <div className="glass rounded-xl p-4">
        <WorkoutExerciseManager
          trainingSessionId={training.id}
          clientId={training.client_id}
          trainingDate={training.date}
          trainingStatus={training.status}
          participants={participants}
        />
      </div>

      {/* PREVIOUS TRAINING - collapsible, no copy function */}
      {training.status === 'scheduled' && (
        <PreviousTrainingPreview clientId={training.client_id} />
      )}

      {/* PAYMENT INFO - only for completed */}
      {training.status === 'completed' && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Platba</span>
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

      {/* SINGLE OPTIONAL NOTE with toggle */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-4 h-4" />
            <Label className="text-sm font-medium cursor-pointer" htmlFor="show-note-toggle">
              Poznámka k tréninku
            </Label>
          </div>
          <Switch 
            id="show-note-toggle"
            checked={showNote} 
            onCheckedChange={(checked) => {
              setShowNote(checked);
              // If turning off and there's a note, clear it
              if (!checked && training.notes && onFieldUpdate) {
                onFieldUpdate('notes', '');
              }
            }}
          />
        </div>
        
        {showNote && onFieldUpdate && (
          <div className="mt-3">
            <InlineTextarea
              initialValue={training.notes || ''}
              onSave={(value) => onFieldUpdate('notes', value)}
              placeholder="Libovolná poznámka k tréninku..."
              minHeight="80px"
            />
          </div>
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
            opened_at: feedbackRequest.opened_at || null,
            reminder_count: feedbackRequest.reminder_count || 0,
          } : undefined}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Smazat trénink?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="text-foreground font-medium">
                  Tato akce je nevratná.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Trénink zmizí z historie a statistik</li>
                  <li>Kredit se <strong>nevrací</strong> – transakce zůstane</li>
                  <li>Záznamy cviků budou ztraceny</li>
                </ul>
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
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
