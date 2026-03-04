import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { TrainingDetailSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
// QuickActionsSection removed — actions merged into TrainingStatusBar
import {
  useTrainingSession,
  useUpdateTrainingSession,
  useDeleteTrainingSession,
  useCancelTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useCompleteTrainingAtomic } from '@/hooks/useCompleteTrainingAtomic';
import { PreSessionCheckinCard } from '@/components/trainings/PreSessionCheckinCard';

import { useTrainingSessionTags, useUpdateTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices, getTrainingPrice, useAppSettings, TrainingPrices } from '@/hooks/useAppSettings';
import { getEffectiveTrainingPrice } from '@/hooks/usePriceTransition';
import { useClient, useClients } from '@/hooks/useClients';
import { useTags } from '@/hooks/useTags';
import { validateTrainingTags } from '@/hooks/useTrainingTagValidation';
import { TrainingDetailView } from '@/components/trainings/TrainingDetailView';
import { 
  ParticipantPayment, 
  IndividualPaymentMethod,
  getDefaultPaymentMethod,
} from '@/components/trainings/ParticipantPaymentCard';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { useBudgetGroups } from '@/hooks/useClientBudgetGroups';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { TagValidationAlert } from '@/components/trainings/TagValidationAlert';
import { Badge } from '@/components/ui/badge';
import { useTrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useCreditBalanceValue } from '@/hooks/useCreditBalance';
import { useFeedbackRequest } from '@/hooks/useFeedbackLink';
import { useUndoTrainingDelete } from '@/hooks/useUndoActions';
import { useTrainingSummary } from '@/hooks/useTrainingSummary';
import { TrainingSummaryOverlay } from '@/components/trainings/TrainingSummaryOverlay';
import { TrainingStatusBar } from '@/components/trainings/TrainingStatusBar';
import { SmartCompletionSheet } from '@/components/trainings/SmartCompletionSheet';
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
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function TrainingDetail() {
  const { trackFeature } = useFeatureTracking();
  usePageTracking('training_detail');
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Core training data - this is prefetched from AgendaItem
  const { data: training, isLoading: trainingLoading } = useTrainingSession(id);
  
  // Client data - depends on training but prefetched, so should be instant
  const { data: client } = useClient(training?.client_id);
  
  // Get fresh client credit balance from running balance (real-time)
  const clientCreditBalance = useCreditBalanceValue(training?.client_id);
  
  // Related data - all prefetched from AgendaItem hover/touch
  const { data: trainingTags = [] } = useTrainingSessionTags(id);
  const { data: allTags = [] } = useTags();
  const { data: existingParticipants = [] } = useTrainingParticipants(id);
  const { data: budgetGroups = [] } = useBudgetGroups();
  const { data: existingFeedback } = useTrainingFeedback(id);
  const { data: feedbackRequest } = useFeedbackRequest(id);
  
  // Clients list - needed for participant payment dialog (already cached from SchedulePage)
  const { data: clients = [] } = useClients();
  
  // Mutations
  const updateTraining = useUpdateTrainingSession();
  const deleteTraining = useDeleteTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const completeTrainingAtomic = useCompleteTrainingAtomic();
  const updateTrainingTags = useUpdateTrainingSessionTags();
  const trainingPrices = useTrainingPrices();
  const { data: appSettings } = useAppSettings();
  const { registerTrainingDeleteUndo } = useUndoTrainingDelete();
  
  // Submission state for double-submit protection
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tag validation - pass training_type to skip focus requirement for HIIT/cardio etc.
  const currentTagIds = trainingTags.map(t => t.tag_id);
  const tagValidation = useMemo(() => 
    validateTrainingTags(currentTagIds, allTags, training?.training_type), 
    [currentTagIds, allTags, training?.training_type]
  );

  // Dialog states
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Complete dialog state - now uses individual payments per participant
  const [completeNotes, setCompleteNotes] = useState('');
  const [nextSessionFocus, setNextSessionFocus] = useState('');
  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  
  // Dialog-local tag state for inline editing within complete dialog
  const [dialogTagIds, setDialogTagIds] = useState<string[]>([]);
  const [dialogTrainingType, setDialogTrainingType] = useState<string | null>(null);
  
  // Sync dialog tags when dialog opens or currentTagIds changes while dialog is open
  useEffect(() => {
    if (showCompleteDialog && training) {
      setDialogTagIds(currentTagIds);
      setDialogTrainingType(training.training_type || null);
    }
  }, [showCompleteDialog, training?.id, currentTagIds]);
  
  // Validation based on dialog-local tags
  const dialogTagValidation = useMemo(() => 
    validateTrainingTags(dialogTagIds, allTags, dialogTrainingType), 
    [dialogTagIds, allTags, dialogTrainingType]
  );
  
  // Cancel dialog state
  const [cancelDeductCredit, setCancelDeductCredit] = useState(true);
  
  // Summary overlay state
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const { data: trainingSummary } = useTrainingSummary(completedSessionId || undefined, training?.client_id);

  // No longer need auto-enable price split - we always show participants with their payments

  if (trainingLoading) {
    return <TrainingDetailSkeleton />;
  }

  if (!training) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Trénink nenalezen
          </h2>
          <Link to="/schedule" className="text-primary mt-2 inline-block">
            Zpět na rozvrh
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveTraining = async (
    data: { 
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
    },
    tagIds: string[]
  ) => {
    await updateTraining.mutateAsync({
      id: training.id,
      input: {
        date: data.date?.toISOString(),
        duration: data.duration,
        participant_count: data.participant_count,
        notes: data.notes,
        subjective_rating: data.subjective_rating || undefined,
        status: data.status,
        prep_notes: data.prep_notes,
        trainer_went_well: data.trainer_went_well,
        trainer_problems: data.trainer_problems,
        trainer_recommendations: data.trainer_recommendations,
        pain_reported: data.pain_reported,
        pain_notes: data.pain_notes,
      },
      trainingPrices,
    });
    
    await updateTrainingTags.mutateAsync({
      trainingSessionId: training.id,
      tagIds,
    });
  };

  // Handler for inline field updates (auto-save)
  const handleFieldUpdate = async (field: string, value: string | boolean) => {
    await updateTraining.mutateAsync({
      id: training.id,
      input: {
        [field]: value,
      },
    });
  };

  const handleDelete = async () => {
    const result = await deleteTraining.mutateAsync({ id: training.id, captureForUndo: true });
    
    // Register undo if we have the training data
    if (result.trainingData) {
      registerTrainingDeleteUndo(
        {
          client_id: result.trainingData.client_id,
          date: result.trainingData.date,
          duration: result.trainingData.duration,
          notes: result.trainingData.notes,
          status: result.trainingData.status,
          participant_count: result.trainingData.participant_count,
          training_type: result.trainingData.training_type,
          training_goal: result.trainingData.training_goal,
          prep_notes: result.trainingData.prep_notes,
        },
        'Trénink smazán'
      );
    }
    
    navigate('/schedule');
  };

  // Helper: get effective credit balance (shared_balance for budget group members)
  const getEffectiveCreditBalance = (clientId: string): number => {
    // Check if client is in a budget group
    const group = budgetGroups.find(g => 
      g.members.some(m => m.client_id === clientId)
    );
    
    if (group) {
      // Use shared balance from budget group
      return group.shared_balance ?? 0;
    }
    
    // Use individual client credit balance
    const clientData = clients.find(c => c.id === clientId);
    return clientData?.credit_balance ?? 0;
  };

  const openCompleteDialog = () => {
    setCompleteNotes(training.notes || '');
    setNextSessionFocus(training.next_session_focus || '');
    
    // Build participant payments from existing participants or create with primary client
    const participantCount = existingParticipants.length > 0 
      ? existingParticipants.length 
      : (training.participant_count || 1);
    
    // Check for custom pricing (only for single participant)
    const primaryClient = clients.find(c => c.id === training.client_id) || client;
    const hasCustomPrice = participantCount === 1 && primaryClient?.custom_training_price != null;
    
    // Check if primary client uses legacy pricing (price fixation)
    const usesLegacyPricing = Boolean(
      appSettings?.price_transition_enabled &&
      primaryClient?.use_legacy_pricing &&
      primaryClient?.grandfathered_credit !== null
    );
    
    const legacyPrices = appSettings?.legacy_training_prices as TrainingPrices | undefined;
    const currentPrices = appSettings?.training_prices as TrainingPrices | undefined;
    
    const totalPrice = hasCustomPrice 
      ? primaryClient.custom_training_price!
      : getEffectiveTrainingPrice(participantCount, usesLegacyPricing, legacyPrices, currentPrices);
    
    let payments: ParticipantPayment[];
    
    if (existingParticipants.length > 0) {
      // Use existing participants with their price shares
      // Calculate price per person for fallback if price_share is 0
      const pricePerPerson = Math.round(totalPrice / existingParticipants.length);
      
      payments = existingParticipants.map((p, index) => {
        const clientData = clients.find(c => c.id === p.client_id);
        const creditBalance = getEffectiveCreditBalance(p.client_id);
        const paymentMode = clientData?.payment_mode;
        
        // Determine price share:
        // 1. If custom price and single participant, use custom price
        // 2. If stored price_share is valid (> 0), use it
        // 3. Otherwise calculate from total price
        let priceShare: number;
        if (hasCustomPrice && existingParticipants.length === 1) {
          priceShare = totalPrice;
        } else if (p.price_share > 0) {
          priceShare = p.price_share;
        } else {
          // Fallback: distribute total price evenly (last person gets remainder)
          priceShare = index === existingParticipants.length - 1 
            ? totalPrice - (pricePerPerson * (existingParticipants.length - 1))
            : pricePerPerson;
        }
        
        return {
          client_id: p.client_id,
          client_name: clientData?.name || 'Neznámý',
          price_share: priceShare,
          payment_method: getDefaultPaymentMethod(paymentMode, creditBalance, priceShare),
          credit_balance: creditBalance,
          payment_mode: paymentMode,
        };
      });
    } else {
      // Initialize with primary client only
      const creditBalance = getEffectiveCreditBalance(training.client_id);
      const paymentMode = primaryClient?.payment_mode;
      
      payments = [{
        client_id: training.client_id,
        client_name: primaryClient?.name || 'Klient',
        price_share: totalPrice,
        payment_method: getDefaultPaymentMethod(paymentMode, creditBalance, totalPrice),
        credit_balance: creditBalance,
        payment_mode: paymentMode,
      }];
    }
    
    setParticipantPayments(payments);
    setShowCompleteDialog(true);
  };

  const handleComplete = async () => {
    // Prevent double-submit
    if (isSubmitting || completeTrainingAtomic.isPending) return;
    setIsSubmitting(true);
    
    try {
      // Save dialog tags if they changed
      const tagsChanged = dialogTagIds.sort().join(',') !== currentTagIds.sort().join(',');
      if (tagsChanged) {
        await updateTrainingTags.mutateAsync({
          trainingSessionId: training.id,
          tagIds: dialogTagIds,
        });
      }
      
      const participantCount = participantPayments.length;
      const totalPrice = participantPayments.reduce((sum, p) => sum + p.price_share, 0);
      
      // Build participants array with individual payment methods
      const participantsWithPayments = participantPayments.map(p => ({
        client_id: p.client_id,
        price_share: p.price_share,
        payment_method: p.payment_method,
      }));
      
      // Use atomic RPC - single transaction for everything
      await completeTrainingAtomic.mutateAsync({
        sessionId: training.id,
        participants: participantsWithPayments,
        totalPrice,
        notes: completeNotes || undefined,
      });
      
      // Save session_notes and next_session_focus
      if (completeNotes || nextSessionFocus) {
        await updateTraining.mutateAsync({
          id: training.id,
          input: {
            session_notes: completeNotes || null,
            next_session_focus: nextSessionFocus || null,
          },
        });
      }
      
      // Track training completion
      trackFeature('training_complete', 'trainings', {
        metadata: {
          training_id: training.id,
          client_id: training.client_id,
          participant_count: participantCount,
          total_price: totalPrice,
        }
      });
      
      setShowCompleteDialog(false);
      
      // Skip summary overlay, navigate directly to schedule
      navigate('/schedule');
    } catch (error) {
      // Error is already handled in the hook with toast
      console.error('Training completion failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpectedPrice = () => {
    return participantPayments.reduce((sum, p) => sum + p.price_share, 0);
  };
  
  // Total price for status bar
  const statusBarTotalPrice = participantPayments.length > 0
    ? participantPayments.reduce((sum, p) => sum + p.price_share, 0)
    : getTrainingPrice(training.participant_count || 1, trainingPrices);
  
  // Handler to update individual participant payment method
  const handleParticipantPaymentChange = (clientId: string, method: IndividualPaymentMethod) => {
    setParticipantPayments(prev => prev.map(p => 
      p.client_id === clientId ? { ...p, payment_method: method } : p
    ));
  };

  // Handler to update individual participant price share
  const handleParticipantPriceChange = (clientId: string, newPrice: number) => {
    setParticipantPayments(prev => prev.map(p => 
      p.client_id === clientId ? { ...p, price_share: newPrice } : p
    ));
  };

  const openCancelDialog = () => {
    setCancelDeductCredit(true);
    setShowCancelDialog(true);
  };

  // Fixed: Accept deductCredit and optional note as parameters to avoid race condition with setState
  const handleCancelWithDeduct = async (shouldDeductCredit: boolean, note?: string) => {
    const trainingDate = new Date(training.date);
    const hoursUntilTraining = differenceInHours(trainingDate, new Date());
    const isLateCancellation = hoursUntilTraining < 24;

    await cancelTraining.mutateAsync({
      id: training.id,
      client_id: training.client_id,
      participant_count: training.participant_count || 1,
      isLateCancellation,
      trainingPrices,
      deductCredit: shouldDeductCredit,
      cancelNote: note,
    });
    
    // Track training cancellation
    trackFeature('training_cancel', 'trainings', {
      metadata: {
        training_id: training.id,
        client_id: training.client_id,
        is_late_cancellation: isLateCancellation,
        deduct_credit: shouldDeductCredit,
      }
    });
    
    setShowCancelDialog(false);
  };

  const getCancelPrice = () => {
    return getTrainingPrice(training.participant_count || 1, trainingPrices);
  };

  return (
    <div className={cn("space-y-6 animate-fade-in", (training.status === 'scheduled' || training.status === 'in_progress') && "pb-36")}>
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: 'Rozvrh', href: '/schedule' },
          { label: client?.name || format(new Date(training.date), 'd.M.yyyy', { locale: cs }) },
        ]}
      />

      {/* Training Detail View with inline editing */}
      <TrainingDetailView
        training={training}
        client={client || null}
        onSave={handleSaveTraining}
        isLoading={updateTraining.isPending}
        tagIds={trainingTags.map(t => t.tag_id)}
        onDelete={handleDelete}
        isDeleting={deleteTraining.isPending}
        onTagsChange={async (tagIds) => {
          await updateTrainingTags.mutateAsync({
            trainingSessionId: training.id,
            tagIds,
          });
        }}
        onFieldUpdate={handleFieldUpdate}
      />

      {/* Pre-session check-in - only for scheduled or in_progress */}
      {(training.status === 'scheduled' || training.status === 'in_progress') && client && (
        <PreSessionCheckinCard
          sessionId={training.id}
          clientId={training.client_id}
          clientName={client.name}
        />
      )}

      {/* Previous session focus reminder - merged inline, no separate banner */}
      {training.next_session_focus && training.status !== 'completed' && (
        <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">📌 Zaměření z minulého tréninku</p>
          <p className="text-sm text-foreground">{training.next_session_focus}</p>
        </div>
      )}

      {/* Session notes for completed trainings */}
      {training.status === 'completed' && (training.session_notes || training.next_session_focus) && (
        <div className="rounded-2xl p-4 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm space-y-3">
          {training.session_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">📝 Poznámky k tréninku</p>
              <p className="text-sm text-foreground">{training.session_notes}</p>
            </div>
          )}
          {training.next_session_focus && (
            <div>
              <p className="text-xs font-medium text-primary mb-1">📌 Zaměření příštího tréninku</p>
              <p className="text-sm text-foreground">{training.next_session_focus}</p>
            </div>
          )}
        </div>
      )}

      {/* Status banner for partial/warning completions */}
      {(training as any).completion_status === 'partial' && (
        <Alert variant="default" className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Trénink byl dokončen s varováním. Zkontrolujte kredit účastníků.
          </AlertDescription>
        </Alert>
      )}

      <SmartCompletionSheet
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        completionState={{
          tagsReady: dialogTagValidation.isValid,
          rpeSet: training.rpe !== null && training.rpe !== undefined,
          missingTypes: dialogTagValidation.missingTypes,
        }}
        dialogTagIds={dialogTagIds}
        onDialogTagIdsChange={setDialogTagIds}
        dialogTrainingType={dialogTrainingType}
        allTags={allTags.map(t => ({ id: t.id, name: t.name, color: t.color || '#888' }))}
        coachRPE={training.rpe || null}
        onCoachRPEChange={async (rpe) => {
          await handleFieldUpdate('rpe', String(rpe));
        }}
        participantPayments={participantPayments}
        onPaymentMethodChange={handleParticipantPaymentChange}
        onPriceChange={handleParticipantPriceChange}
        notes={completeNotes}
        onNotesChange={setCompleteNotes}
        nextFocus={nextSessionFocus}
        onNextFocusChange={setNextSessionFocus}
        onComplete={handleComplete}
        isSubmitting={isSubmitting || completeTrainingAtomic.isPending}
        canComplete={dialogTagValidation.isValid && participantPayments.length > 0}
      />

      {/* Sticky Status Bar - always visible for scheduled trainings */}
      {(training.status === 'scheduled' || training.status === 'in_progress') && (
        <TrainingStatusBar
          status={training.status}
          tagsReady={tagValidation.isValid}
          rpeSet={training.rpe !== null && training.rpe !== undefined}
          totalPrice={statusBarTotalPrice}
          rpe={training.rpe || null}
          trainingDate={training.date}
          clientName={client?.name || 'Klient'}
          onComplete={openCompleteDialog}
          onStart={async () => {
            await updateTraining.mutateAsync({
              id: training.id,
              input: { status: 'in_progress' },
            });
          }}
          onCancelWithCredit={async (note) => {
            await handleCancelWithDeduct(true, note);
          }}
          onCancelNoCredit={async (note) => {
            await handleCancelWithDeduct(false, note);
          }}
          onReschedule={async (newDate) => {
            await updateTraining.mutateAsync({
              id: training.id,
              input: { date: newDate.toISOString() },
            });
          }}
          isLoading={isSubmitting || completeTrainingAtomic.isPending}
          isCanceling={cancelTraining.isPending}
          isRescheduling={updateTraining.isPending}
        />
      )}

      {/* Cancel Training Dialog - Kept for legacy, Quick Actions handles this now */}
      
      {/* Training Summary Overlay with Celebration */}
      {trainingSummary && (
        <TrainingSummaryOverlay
          open={showSummaryOverlay}
          onClose={() => {
            setShowSummaryOverlay(false);
            setCompletedSessionId(null);
            navigate('/schedule');
          }}
          summary={trainingSummary}
          clientName={client?.name || 'Klient'}
        />
      )}
    </div>
  );
}
