import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dumbbell,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
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
import { TrainingDetailView } from '@/components/trainings/TrainingDetailView';
import { PriceSplitManager, ParticipantShare } from '@/components/trainings/PriceSplitManager';
import { PaymentMethodSelector, PaymentOption, getPaymentStatusFromOption, getPaymentMethodFromOption } from '@/components/trainings/PaymentMethodSelector';
import { useSaveTrainingParticipants, useDeductParticipantsCredit, useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { useTrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackRequest } from '@/hooks/useFeedbackLink';
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

export default function TrainingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: training, isLoading: trainingLoading } = useTrainingSession(id);
  const { data: client } = useClient(training?.client_id);
  const { data: clients = [] } = useClients();
  const { data: trainingTags = [] } = useTrainingSessionTags(id);
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

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Complete dialog state
  const [completeParticipants, setCompleteParticipants] = useState(1);
  const [completeRating, setCompleteRating] = useState<number | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [participantShares, setParticipantShares] = useState<ParticipantShare[]>([]);
  const [usePriceSplit, setUsePriceSplit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('credit');
  
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
    data: { date?: Date; duration?: number; participant_count?: number; notes?: string; subjective_rating?: number | null; status?: 'scheduled' | 'completed' | 'canceled' },
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
      },
      trainingPrices,
    });
    
    await updateTrainingTags.mutateAsync({
      trainingSessionId: training.id,
      tagIds,
    });
  };

  const handleDelete = async () => {
    await deleteTraining.mutateAsync(training.id);
    navigate('/trainings');
  };

  const openCompleteDialog = () => {
    const participantCount = training.participant_count || 1;
    setCompleteParticipants(participantCount);
    setCompleteRating(training.subjective_rating);
    setCompleteNotes(training.notes || '');
    setUsePriceSplit(existingParticipants.length > 0 || participantCount > 1);
    setPaymentMethod('credit');
    
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
    const totalPrice = getExpectedPrice();
    const shouldDeductCredit = paymentMethod === 'credit';
    const paymentStatus = getPaymentStatusFromOption(paymentMethod);
    const paymentMethodValue = getPaymentMethodFromOption(paymentMethod);
    
    if (usePriceSplit && participantShares.length > 1) {
      // Save participants and deduct credit from each
      await saveParticipants.mutateAsync({
        training_session_id: training.id,
        participants: participantShares.map(p => ({
          client_id: p.client_id,
          price_share: p.price_share,
        })),
      });
      
      // Update training status to completed with payment info
      await updateTraining.mutateAsync({
        id: training.id,
        input: {
          status: 'completed',
          participant_count: participantCount,
          subjective_rating: completeRating || undefined,
          notes: completeNotes || undefined,
          payment_status: paymentStatus,
          final_price: totalPrice,
          payment_method: paymentMethodValue,
        },
      });
      
      // Only deduct credit if paying from credit
      if (shouldDeductCredit) {
        await deductParticipantsCredit.mutateAsync({
          training_session_id: training.id,
          participants: participantShares.map(p => ({
            client_id: p.client_id,
            price_share: p.price_share,
          })),
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
        // Update payment fields
        await updateTraining.mutateAsync({
          id: training.id,
          input: {
            payment_status: paymentStatus,
            final_price: totalPrice,
            payment_method: paymentMethodValue,
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
          },
        });
      }
    }
    setShowCompleteDialog(false);
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
      />

      {/* Action Buttons */}
      {training.status === 'scheduled' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Akce</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              onClick={openCompleteDialog}
            >
              <CheckCircle className="w-4 h-4" />
              Dokončit trénink
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
              onClick={openCancelDialog}
            >
              <XCircle className="w-4 h-4" />
              Zrušit trénink
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Smazat trénink
            </Button>
          </div>
        </div>
      )}

      {training.status !== 'scheduled' && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Akce</h3>
          <div className="flex flex-wrap gap-3">
            {training.status === 'completed' && existingFeedback && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Zpětná vazba vyplněna</span>
              </div>
            )}
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Smazat trénink
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trénink?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat tento trénink? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
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

            <div className="space-y-2">
              <Label>Poznámky</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Poznámky k tréninku..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={completeTraining.isPending || saveParticipants.isPending || deductParticipantsCredit.isPending}
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
