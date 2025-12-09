import { useState } from 'react';
import { CreditCard, Banknote, Wallet, Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'paid_credit' | 'paid_cash' | 'paid_card' | 'paid_bank' | 'pending';

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

interface ChangePaymentMethodDialogProps {
  currentPaymentStatus: string | null;
  onChangePaymentMethod: (newMethod: PaymentMethod) => Promise<void>;
  trigger?: React.ReactNode;
  isLoading?: boolean;
}

export function ChangePaymentMethodDialog({
  currentPaymentStatus,
  onChangePaymentMethod,
  trigger,
  isLoading,
}: ChangePaymentMethodDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    (currentPaymentStatus as PaymentMethod) || 'pending'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (selectedMethod === currentPaymentStatus) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await onChangePaymentMethod(selectedMethod);
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const currentOption = paymentOptions.find(o => o.value === currentPaymentStatus);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            {currentOption?.icon && <currentOption.icon className="w-4 h-4" />}
            Změnit platbu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Změnit způsob platby</DialogTitle>
          <DialogDescription>
            Vyberte nový způsob platby pro tento trénink. Změna ovlivní kredit klienta.
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
            const isCurrent = currentPaymentStatus === option.value;

            return (
              <Label
                key={option.value}
                htmlFor={option.value}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isCurrent && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        Aktuální
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        {selectedMethod !== currentPaymentStatus && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm text-warning">
            {currentPaymentStatus === 'paid_credit' && selectedMethod !== 'paid_credit' && (
              <p>⚠️ Kredit bude vrácen zpět klientovi.</p>
            )}
            {currentPaymentStatus !== 'paid_credit' && selectedMethod === 'paid_credit' && (
              <p>⚠️ Kredit bude odečten z účtu klienta.</p>
            )}
            {currentPaymentStatus !== 'paid_credit' && selectedMethod !== 'paid_credit' && (
              <p>ℹ️ Pouze se změní způsob platby, kredit nebude ovlivněn.</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              'Uložit změnu'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
