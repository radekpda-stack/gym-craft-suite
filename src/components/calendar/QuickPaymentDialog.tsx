import { useState } from 'react';
import { CreditCard, Banknote, Wallet, Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { useAppSettings } from '@/hooks/useAppSettings';

type PaymentMethod = 'paid_credit' | 'paid_cash' | 'paid_card' | 'paid_bank';

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  icon: React.ElementType;
  description: string;
}

const paymentOptions: PaymentOption[] = [
  {
    value: 'paid_credit',
    label: 'Z kreditu',
    icon: Wallet,
    description: 'Odečte se z klientova kreditu',
  },
  {
    value: 'paid_cash',
    label: 'Hotově',
    icon: Banknote,
    description: 'Platba v hotovosti',
  },
  {
    value: 'paid_card',
    label: 'Kartou',
    icon: CreditCard,
    description: 'Platba kartou',
  },
  {
    value: 'paid_bank',
    label: 'Převodem',
    icon: Building2,
    description: 'Bankovní převod',
  },
];

interface QuickPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
  clientName: string;
  currentPaymentStatus: string | null;
}

export function QuickPaymentDialog({
  open,
  onOpenChange,
  trainingId,
  clientName,
  currentPaymentStatus,
}: QuickPaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('paid_credit');
  const updateTraining = useUpdateTrainingSession();
  const { data: settings } = useAppSettings();
  const trainingPrices = settings?.training_prices || { '1': 800, '2': 1000, '3': 1200 };

  const handleSave = async () => {
    const paymentMethodMap: Record<PaymentMethod, string> = {
      paid_credit: 'credit',
      paid_cash: 'cash',
      paid_card: 'card',
      paid_bank: 'bank',
    };

    await updateTraining.mutateAsync({
      id: trainingId,
      input: {
        payment_status: selectedMethod,
        payment_method: paymentMethodMap[selectedMethod] as any,
      },
      trainingPrices: selectedMethod === 'paid_credit' ? trainingPrices : undefined,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zadat platbu</DialogTitle>
          <DialogDescription>
            Vyberte způsob platby pro trénink s {clientName}.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedMethod}
          onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}
          className="gap-3 py-4"
        >
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedMethod === option.value;

            return (
              <Label
                key={option.value}
                htmlFor={`payment-${option.value}`}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value={option.value} id={`payment-${option.value}`} />
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">{option.label}</span>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        {selectedMethod === 'paid_credit' && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm text-warning">
            ⚠️ Kredit bude odečten z účtu klienta.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateTraining.isPending}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={updateTraining.isPending}>
            {updateTraining.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              'Potvrdit platbu'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
