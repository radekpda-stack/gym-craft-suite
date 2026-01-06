import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { TrainingDetailSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QuickActionsSection } from '@/components/trainings/QuickActionsSection';
import {
  useTrainingSession,
  useUpdateTrainingSession,
  useDeleteTrainingSession,
  useCancelTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useCompleteTrainingAtomic } from '@/hooks/useCompleteTrainingAtomic';

import { useTrainingSessionTags, useUpdateTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { useClient, useClients } from '@/hooks/useClients';
import { useTags } from '@/hooks/useTags';
import { validateTrainingTags } from '@/hooks/useTrainingTagValidation';
import { TrainingDetailView } from '@/components/trainings/TrainingDetailView';
import { 
  ParticipantPaymentCard, 
  ParticipantPayment, 
  IndividualPaymentMethod,
  getDefaultPaymentMethod,
  calculatePaymentSummary,
} from '@/components/trainings/ParticipantPaymentCard';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { TagValidationAlert } from '@/components/trainings/TagValidationAlert';
import { useTrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackRequest } from '@/hooks/useFeedbackLink';
import { useUndoTrainingDelete } from '@/hooks/useUndoActions';
import { useTrainingSummary } from '@/hooks/useTrainingSummary';
import { TrainingSummaryOverlay } from '@/components/trainings/TrainingSummaryOverlay';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function TrainingDetail() {
  const { trackFeature } = useFeatureTracking();
  usePageTracking('training_detail');
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: training, isLoading: trainingLoading } = useTrainingSession(id);
  const { data: client, isLoading: clientLoading } = useClient(training?.client_id);
  const { data: clients = [] } = useClients();
  
  // Get fresh client credit balance - fallback to clients list if single client query not ready
  const clientCreditBalance = client?.credit_balance ?? 
    clients.find(c => c.id === training?.client_id)?.credit_balance ?? 0;
  const { data: trainingTags = [] } = useTrainingSessionTags(id);
  const { data: allTags = [] } = useTags();
  const { data: existingParticipants = [] } = useTrainingParticipants(id);
  const { data: existingFeedback } = useTrainingFeedback(id);
  const { data: feedbackRequest } = useFeedbackRequest(id);
  const updateTraining = useUpdateTrainingSession();
  const deleteTraining = useDeleteTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const completeTrainingAtomic = useCompleteTrainingAtomic();
  const updateTrainingTags = useUpdateTrainingSessionTags();
  const trainingPrices = useTrainingPrices();
  const { registerTrainingDeleteUndo } = useUndoTrainingDelete();
  
  // Submission state for double-submit protection
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tag validation
  const currentTagIds = trainingTags.map(t => t.tag_id);
  const tagValidation = useMemo(() => 
    validateTrainingTags(currentTagIds, allTags), 
    [currentTagIds, allTags]
  );

  // Dialog states
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Complete dialog state - now uses individual payments per participant
  const [completeNotes, setCompleteNotes] = useState('');
  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  
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

  const openCompleteDialog = () => {
    setCompleteNotes(training.notes || '');
    
    // Build participant payments from existing participants or create with primary client
    const participantCount = existingParticipants.length > 0 
      ? existingParticipants.length 
      : (training.participant_count || 1);
    const totalPrice = getTrainingPrice(participantCount, trainingPrices);
    
    let payments: ParticipantPayment[];
    
    if (existingParticipants.length > 0) {
      // Use existing participants with their price shares
      payments = existingParticipants.map(p => {
        const clientData = clients.find(c => c.id === p.client_id);
        const creditBalance = clientData?.credit_balance ?? 0;
        const paymentMode = clientData?.payment_mode;
        
        return {
          client_id: p.client_id,
          client_name: clientData?.name || 'Neznámý',
          price_share: p.price_share,
          payment_method: getDefaultPaymentMethod(paymentMode, creditBalance, p.price_share),
          credit_balance: creditBalance,
          payment_mode: paymentMode,
        };
      });
    } else {
      // Initialize with primary client only
      const primaryClient = clients.find(c => c.id === training.client_id) || client;
      const creditBalance = primaryClient?.credit_balance ?? 0;
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
      
      // Show training summary overlay with celebration
      setCompletedSessionId(training.id);
      setShowSummaryOverlay(true);
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
  
  // Calculate payment summary for display
  const paymentSummary = calculatePaymentSummary(participantPayments);
  
  // Handler to update individual participant payment method
  const handleParticipantPaymentChange = (clientId: string, method: IndividualPaymentMethod) => {
    setParticipantPayments(prev => prev.map(p => 
      p.client_id === clientId ? { ...p, payment_method: method } : p
    ));
  };

  const openCancelDialog = () => {
    setCancelDeductCredit(true);
    setShowCancelDialog(true);
  };

  const handleCancel = async () => {
    const trainingDate = new Date(training.date);
    const hoursUntilTraining = differenceInHours(trainingDate, new Date());
    const isLateCancellation = hoursUntilTraining < 24;

    await cancelTraining.mutateAsync({
      id: training.id,
      client_id: training.client_id,
      participant_count: training.participant_count || 1,
      isLateCancellation,
      trainingPrices,
      deductCredit: cancelDeductCredit,
    });
    
    // Track training cancellation
    trackFeature('training_cancel', 'trainings', {
      metadata: {
        training_id: training.id,
        client_id: training.client_id,
        is_late_cancellation: isLateCancellation,
        deduct_credit: cancelDeductCredit,
      }
    });
    
    setShowCancelDialog(false);
  };

  const getCancelPrice = () => {
    return getTrainingPrice(training.participant_count || 1, trainingPrices);
  };

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Status banner for partial/warning completions */}
      {(training as any).completion_status === 'partial' && (
        <Alert variant="default" className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Trénink byl dokončen s varováním. Zkontrolujte kredit účastníků.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions - Only for scheduled trainings */}
      {training.status === 'scheduled' && (
        <QuickActionsSection
          trainingId={training.id}
          trainingDate={training.date}
          trainingPrice={getTrainingPrice(training.participant_count || 1, trainingPrices)}
          clientName={client?.name || 'Klient'}
          onComplete={openCompleteDialog}
          onCancelWithCredit={async () => {
            setCancelDeductCredit(true);
            await handleCancel();
          }}
          onCancelNoCredit={async () => {
            setCancelDeductCredit(false);
            await handleCancel();
          }}
          onReschedule={async (newDate) => {
            await updateTraining.mutateAsync({
              id: training.id,
              input: { date: newDate.toISOString() },
            });
          }}
          isCompleting={isSubmitting || completeTrainingAtomic.isPending}
          isCanceling={cancelTraining.isPending}
          isRescheduling={updateTraining.isPending}
        />
      )}

      {/* Complete Training Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dokončit trénink</DialogTitle>
            <DialogDescription>
              Zkontrolujte účastníky a způsob platby.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tag validation warning */}
            <TagValidationAlert validation={tagValidation} compact />

            {/* Participant payment cards */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Účastníci ({participantPayments.length})
              </Label>
              {participantPayments.map((participant) => (
                <ParticipantPaymentCard
                  key={participant.client_id}
                  participant={participant}
                  onChange={handleParticipantPaymentChange}
                  disabled={isSubmitting || completeTrainingAtomic.isPending}
                />
              ))}
            </div>

            {/* Payment summary */}
            {paymentSummary.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border space-y-1">
                {paymentSummary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.method} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        {item.label}:
                      </span>
                      <span className="font-medium">
                        {item.total} Kč ({item.count} {item.count === 1 ? 'os.' : 'os.'})
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2 flex items-center justify-between">
                  <span className="font-medium">Celkem:</span>
                  <span className="text-lg font-bold text-primary">{getExpectedPrice()} Kč</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Poznámky (volitelné)</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Poznámky k tréninku..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} disabled={isSubmitting || completeTrainingAtomic.isPending}>
              Zrušit
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={
                !tagValidation.isValid ||
                isSubmitting ||
                completeTrainingAtomic.isPending ||
                participantPayments.length === 0
              }
              title={!tagValidation.isValid ? "Doplňte povinné tagy" : undefined}
            >
              {(isSubmitting || completeTrainingAtomic.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Dokončuji...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Dokončit trénink
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
