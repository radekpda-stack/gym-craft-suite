import { useState } from 'react';
import { CreditCard, Wallet, Banknote, Building2, Clock, Split, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethod, PaymentStatus } from '@/hooks/useTrainingSessions';
import { PAYMENT_STATUS_CONFIG, PaymentStatusType } from '@/lib/payment-status';
import { formatCurrency } from '@/lib/formatters';

export type PaymentOption = 'credit' | 'cash' | 'card' | 'bank' | 'later' | 'credit_partial';

// For hybrid payment - how to pay the remaining difference
export type PartialPaymentMethod = 'cash' | 'card' | 'bank' | 'later';

interface PaymentMethodSelectorProps {
  value: PaymentOption;
  onChange: (value: PaymentOption) => void;
  disabled?: boolean;
  clientCreditBalance?: number;
  trainingPrice?: number;
  onPartialMethodChange?: (method: PartialPaymentMethod) => void;
  partialMethod?: PartialPaymentMethod;
}

const paymentOptions: { value: PaymentOption; label: string; icon: typeof CreditCard; description: string }[] = [
  { value: 'credit', label: 'Z kreditu', icon: Wallet, description: 'Odečíst z klientského kreditu' },
  { value: 'cash', label: 'Hotově', icon: Banknote, description: 'Platba v hotovosti' },
  { value: 'card', label: 'Kartou', icon: CreditCard, description: 'Platba platební kartou' },
  { value: 'bank', label: 'Převodem', icon: Building2, description: 'Bankovní převod' },
  { value: 'later', label: 'Později', icon: Clock, description: 'Platba bude provedena později' },
];

const partialPaymentOptions: { value: PartialPaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'card', label: 'Kartou', icon: CreditCard },
  { value: 'bank', label: 'Převodem', icon: Building2 },
  { value: 'later', label: 'Zaplatí později', icon: Clock },
];

export function PaymentMethodSelector({ 
  value, 
  onChange, 
  disabled,
  clientCreditBalance,
  trainingPrice,
  onPartialMethodChange,
  partialMethod = 'cash',
}: PaymentMethodSelectorProps) {
  const [showPartialOptions, setShowPartialOptions] = useState(value === 'credit_partial');
  
  // Calculate if partial payment makes sense
  const hasCredit = (clientCreditBalance ?? 0) > 0;
  const hasSufficientCredit = (clientCreditBalance ?? 0) >= (trainingPrice ?? 0);
  const creditToUse = Math.min(clientCreditBalance ?? 0, trainingPrice ?? 0);
  const remaining = (trainingPrice ?? 0) - creditToUse;
  
  // Show hybrid option only if client has some credit but not enough
  const showHybridOption = hasCredit && !hasSufficientCredit && trainingPrice !== undefined && trainingPrice > 0;

  const handleOptionClick = (optionValue: PaymentOption) => {
    if (optionValue === 'credit_partial') {
      setShowPartialOptions(true);
    } else {
      setShowPartialOptions(false);
    }
    onChange(optionValue);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {paymentOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          // Show warning if trying to pay from credit but insufficient funds
          const showCreditWarning = option.value === 'credit' && !hasSufficientCredit && trainingPrice !== undefined;
          
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => handleOptionClick(option.value)}
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
                {showCreditWarning && option.value === 'credit' && (
                  <p className="text-xs text-warning mt-1">
                    Kredit: {formatCurrency(clientCreditBalance ?? 0)} (chybí {formatCurrency(remaining)})
                  </p>
                )}
              </div>
            </button>
          );
        })}
        
        {/* Hybrid payment option - only show when relevant */}
        {showHybridOption && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleOptionClick('credit_partial')}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-all text-left sm:col-span-2",
              "hover:border-primary/50 hover:bg-secondary/50",
              value === 'credit_partial'
                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                : "border-border bg-card",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              value === 'credit_partial' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <Split className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm",
                value === 'credit_partial' ? "text-primary" : "text-foreground"
              )}>
                Kredit + doplatek
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(creditToUse)} z kreditu + {formatCurrency(remaining)} doplatit
              </p>
            </div>
            {value === 'credit_partial' ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      
      {/* Partial payment method selector */}
      {value === 'credit_partial' && showPartialOptions && (
        <div className="ml-4 p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
          <p className="text-sm text-muted-foreground">
            Jak bude doplaceno <strong>{formatCurrency(remaining)}</strong>?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {partialPaymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = partialMethod === option.value;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPartialMethodChange?.(option.value)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                    isSelected 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card hover:border-primary/50",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm", isSelected ? "text-primary font-medium" : "text-foreground")}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
          {partialMethod === 'later' && (
            <p className="text-xs text-warning flex items-center gap-1 mt-2">
              <Clock className="w-3 h-3" />
              Doplatek {formatCurrency(remaining)} zůstane jako nezaplacený
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function getPaymentStatusFromOption(option: PaymentOption, partialMethod?: PartialPaymentMethod): PaymentStatus {
  switch (option) {
    case 'credit': return 'paid_credit';
    case 'cash': return 'paid_cash';
    case 'card': return 'paid_card';
    case 'bank': return 'paid_bank';
    case 'later': return 'pending';
    case 'credit_partial':
      // If partial payment uses "later", mark as pending so it shows in unpaid list
      if (partialMethod === 'later') return 'pending';
      // Otherwise mark based on the partial payment method
      return partialMethod === 'cash' ? 'paid_cash' : 
             partialMethod === 'card' ? 'paid_card' : 
             partialMethod === 'bank' ? 'paid_bank' : 'pending';
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
    case 'credit_partial': return 'credit'; // Primary method is still credit
    default: return null;
  }
}

export function getPaymentStatusLabel(status: PaymentStatus | null): string {
  if (!status) return 'Neznámý';
  const config = PAYMENT_STATUS_CONFIG[status as PaymentStatusType];
  return config?.shortLabel || 'Neznámý';
}

export function getPaymentStatusLabelFull(status: PaymentStatus | null): string {
  if (!status) return 'Neznámý';
  const config = PAYMENT_STATUS_CONFIG[status as PaymentStatusType];
  return config?.label || 'Neznámý';
}
