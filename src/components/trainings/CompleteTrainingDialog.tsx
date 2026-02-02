/**
 * CompleteTrainingDialog Component
 * 
 * Full-featured dialog for completing training with individual payment settings per participant.
 * Shows each participant with their credit balance and payment method selection.
 */
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAppSettings, TrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { getEffectiveTrainingPrice } from '@/hooks/usePriceTransition';

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
  const { data: appSettings } = useAppSettings();
  const completeTrainingAtomic = useCompleteTrainingAtomic();

  // Get prices from app settings - use undefined if not set so getEffectiveTrainingPrice can apply correct defaults
  const currentPrices = appSettings?.training_prices as TrainingPrices | undefined;
  const legacyPrices = appSettings?.legacy_training_prices as TrainingPrices | undefined;
  const isTransitionEnabled = appSettings?.price_transition_enabled;

  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  const [completeNotes, setCompleteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixedTotalPrice, setFixedTotalPrice] = useState<number>(0);
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
      setFixedTotalPrice(0);
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
    
    // Determine if primary client uses legacy pricing
    const usesLegacyPricing = Boolean(
      isTransitionEnabled &&
      primaryClient?.use_legacy_pricing &&
      primaryClient?.grandfathered_credit !== null &&
      (primaryClient?.credit_balance || 0) > 0
    );
    
    const totalPrice = hasCustomPrice
      ? primaryClient.custom_training_price!
      : getEffectiveTrainingPrice(participantCount, usesLegacyPricing, legacyPrices, currentPrices);

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
    setFixedTotalPrice(totalPrice);
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
        // For single participant, also update the fixed total
        setFixedTotalPrice(newPrice);
        return prev.map(p =>
          p.client_id === clientId ? { ...p, price_share: newPrice } : p
        );
      }
      
      // Use fixed total price as baseline for redistribution
      const remainingAmount = Math.max(0, fixedTotalPrice - newPrice);
      const otherParticipants = prev.filter(p => p.client_id !== clientId);
      const pricePerOther = otherParticipants.length > 0 
        ? Math.round(remainingAmount / otherParticipants.length) 
        : 0;
      
      // Distribute remaining amount evenly, with last participant getting the rounding difference
      let distributed = 0;
      return prev.map((p) => {
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

  // Handle total price change - distribute proportionally and update fixed total
  const handleTotalPriceChange = (newTotal: number) => {
    setFixedTotalPrice(newTotal);
    setParticipantPayments(prev => {
      const currentTotal = prev.reduce((sum, p) => sum + p.price_share, 0);
      if (currentTotal === 0 || prev.length === 0) return prev;

      // Calculate the ratio for proportional distribution
      const ratio = newTotal / currentTotal;

      // Distribute proportionally, keeping the last participant to absorb rounding
      let distributed = 0;
      return prev.map((p, index) => {
        if (index === prev.length - 1) {
          // Last participant gets the remainder
          return { ...p, price_share: newTotal - distributed };
        }
        const share = Math.round(p.price_share * ratio);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="relative pb-4">
          {/* Success gradient header */}
          <div className="absolute -top-6 -left-6 -right-6 h-24 bg-gradient-to-br from-success/20 via-success/10 to-transparent rounded-t-2xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/20 ring-1 ring-success/30">
              <Loader2 className={cn("w-5 h-5 text-success", isLoading ? "animate-spin" : "hidden")} />
              <svg className={cn("w-5 h-5 text-success", isLoading && "hidden")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Dokončit trénink</DialogTitle>
              <DialogDescription className="text-sm">
                Zkontrolujte účastníky a způsob platby.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Participant payment cards */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Účastníci ({participantPayments.length})
            </Label>
            {participantPayments.map((participant) => (
              <ParticipantPaymentCard
                key={participant.client_id}
                participant={participant}
                onChange={handleParticipantPaymentChange}
                onPriceChange={handleParticipantPriceChange}
                disabled={isLoading}
                allowPriceEdit={true}
              />
            ))}
          </div>

          {/* Payment summary - premium glass */}
          {paymentSummary.length > 0 && (
            <div className="p-4 rounded-xl bg-secondary/40 backdrop-blur-sm border border-border/30 space-y-2">
              {paymentSummary.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.method} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="w-4 h-4" />
                      {item.label}:
                    </span>
                    <span className="font-semibold tabular-nums">
                      {item.total} Kč <span className="text-muted-foreground font-normal">({item.count} os.)</span>
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Celkem:</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={getExpectedPrice()}
                    onChange={(e) => {
                      const newTotal = Math.max(0, parseInt(e.target.value) || 0);
                      handleTotalPriceChange(newTotal);
                    }}
                    className="w-28 h-10 text-right text-xl font-bold tabular-nums bg-card/80"
                    min={0}
                    step={100}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-muted-foreground">Kč</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes - subtle */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Poznámky (volitelné)
            </Label>
            <Textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Poznámky k tréninku..."
              rows={2}
              className="bg-secondary/30 border-border/30"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1 sm:flex-none">
            Zrušit
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading || participantPayments.length === 0}
            className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-lg shadow-success/25"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Dokončuji...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Dokončit trénink
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
