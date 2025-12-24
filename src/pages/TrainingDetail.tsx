import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dumbbell,
  Loader2,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { TrainingDetailSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { RatingInput } from '@/components/ui/rating-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  useTrainingSession,
  useUpdateTrainingSession,
  useDeleteTrainingSession,
  useCompleteTrainingSession,
  useCancelTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingSessionTags, useUpdateTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { useClient, useClients } from '@/hooks/useClients';
import { useTags } from '@/hooks/useTags';
import { validateTrainingTags } from '@/hooks/useTrainingTagValidation';
import { TrainingDetailView } from '@/components/trainings/TrainingDetailView';
import { PriceSplitManager, ParticipantShare } from '@/components/trainings/PriceSplitManager';
import { PaymentMethodSelector, PaymentOption, getPaymentStatusFromOption, getPaymentMethodFromOption } from '@/components/trainings/PaymentMethodSelector';
import { useSaveTrainingParticipants, useDeductParticipantsCredit, useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { TagValidationAlert } from '@/components/trainings/TagValidationAlert';
import { useTrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackRequest } from '@/hooks/useFeedbackLink';
import { useUndoTrainingDelete } from '@/hooks/useUndoActions';
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
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function TrainingDetail() {
  usePageTracking('training_detail');
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: training, isLoading: trainingLoading } = useTrainingSession(id);
  const { data: client } = useClient(training?.client_id);
  const { data: clients = [] } = useClients();
  const { data: trainingTags = [] } = useTrainingSessionTags(id);
  const { data: allTags = [] } = useTags();
  const { data: existingParticipants = [] } = useTrainingParticipants(id);
  const { data: existingFeedback } = useTrainingFeedback(id);
  const { data: feedbackRequest } = useFeedbackRequest(id);
  const updateTraining = useUpdateTrainingSession();
  const deleteTraining = useDeleteTrainingSession();
  const completeTraining = useCompleteTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const updateTrainingTags = useUpdateTrainingSessionTags();
  const saveParticipants = useSaveTrainingParticipants();
  const deductParticipantsCredit = useDeductParticipantsCredit();
  const trainingPrices = useTrainingPrices();
  const { registerTrainingDeleteUndo } = useUndoTrainingDelete();

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
  const [completeRating, setCompleteRating] = useState<number | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [participantShares, setParticipantShares] = useState<ParticipantShare[]>([]);
  const [usePriceSplit, setUsePriceSplit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('credit');
  
  // Trainer summary state
  const [trainerWentWell, setTrainerWentWell] = useState('');
  const [trainerProblems, setTrainerProblems] = useState('');
  const [trainerRecommendations, setTrainerRecommendations] = useState('');
  const [painReported, setPainReported] = useState(false);
  const [painNotes, setPainNotes] = useState('');
  
  // Cancel dialog state
  const [cancelDeductCredit, setCancelDeductCredit] = useState(true);

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
    setCompleteRating(training.subjective_rating);
    setCompleteNotes(training.notes || '');
    setUsePriceSplit(existingParticipants.length > 0 || participantCount > 1);
    setPaymentMethod('credit');
    
    // Reset trainer summary fields
    setTrainerWentWell(training.trainer_went_well || '');
    setTrainerProblems(training.trainer_problems || '');
    setTrainerRecommendations(training.trainer_recommendations || '');
    setPainReported(training.pain_reported || false);
    setPainNotes(training.pain_notes || '');
    
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
    const participantCount = usePriceSplit ? participantShares.length : completeParticipants;
    // For price split, use the actual sum of participant shares to ensure consistency
    // This fixes the bug where totalPrice didn't match the sum of price_shares
    const totalPrice = usePriceSplit && participantShares.length > 1
      ? participantShares.reduce((sum, p) => sum + p.price_share, 0)
      : getExpectedPrice();
    const shouldDeductCredit = paymentMethod === 'credit';
    const paymentStatus = getPaymentStatusFromOption(paymentMethod);
    const paymentMethodValue = getPaymentMethodFromOption(paymentMethod);
    
    // Trainer summary data to save
    const trainerSummaryData = {
      trainer_went_well: trainerWentWell || undefined,
      trainer_problems: trainerProblems || undefined,
      trainer_recommendations: trainerRecommendations || undefined,
      pain_reported: painReported,
      pain_notes: painReported ? (painNotes || undefined) : undefined,
    };
    
    if (usePriceSplit && participantShares.length > 1) {
      // Calculate the correct price for this participant count
      const correctPrice = getTrainingPrice(participantCount, trainingPrices);
      
      // Normalize participant shares to match the correct price
      // This ensures the sum of price_shares equals the expected price for the participant count
      const currentSum = participantShares.reduce((sum, p) => sum + p.price_share, 0);
      const normalizedParticipants = currentSum !== correctPrice
        ? participantShares.map(p => ({
            client_id: p.client_id,
            price_share: Math.round((p.price_share / currentSum) * correctPrice),
          }))
        : participantShares.map(p => ({
            client_id: p.client_id,
            price_share: p.price_share,
          }));
      
      // Save participants and deduct credit from each
      await saveParticipants.mutateAsync({
        training_session_id: training.id,
        participants: normalizedParticipants,
      });
      
      // Update training status to completed with payment info and trainer summary
      await updateTraining.mutateAsync({
        id: training.id,
        input: {
          status: 'completed',
          participant_count: participantCount,
          subjective_rating: completeRating || undefined,
          notes: completeNotes || undefined,
          payment_status: paymentStatus,
          final_price: correctPrice,
          payment_method: paymentMethodValue,
          ...trainerSummaryData,
        },
      });
      
      // Only deduct credit if paying from credit
      if (shouldDeductCredit) {
        await deductParticipantsCredit.mutateAsync({
          training_session_id: training.id,
          participants: normalizedParticipants,
          totalPrice: correctPrice,
          description: `Trénink (${participantCount} ${participantCount === 1 ? 'osoba' : participantCount < 5 ? 'osoby' : 'osob'})`,
        });
      }
    } else {
      // Standard single client completion
      if (shouldDeductCredit) {
        await completeTraining.mutateAsync({
          id: training.id,
          client_id: training.client_id,
          participant_count: completeParticipants,
          subjective_rating: completeRating || undefined,
          notes: completeNotes || undefined,
          trainingPrices,
        });
        // Update payment fields and trainer summary
        await updateTraining.mutateAsync({
          id: training.id,
          input: {
            payment_status: paymentStatus,
            final_price: totalPrice,
            payment_method: paymentMethodValue,
            ...trainerSummaryData,
          },
        });
      } else {
        // Non-credit payment - just mark as completed without credit deduction
        await updateTraining.mutateAsync({
          id: training.id,
          input: {
            status: 'completed',
            participant_count: completeParticipants,
            subjective_rating: completeRating || undefined,
            notes: completeNotes || undefined,
            payment_status: paymentStatus,
            final_price: totalPrice,
            payment_method: paymentMethodValue,
            ...trainerSummaryData,
          },
        });
      }
    }
    setShowCompleteDialog(false);
    navigate('/trainings');
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

      {/* Action Buttons - Only for scheduled trainings */}
      {training.status === 'scheduled' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Změna stavu tréninku</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Označte trénink jako dokončený nebo změňte jeho stav na zrušený.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Button
                className="gap-2"
                onClick={openCompleteDialog}
              >
                <CheckCircle className="w-4 h-4" />
                Dokončit trénink
              </Button>
              <span className="text-xs text-muted-foreground ml-1">Odečte kredit a zaznamená platbu</span>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                className="gap-2 text-warning border-warning hover:bg-warning/10"
                onClick={openCancelDialog}
              >
                <XCircle className="w-4 h-4" />
                Zrušit trénink
              </Button>
              <span className="text-xs text-muted-foreground ml-1">Změní status, volitelně odečte kredit</span>
            </div>
          </div>
        </div>
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
                disabled={completeTraining.isPending || saveParticipants.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Hodnocení (volitelné)</Label>
              <RatingInput
                value={completeRating}
                onChange={setCompleteRating}
                max={10}
              />
            </div>

            {/* Trainer Summary Section */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Shrnutí tréninku
              </h4>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-success">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Co šlo dobře
                </Label>
                <Textarea
                  value={trainerWentWell}
                  onChange={(e) => setTrainerWentWell(e.target.value)}
                  placeholder="Cviky, techniky, pokroky..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-warning">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Co nešlo / na čem pracovat
                </Label>
                <Textarea
                  value={trainerProblems}
                  onChange={(e) => setTrainerProblems(e.target.value)}
                  placeholder="Problémy, slabiny, omezení..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Doporučení
                </Label>
                <Textarea
                  value={trainerRecommendations}
                  onChange={(e) => setTrainerRecommendations(e.target.value)}
                  placeholder="Doporučení pro další trénink..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Hlášená bolest
                  </Label>
                  <Switch
                    checked={painReported}
                    onCheckedChange={setPainReported}
                  />
                </div>
                {painReported && (
                  <Textarea
                    value={painNotes}
                    onChange={(e) => setPainNotes(e.target.value)}
                    placeholder="Popis bolesti - kde, kdy, intenzita..."
                    rows={2}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Poznámky</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Další poznámky k tréninku..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={
                !tagValidation.isValid ||
                completeTraining.isPending || 
                saveParticipants.isPending || 
                deductParticipantsCredit.isPending
              }
              title={!tagValidation.isValid ? "Doplňte povinné tagy" : undefined}
            >
              {(completeTraining.isPending || saveParticipants.isPending || deductParticipantsCredit.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {paymentMethod === 'credit' ? 'Dokončit a odečíst kredit' : 
                   paymentMethod === 'later' ? 'Dokončit (platba později)' :
                   'Dokončit trénink'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Training Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zrušit trénink</DialogTitle>
            <DialogDescription>
              Opravdu chcete zrušit tento trénink?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Počet účastníků:</span>
                <span className="font-medium">{training.participant_count || 1}</span>
              </div>
              {cancelDeductCredit && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Cena za trénink:</span>
                  <span className="text-lg font-bold text-destructive">{getCancelPrice()} Kč</span>
                </div>
              )}
              {differenceInHours(new Date(training.date), new Date()) < 24 && (
                <div className="mt-3 p-2 rounded bg-warning/10 text-warning text-sm">
                  ⚠️ Pozdní zrušení (méně než 24h před tréninkem)
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <Label htmlFor="deduct-credit" className="font-medium">Odečíst kredit</Label>
                <p className="text-sm text-muted-foreground">
                  {cancelDeductCredit 
                    ? `Bude odečteno ${getCancelPrice()} Kč z kreditu klienta`
                    : "Kredit klienta zůstane beze změny"
                  }
                </p>
              </div>
              <Switch
                id="deduct-credit"
                checked={cancelDeductCredit}
                onCheckedChange={setCancelDeductCredit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Zpět
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel} 
              disabled={cancelTraining.isPending}
            >
              {cancelTraining.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ruším...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  {cancelDeductCredit ? "Zrušit a odečíst kredit" : "Zrušit bez odečtení"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
