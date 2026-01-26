/**
 * QuickCompleteDialog Component
 * 
 * Minimal dialog for quick training completion with just price and payment method.
 * For more complex scenarios (multi-participant), falls back to full CompleteTrainingDialog.
 */
import { useState, useEffect } from 'react';
import { Check, Loader2, CreditCard, Banknote, Landmark, Wallet } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCompleteTrainingAtomic } from '@/hooks/useCompleteTrainingAtomic';
import { useClients } from '@/hooks/useClients';
import { useBudgetGroups } from '@/hooks/useClientBudgetGroups';
import { useAppSettings, TrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { getEffectiveTrainingPrice } from '@/hooks/usePriceTransition';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

type PaymentMethod = 'credit' | 'cash' | 'card' | 'bank';

interface TrainingSession {
  id: string;
  client_id: string;
  participant_count?: number;
}

interface QuickCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession | null;
  onSuccess?: () => void;
  onNeedFullDialog?: () => void; // Called when multi-participant detected
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'credit', label: 'Kredit', icon: <Wallet className="w-4 h-4" /> },
  { value: 'cash', label: 'Hotovost', icon: <Banknote className="w-4 h-4" /> },
  { value: 'card', label: 'Karta', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'bank', label: 'Převod', icon: <Landmark className="w-4 h-4" /> },
];

export function QuickCompleteDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
  onNeedFullDialog,
}: QuickCompleteDialogProps) {
  const { data: clients = [] } = useClients();
  const { data: budgetGroups = [] } = useBudgetGroups();
  const { data: appSettings } = useAppSettings();
  const completeTrainingAtomic = useCompleteTrainingAtomic();

  // Get prices from app settings
  const currentPrices = (appSettings?.training_prices || { "1": 900, "2": 1100, "3": 1300, "first_training": 1000 }) as TrainingPrices;
  const legacyPrices = (appSettings?.legacy_training_prices || { "1": 800, "2": 1000, "3": 1200 }) as TrainingPrices;
  const isTransitionEnabled = appSettings?.price_transition_enabled;

  const [price, setPrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get client data
  const client = clients.find(c => c.id === session?.client_id);
  
  // Get effective credit balance (includes shared budget)
  const getEffectiveCreditBalance = (): number => {
    if (!client) return 0;

    const membership = budgetGroups
      .flatMap(g => g.members?.map(m => ({ ...m, group: g })) || [])
      .find(m => m.client_id === client.id);

    if (membership?.group) {
      return membership.group.shared_balance ?? 0;
    }

    return client.credit_balance ?? 0;
  };

  const creditBalance = getEffectiveCreditBalance();
  const hasEnoughCredit = creditBalance >= price;

  // Initialize when dialog opens
  useEffect(() => {
    if (!open || !session || !client) return;

    // Check if multi-participant - redirect to full dialog
    const participantCount = session.participant_count || 1;
    if (participantCount > 1) {
      onOpenChange(false);
      onNeedFullDialog?.();
      return;
    }

    // Calculate default price - consider legacy pricing fixation
    const hasCustomPrice = client.custom_training_price != null;
    
    // Determine if client uses legacy pricing
    const usesLegacyPricing = Boolean(
      isTransitionEnabled &&
      client.use_legacy_pricing &&
      client.grandfathered_credit !== null &&
      (client.credit_balance || 0) > 0
    );
    
    const defaultPrice = hasCustomPrice
      ? client.custom_training_price!
      : getEffectiveTrainingPrice(1, usesLegacyPricing, legacyPrices, currentPrices);
    
    setPrice(defaultPrice);

    // Set default payment method based on credit/payment mode
    if (client.payment_mode === 'cash_only') {
      setPaymentMethod('cash');
    } else if (creditBalance >= defaultPrice) {
      setPaymentMethod('credit');
    } else {
      setPaymentMethod('cash');
    }
  }, [open, session, client, creditBalance, isTransitionEnabled, legacyPrices, currentPrices, onOpenChange, onNeedFullDialog]);

  const handleComplete = async () => {
    if (!session || !client || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await completeTrainingAtomic.mutateAsync({
        sessionId: session.id,
        participants: [{
          client_id: client.id,
          price_share: price,
          payment_method: paymentMethod,
        }],
        totalPrice: price,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Quick complete failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session || !client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Dokončit trénink
          </DialogTitle>
          <DialogDescription>
            {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Cena</Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="pr-12 text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Kč
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Platba</Label>
            <ToggleGroup
              type="single"
              value={paymentMethod}
              onValueChange={(v) => v && setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-4 gap-1"
            >
              {PAYMENT_METHODS.map((method) => {
                const isCredit = method.value === 'credit';
                const disabled = isCredit && !hasEnoughCredit;
                
                return (
                  <ToggleGroupItem
                    key={method.value}
                    value={method.value}
                    disabled={disabled}
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-2 px-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                      disabled && "opacity-50"
                    )}
                  >
                    {method.icon}
                    <span className="text-[10px]">{method.label}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            
            {/* Credit balance indicator */}
            {paymentMethod === 'credit' && (
              <p className={cn(
                "text-xs",
                hasEnoughCredit ? "text-muted-foreground" : "text-destructive"
              )}>
                Kredit: {formatCurrency(creditBalance)}
                {!hasEnoughCredit && " (nedostatečný)"}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSubmitting || (paymentMethod === 'credit' && !hasEnoughCredit)}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Dokončit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
