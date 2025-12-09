import { CreditCard, Wallet, Banknote, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethod, PaymentStatus } from '@/hooks/useTrainingSessions';

export type PaymentOption = 'credit' | 'cash' | 'card' | 'bank' | 'later';

interface PaymentMethodSelectorProps {
  value: PaymentOption;
  onChange: (value: PaymentOption) => void;
  disabled?: boolean;
}

const paymentOptions: { value: PaymentOption; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: 'credit', label: 'Z kreditu', icon: Wallet, description: 'Odečíst z klientského kreditu' },
  { value: 'cash', label: 'Hotově', icon: Banknote, description: 'Platba v hotovosti' },
  { value: 'card', label: 'Kartou', icon: CreditCard, description: 'Platba platební kartou' },
  { value: 'bank', label: 'Převodem', icon: Building2, description: 'Bankovní převod' },
  { value: 'later', label: 'Později', icon: Clock, description: 'Platba bude provedena později' },
];

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {paymentOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
              "hover:border-primary/50 hover:bg-secondary/50",
              isSelected 
                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                : "border-border bg-card",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {option.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function getPaymentStatusFromOption(option: PaymentOption): PaymentStatus {
  switch (option) {
    case 'credit': return 'paid_credit';
    case 'cash': return 'paid_cash';
    case 'card': return 'paid_card';
    case 'bank': return 'paid_bank';
    case 'later': return 'unpaid';
    default: return 'pending';
  }
}

export function getPaymentMethodFromOption(option: PaymentOption): PaymentMethod {
  switch (option) {
    case 'credit': return 'credit';
    case 'cash': return 'cash';
    case 'card': return 'card';
    case 'bank': return 'bank';
    case 'later': return null;
    default: return null;
  }
}

export function getPaymentStatusLabel(status: PaymentStatus | null): string {
  switch (status) {
    case 'paid_credit': return 'Z kreditu';
    case 'paid_cash': return 'Hotově';
    case 'paid_card': return 'Kartou';
    case 'paid_bank': return 'Převodem';
    case 'unpaid': return 'Nezaplaceno';
    case 'pending': return 'Čeká na platbu';
    default: return 'Neznámý';
  }
}
