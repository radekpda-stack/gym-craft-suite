/**
 * TrainingDetailView Component - Redesigned "Training Cockpit"
 * 
 * 3-zone layout:
 * 1. Hero Header (compact meta + tags)
 * 2. Prep Section (alerts, followups, previous training) - scheduled only
 * 3. Exercises (main stage)
 * 4. Close Section (payment, notes, followups, feedback) - completed only
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  X,
  Save,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTags } from '@/hooks/useTags';
import { TrainingSession, useChangePaymentMethod } from '@/hooks/useTrainingSessions';
import { Client, useClients } from '@/hooks/useClients';
import { PaymentMethod } from '@/components/trainings/ChangePaymentMethodDialog';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFeedbackRequests } from '@/hooks/useFeedbackRequests';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { cn } from '@/lib/utils';
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

// New redesigned components
import { TrainingHeroHeader } from './TrainingHeroHeader';
import { TrainingPrepSection } from './TrainingPrepSection';
import { TrainingCloseSection } from './TrainingCloseSection';
import { CompactTagGridSelector } from './CompactTagGridSelector';
import { WorkoutExerciseManager } from './WorkoutExerciseManager';
import { TrainingParticipantsManager } from './TrainingParticipantsManager';
import { ParticipantsPRsSection } from './ParticipantsPRsSection';
import { TrainingQuickSale } from './TrainingQuickSale';
import { PreviousTrainingSummary } from './PreviousTrainingSummary';
import { InlineTextarea } from './InlineTextarea';

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
  const [coachRPE, setCoachRPE] = useState<number | null>(training.rpe || null);
  
  // Debounce ref for tag saves
  const tagSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced tag save function
  const debouncedSaveTags = useCallback((newTagIds: string[]) => {
    if (tagSaveTimeoutRef.current) {
      clearTimeout(tagSaveTimeoutRef.current);
    }
    tagSaveTimeoutRef.current = setTimeout(() => {
      if (onTagsChange) {
        onTagsChange(newTagIds);
      }
    }, 800);
  }, [onTagsChange]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tagSaveTimeoutRef.current) {
        clearTimeout(tagSaveTimeoutRef.current);
      }
    };
  }, []);
  
  const { data: tags = [] } = useTags();
  
  // Split tags by type for stepper
  const focusTagIds = selectedTagIds.filter(id => {
    const tag = tags.find(t => t.id === id);
    return tag?.tag_type === 'focus';
  });
  const intensityTagId = selectedTagIds.find(id => {
    const tag = tags.find(t => t.id === id);
    return tag?.tag_type === 'intensity';
  }) || null;
  const bodyPartTagIds = selectedTagIds.filter(id => {
    const tag = tags.find(t => t.id === id);
    return tag?.tag_type === 'body_part';
  });
  
  const changePaymentMethod = useChangePaymentMethod();
  const { data: settings } = useAppSettings();
  const { data: feedbackRequests = [] } = useFeedbackRequests();
  const { data: allClients = [] } = useClients();
  
  // Get training participants
  const { data: trainingParticipants = [] } = useTrainingParticipants(training.id);
  
  // Build participants list
  const participants = useMemo(() => {
    if (trainingParticipants.length > 0) {
      return trainingParticipants.map(tp => {
        const clientData = allClients.find(c => c.id === tp.client_id);
        return {
          client_id: tp.client_id,
          name: clientData?.name || 'Neznámý klient',
          email: clientData?.email,
          feedback_enabled: clientData?.feedback_enabled !== false,
        };
      });
    }
    if (client) {
      return [{ 
        client_id: client.id, 
        name: client.name,
        email: client.email,
        feedback_enabled: client.feedback_enabled !== false,
      }];
    }
    return [{ client_id: training.client_id, name: 'Primární klient' }];
  }, [trainingParticipants, allClients, client, training.client_id]);
  
  const trainingPrices = settings?.training_prices as { "1": number; "2": number; "3": number } || { "1": 900, "2": 1100, "3": 1300 };
  
  // Get feedback request for this training
  const feedbackRequest = feedbackRequests.find(
    fr => fr.training_session_id === training.id && fr.status !== 'cancelled'
  );
  
  // Calculate price
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

  // Reset form when training data changes
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

  const handleSubmit = async (data: TrainingDetailFormValues) => {
    await onSave(data, selectedTagIds);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    form.reset();
    setSelectedTagIds(initialTagIds);
    setIsEditMode(false);
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete();
    }
    setShowDeleteDialog(false);
  };

  const isScheduled = training.status === 'scheduled';
  const isInProgress = training.status === 'in_progress';
  const isCompleted = training.status === 'completed';
  const isCanceled = training.status === 'canceled';

  return (
    <div className="space-y-2">
      {/* HERO + TAGS — merged card */}
      <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm">
        <TrainingHeroHeader
          training={training}
          client={client}
          participantCount={participantCount}
          onEditClick={() => setIsEditMode(true)}
          onDeleteClick={onDelete ? () => setShowDeleteDialog(true) : undefined}
        />
        <div className="px-3 pb-3">
          <CompactTagGridSelector
          trainingType={training.training_type}
          onTrainingTypeChange={async (type) => {
            if (onFieldUpdate) {
              await onFieldUpdate('training_type', type);
            }
          }}
          focusTagIds={focusTagIds}
          onFocusTagsChange={(ids) => {
            const validIds = ids.filter(id => tags.some(t => t.id === id));
            const otherTags = selectedTagIds.filter(id => {
              const tag = tags.find(t => t.id === id);
              return tag && tag.tag_type !== 'focus';
            });
            const newTagIds = [...otherTags, ...validIds];
            setSelectedTagIds(newTagIds);
            debouncedSaveTags(newTagIds);
          }}
          bodyPartTagIds={bodyPartTagIds}
          onBodyPartTagsChange={(ids) => {
            const validIds = ids.filter(id => tags.some(t => t.id === id));
            const otherTags = selectedTagIds.filter(id => {
              const tag = tags.find(t => t.id === id);
              return tag && tag.tag_type !== 'body_part';
            });
            const newTagIds = [...otherTags, ...validIds];
            setSelectedTagIds(newTagIds);
            debouncedSaveTags(newTagIds);
          }}
          coachRPE={coachRPE}
          onCoachRPEChange={async (rpe) => {
            setCoachRPE(rpe);
            if (onFieldUpdate) {
              await onFieldUpdate('rpe', String(rpe));
            }
          }}
          trainingStatus={training.status as 'scheduled' | 'completed' | 'canceled'}
        />
        </div>
      </div>

      {/* INLINE NOTES - for scheduled/in_progress, above exercises for visibility */}
      {(isScheduled || isInProgress) && onFieldUpdate && (
        <div className="rounded-xl bg-secondary/40 border border-border/30 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">📝 Poznámky k tréninku</p>
          <InlineTextarea
            initialValue={training.notes || ''}
            onSave={async (value) => {
              await onFieldUpdate('notes', value);
            }}
            placeholder="Poznámky pro tento nebo příští trénink..."
            minHeight="50px"
          />
        </div>
      )}

      {/* EXERCISES - main content */}
      <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm p-3">
        <WorkoutExerciseManager
          trainingSessionId={training.id}
          clientId={training.client_id}
          trainingDate={training.date}
          trainingStatus={training.status}
          participants={participants}
        />
      </div>

      {/* PREVIOUS TRAINING - collapsible, below exercises */}
      {(isScheduled || isInProgress) && (
        <PreviousTrainingSummary clientId={training.client_id} />
      )}

      {/* PREP SECTION - collapsed by default, only for scheduled/in_progress */}
      {(isScheduled || isInProgress) && (
        <TrainingPrepSection
          client={client}
          clientId={training.client_id}
          currentTrainingId={training.id}
          trainingDate={training.date.split('T')[0]}
        />
      )}

      {/* PARTICIPANTS - for scheduled/in_progress */}
      {(isScheduled || isInProgress) && (
        <TrainingParticipantsManager
          trainingId={training.id}
          primaryClientId={training.client_id}
          primaryClientName={client?.name || 'Primární klient'}
          currentParticipantCount={training.participant_count || 1}
          isEditable={true}
        />
      )}

      {/* PARTICIPANTS PRs - for scheduled/in_progress */}
      {(isScheduled || isInProgress) && participants.length > 0 && (
        <ParticipantsPRsSection participants={participants} />
      )}

      {/* QUICK SALE - for scheduled/in_progress */}
      {(isScheduled || isInProgress) && participants.length > 0 && (
        <TrainingQuickSale
          trainingId={training.id}
          participants={participants}
          primaryClientId={training.client_id}
        />
      )}

      {/* CLOSE SECTION - only for completed */}
      {isCompleted && (
        <TrainingCloseSection
          training={training}
          client={client}
          trainingPrice={trainingPrice}
          participants={participants}
          feedbackRequest={feedbackRequest ? {
            id: feedbackRequest.id,
            token: feedbackRequest.token,
            status: feedbackRequest.status,
            expires_at: feedbackRequest.expires_at,
            sent_at: feedbackRequest.sent_at,
            opened_at: feedbackRequest.opened_at || null,
            reminder_count: feedbackRequest.reminder_count || 0,
          } : undefined}
          onChangePaymentMethod={handleChangePaymentMethod}
          isChangingPayment={changePaymentMethod.isPending}
          onFieldUpdate={onFieldUpdate ? (field, value) => onFieldUpdate(field, value) : undefined}
          showNote={showNote}
          onShowNoteChange={setShowNote}
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
