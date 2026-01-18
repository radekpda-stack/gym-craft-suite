/**
 * CompleteTrainingDialog Component
 * 
 * Full-featured dialog for completing training with individual payment settings per participant.
 * Shows each participant with their credit balance and payment method selection.
 */
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ParticipantPaymentCard,
  ParticipantPayment,
  IndividualPaymentMethod,
  getDefaultPaymentMethod,
  calculatePaymentSummary,
} from './ParticipantPaymentCard';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { useCompleteTrainingAtomic } from '@/hooks/useCompleteTrainingAtomic';
import { useBudgetGroups } from '@/hooks/useClientBudgetGroups';
import { useClients, Client } from '@/hooks/useClients';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';

interface TrainingSession {
  id: string;
  client_id: string;
  participant_count?: number;
  notes?: string | null;
}

interface CompleteTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession | null;
  onSuccess?: () => void;
}

export function CompleteTrainingDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
}: CompleteTrainingDialogProps) {
  const { data: clients = [] } = useClients();
  const { data: existingParticipants = [] } = useTrainingParticipants(session?.id);
  const { data: budgetGroups = [] } = useBudgetGroups();
  const trainingPrices = useTrainingPrices();
  const completeTrainingAtomic = useCompleteTrainingAtomic();

  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  const [completeNotes, setCompleteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastInitializedSessionId = useRef<string | null>(null);

  // Get effective credit balance (includes shared budget)
  const getEffectiveCreditBalance = (clientId: string): number => {
    const clientData = clients.find(c => c.id === clientId);
    if (!clientData) return 0;

    // Check if client is part of a budget group
    const membership = budgetGroups
      .flatMap(g => g.members?.map(m => ({ ...m, group: g })) || [])
      .find(m => m.client_id === clientId);

    if (membership?.group) {
      return membership.group.shared_balance ?? 0;
    }

    return clientData.credit_balance ?? 0;
  };

  // Initialize payments when dialog opens with a new session
  useEffect(() => {
    // If dialog is closed, reset tracking
    if (!open) {
      lastInitializedSessionId.current = null;
      setParticipantPayments([]);
      setCompleteNotes('');
      return;
    }

    // Don't initialize if no session or already initialized for this session
    if (!session || lastInitializedSessionId.current === session.id) {
      return;
    }

    // Wait for clients data to be available
    if (clients.length === 0) {
      return;
    }

    lastInitializedSessionId.current = session.id;
    setCompleteNotes(session.notes || '');

    const participantCount = existingParticipants.length > 0
      ? existingParticipants.length
      : (session.participant_count || 1);

    const primaryClient = clients.find(c => c.id === session.client_id);
    const hasCustomPrice = participantCount === 1 && primaryClient?.custom_training_price != null;
    const totalPrice = hasCustomPrice
      ? primaryClient.custom_training_price!
      : getTrainingPrice(participantCount, trainingPrices);

    let payments: ParticipantPayment[];

    if (existingParticipants.length > 0) {
      const pricePerPerson = Math.round(totalPrice / existingParticipants.length);

      payments = existingParticipants.map((p, index) => {
        const clientData = clients.find(c => c.id === p.client_id);
        const creditBalance = getEffectiveCreditBalance(p.client_id);
        const paymentMode = clientData?.payment_mode;

        let priceShare: number;
        if (hasCustomPrice && existingParticipants.length === 1) {
          priceShare = totalPrice;
        } else if (p.price_share > 0) {
          priceShare = p.price_share;
        } else {
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
      const creditBalance = getEffectiveCreditBalance(session.client_id);
      const paymentMode = primaryClient?.payment_mode;

      payments = [{
        client_id: session.client_id,
        client_name: primaryClient?.name || 'Klient',
        price_share: totalPrice,
        payment_method: getDefaultPaymentMethod(paymentMode, creditBalance, totalPrice),
        credit_balance: creditBalance,
        payment_mode: paymentMode,
      }];
    }

    setParticipantPayments(payments);
  }, [open, session?.id, clients.length, existingParticipants.length]);

  const handleParticipantPaymentChange = (clientId: string, method: IndividualPaymentMethod) => {
    setParticipantPayments(prev => prev.map(p =>
      p.client_id === clientId ? { ...p, payment_method: method } : p
    ));
  };

  const handleParticipantPriceChange = (clientId: string, newPrice: number) => {
    setParticipantPayments(prev => {
      const participantCount = prev.length;
      
      // Only auto-distribute for multi-participant trainings
      if (participantCount <= 1) {
        return prev.map(p =>
          p.client_id === clientId ? { ...p, price_share: newPrice } : p
        );
      }
      
      // Get total price based on participant count (1000 for 2, 1200 for 3+)
      const totalPrice = getTrainingPrice(participantCount, trainingPrices);
      
      // Calculate remaining amount for other participants
      const remainingAmount = Math.max(0, totalPrice - newPrice);
      const otherParticipants = prev.filter(p => p.client_id !== clientId);
      const pricePerOther = otherParticipants.length > 0 
        ? Math.round(remainingAmount / otherParticipants.length) 
        : 0;
      
      // Distribute remaining amount evenly, with last participant getting the rounding difference
      let distributed = 0;
      return prev.map((p, index) => {
        if (p.client_id === clientId) {
          return { ...p, price_share: newPrice };
        }
        
        // For the last "other" participant, give them the remainder to ensure exact total
        const isLastOther = prev.filter(pp => pp.client_id !== clientId).indexOf(p) === otherParticipants.length - 1;
        const share = isLastOther ? remainingAmount - distributed : pricePerOther;
        distributed += share;
        
        return { ...p, price_share: share };
      });
    });
  };

  const handleComplete = async () => {
    if (!session || isSubmitting || completeTrainingAtomic.isPending) return;
    setIsSubmitting(true);

    try {
      const totalPrice = participantPayments.reduce((sum, p) => sum + p.price_share, 0);

      const participantsWithPayments = participantPayments.map(p => ({
        client_id: p.client_id,
        price_share: p.price_share,
        payment_method: p.payment_method,
      }));

      await completeTrainingAtomic.mutateAsync({
        sessionId: session.id,
        participants: participantsWithPayments,
        totalPrice,
        notes: completeNotes || undefined,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Training completion failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpectedPrice = () => {
    return participantPayments.reduce((sum, p) => sum + p.price_share, 0);
  };

  const paymentSummary = calculatePaymentSummary(participantPayments);
  const isLoading = isSubmitting || completeTrainingAtomic.isPending;

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dokončit trénink</DialogTitle>
          <DialogDescription>
            Zkontrolujte účastníky a způsob platby.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                onPriceChange={handleParticipantPriceChange}
                disabled={isLoading}
                allowPriceEdit={participantPayments.length > 1}
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
                      {item.total} Kč ({item.count} os.)
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

          {/* Notes */}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Zrušit
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading || participantPayments.length === 0}
            className="bg-success hover:bg-success/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dokončuji...
              </>
            ) : (
              'Dokončit trénink'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
