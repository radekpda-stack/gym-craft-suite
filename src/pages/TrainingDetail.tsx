import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { TrainingDetailSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QuickActionsSection } from '@/components/trainings/QuickActionsSection';
import {
  useTrainingSession,
  useUpdateTrainingSession,
  useDeleteTrainingSession,
  useCancelTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useCompleteTrainingAtomic } from '@/hooks/useCompleteTrainingAtomic';
import { TrainingTypeSelector } from '@/components/trainings/TrainingTypeSelector';
import { useTrainingSessionTags, useUpdateTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { useClient, useClients } from '@/hooks/useClients';
import { useTags } from '@/hooks/useTags';
import { validateTrainingTags } from '@/hooks/useTrainingTagValidation';
import { TrainingDetailView } from '@/components/trainings/TrainingDetailView';
import { PriceSplitManager, ParticipantShare } from '@/components/trainings/PriceSplitManager';
import { PaymentMethodSelector, PaymentOption, getPaymentMethodFromOption, PartialPaymentMethod } from '@/components/trainings/PaymentMethodSelector';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  
  // Complete dialog state
  const [completeParticipants, setCompleteParticipants] = useState(1);
  const [completeNotes, setCompleteNotes] = useState('');
  const [participantShares, setParticipantShares] = useState<ParticipantShare[]>([]);
  const [usePriceSplit, setUsePriceSplit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('credit');
  const [partialPaymentMethod, setPartialPaymentMethod] = useState<PartialPaymentMethod>('cash');
  const [completeTrainingType, setCompleteTrainingType] = useState<string>('strength');
  
  // Cancel dialog state
  const [cancelDeductCredit, setCancelDeductCredit] = useState(true);
  
  // Summary overlay state
  const [showSummaryOverlay, setShowSummaryOverlay] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const { data: trainingSummary } = useTrainingSummary(completedSessionId || undefined, training?.client_id);

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
          <Link to="/trainings" className="text-primary mt-2 inline-block">
            Zpět na seznam tréninků
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
    
    navigate('/trainings');
  };

  const openCompleteDialog = () => {
    const participantCount = training.participant_count || 1;
    setCompleteParticipants(participantCount);
    setCompleteNotes(training.notes || '');
    setUsePriceSplit(existingParticipants.length > 0 || participantCount > 1);
    setPaymentMethod('credit');
    setCompleteTrainingType(training.training_type || 'strength');
    
    // Initialize participant shares
    const totalPrice = getTrainingPrice(participantCount, trainingPrices);
    if (existingParticipants.length > 0) {
      // Use existing participants
      setParticipantShares(existingParticipants.map(p => {
        const clientData = clients.find(c => c.id === p.client_id);
        return {
          client_id: p.client_id,
          client_name: clientData?.name || 'Neznámý',
          price_share: p.price_share,
          percentage: totalPrice > 0 ? (p.price_share / totalPrice) * 100 : 0,
        };
      }));
    } else {
      // Initialize with primary client
      setParticipantShares([{
        client_id: training.client_id,
        client_name: client?.name || 'Klient',
        price_share: totalPrice,
        percentage: 100,
      }]);
    }
    setShowCompleteDialog(true);
  };

  const handleComplete = async () => {
    // Prevent double-submit
    if (isSubmitting || completeTrainingAtomic.isPending) return;
    setIsSubmitting(true);
    
    try {
      const participantCount = usePriceSplit ? participantShares.length : completeParticipants;
      const paymentMethodValue = getPaymentMethodFromOption(paymentMethod);
      
      // Calculate the correct price for this participant count
      const correctPrice = getTrainingPrice(participantCount, trainingPrices);
      
      // Build normalized participants array
      let normalizedParticipants: Array<{ client_id: string; price_share: number }>;
      
      if (usePriceSplit && participantShares.length > 1) {
        // Normalize participant shares to match the correct price
        const currentSum = participantShares.reduce((sum, p) => sum + p.price_share, 0);
        normalizedParticipants = currentSum !== correctPrice
          ? participantShares.map(p => ({
              client_id: p.client_id,
              price_share: Math.round((p.price_share / currentSum) * correctPrice),
            }))
          : participantShares.map(p => ({
              client_id: p.client_id,
              price_share: p.price_share,
            }));
      } else {
        // Single client - full price
        normalizedParticipants = [{
          client_id: training.client_id,
          price_share: correctPrice,
        }];
      }
      
      // Check if using partial credit (hybrid payment)
      const isPartialCredit = paymentMethod === 'credit_partial';
      const creditToUse = isPartialCredit ? Math.min(clientCreditBalance, correctPrice) : 0;
      
      // Update training type if changed
      if (completeTrainingType !== training.training_type) {
        await updateTraining.mutateAsync({
          id: training.id,
          input: { training_type: completeTrainingType },
        });
      }
      
      // Use atomic RPC - single transaction for everything
      await completeTrainingAtomic.mutateAsync({
        sessionId: training.id,
        participants: normalizedParticipants,
        paymentMethod: isPartialCredit ? 'credit' : (paymentMethodValue as 'credit' | 'cash' | 'card' | 'bank' | 'pending'),
        totalPrice: correctPrice,
        notes: completeNotes || undefined,
        // Hybrid payment params
        usePartialCredit: isPartialCredit,
        partialCreditAmount: isPartialCredit ? creditToUse : undefined,
        partialPaymentMethod: isPartialCredit ? (partialPaymentMethod === 'later' ? 'pending' : partialPaymentMethod) : undefined,
        partialAmountPending: isPartialCredit && partialPaymentMethod === 'later' ? (correctPrice - creditToUse) : undefined,
      });
      
      // Track training completion
      trackFeature('training_complete', 'trainings', {
        metadata: {
          training_id: training.id,
          client_id: training.client_id,
          participant_count: participantCount,
          payment_method: paymentMethodValue,
          total_price: correctPrice,
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
    const count = usePriceSplit ? participantShares.length : completeParticipants;
    return getTrainingPrice(count, trainingPrices);
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
          { label: 'Tréninky', href: '/trainings' },
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
              Vyplňte údaje a zvolte způsob platby.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Tag validation warning */}
            <TagValidationAlert validation={tagValidation} compact />

            {/* Training type selector */}
            <div className="space-y-2">
              <Label>Typ tréninku</Label>
              <TrainingTypeSelector
                value={completeTrainingType}
                onChange={setCompleteTrainingType}
              />
            </div>

            {/* Price split toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <Label htmlFor="price-split" className="font-medium">Rozdělit cenu mezi více klientů</Label>
                <p className="text-sm text-muted-foreground">
                  {usePriceSplit 
                    ? "Můžete přidat více účastníků a rozdělit cenu"
                    : "Celá cena bude odečtena hlavnímu klientovi"
                  }
                </p>
              </div>
              <Switch
                id="price-split"
                checked={usePriceSplit}
                onCheckedChange={(checked) => {
                  setUsePriceSplit(checked);
                  if (!checked) {
                    // Reset to single participant
                    const totalPrice = getTrainingPrice(completeParticipants, trainingPrices);
                    setParticipantShares([{
                      client_id: training.client_id,
                      client_name: client?.name || 'Klient',
                      price_share: totalPrice,
                      percentage: 100,
                    }]);
                  }
                }}
              />
            </div>

            {!usePriceSplit && (
              <div className="space-y-2">
                <Label>Počet účastníků</Label>
                <Select 
                  value={completeParticipants.toString()} 
                  onValueChange={(v) => setCompleteParticipants(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osob'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {usePriceSplit ? (
              <PriceSplitManager
                clients={clients}
                totalPrice={getExpectedPrice()}
                primaryClientId={training.client_id}
                onChange={setParticipantShares}
                initialParticipants={participantShares}
                getPriceForCount={(count) => getTrainingPrice(count, trainingPrices)}
              />
            ) : (
              <div className="p-4 rounded-lg bg-secondary/50 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cena za trénink:</span>
                  <span className="text-lg font-bold text-primary">{getExpectedPrice()} Kč</span>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Způsob platby</Label>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={isSubmitting || completeTrainingAtomic.isPending}
                clientCreditBalance={clientCreditBalance}
                trainingPrice={getExpectedPrice()}
                partialMethod={partialPaymentMethod}
                onPartialMethodChange={setPartialPaymentMethod}
              />
            </div>

            <div className="space-y-2">
              <Label>Poznámky (volitelné)</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Poznámky k tréninku..."
                rows={3}
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
                completeTrainingAtomic.isPending
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
                  {paymentMethod === 'credit' ? 'Dokončit a odečíst kredit' : 
                   paymentMethod === 'credit_partial' ? (partialPaymentMethod === 'later' ? 'Dokončit (kredit + doplatek později)' : 'Dokončit (kredit + doplatek)') :
                   paymentMethod === 'later' ? 'Dokončit (platba později)' :
                   'Dokončit trénink'}
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
            navigate('/trainings');
          }}
          summary={trainingSummary}
          clientName={client?.name || 'Klient'}
        />
      )}
    </div>
  );
}
