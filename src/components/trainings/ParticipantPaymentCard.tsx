/**
 * ParticipantPaymentCard Component
 * 
 * 3-column payment layout: Kredit | Hotově | Jiné (expandable)
 * Bigger touch targets, no pill animation, clearer credit display.
 */
import { useState } from 'react';
import { Wallet, Banknote, MoreHorizontal, CreditCard, Building2, Clock } from 'lucide-react';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Input } from '@/components/ui/input';

export type IndividualPaymentMethod = 'credit' | 'cash' | 'card' | 'bank' | 'pending';

export interface ParticipantPayment {
  client_id: string;
  client_name: string;
  price_share: number;
  payment_method: IndividualPaymentMethod;
  credit_balance: number;
  payment_mode?: string | null;
}

interface ParticipantPaymentCardProps {
  participant: ParticipantPayment;
  onChange: (clientId: string, method: IndividualPaymentMethod) => void;
  onPriceChange?: (clientId: string, newPrice: number) => void;
  disabled?: boolean;
  allowPriceEdit?: boolean;
}

const OTHER_METHODS: { value: IndividualPaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: 'card', label: 'Kartou', icon: CreditCard },
  { value: 'bank', label: 'Převodem', icon: Building2 },
  { value: 'pending', label: 'Později', icon: Clock },
];

export function ParticipantPaymentCard({ 
  participant, 
  onChange,
  onPriceChange,
  disabled,
  allowPriceEdit = true,
}: ParticipantPaymentCardProps) {
  const { credit_balance, price_share, payment_method } = participant;
  const [showOther, setShowOther] = useState(
    payment_method === 'card' || payment_method === 'bank' || payment_method === 'pending'
  );

  const afterBalance = credit_balance - price_share;
  const isDebt = afterBalance < 0;
  const isLowCredit = afterBalance >= 0 && afterBalance < 1000;
  const showCreditLine = payment_method === 'credit';
  const isOtherMethod = payment_method === 'card' || payment_method === 'bank' || payment_method === 'pending';

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = Math.max(0, parseInt(e.target.value) || 0);
    onPriceChange?.(participant.client_id, newPrice);
  };

  const selectMethod = (method: IndividualPaymentMethod) => {
    onChange(participant.client_id, method);
    if (method !== 'card' && method !== 'bank' && method !== 'pending') {
      setShowOther(false);
    }
  };

  return (
    <div className="p-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm space-y-2.5">
      {/* Header: Avatar, Name, Price */}
      <div className="flex items-center gap-3">
        <ClientAvatar name={participant.client_name} size="sm" className="ring-2 ring-border/30" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{participant.client_name}</p>
          {showCreditLine && (
            <p className={cn(
              "text-xs tabular-nums",
              isDebt ? "text-destructive font-medium" : isLowCredit ? "text-warning" : "text-muted-foreground"
            )}>
              {formatCurrency(credit_balance)} → {formatCurrency(afterBalance)}
              {isDebt && <span> (dluh)</span>}
            </p>
          )}
        </div>
        <div className="text-right">
          {allowPriceEdit && onPriceChange && !disabled ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={price_share}
                onChange={handlePriceChange}
                className="w-20 h-9 text-right text-base font-bold tabular-nums bg-secondary/50"
                min={0}
                step={100}
              />
              <span className="text-xs text-muted-foreground">Kč</span>
            </div>
          ) : (
            <span className="font-bold text-lg text-primary tabular-nums">{formatCurrency(price_share)}</span>
          )}
        </div>
      </div>

      {/* 3-column payment buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => selectMethod('credit')}
          className={cn(
            "flex items-center justify-center gap-1.5 h-11 rounded-lg text-xs font-semibold transition-all border",
            payment_method === 'credit'
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-secondary/40 text-muted-foreground border-border/30 hover:bg-secondary/70 hover:text-foreground",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <Wallet className="w-4 h-4" />
          Kredit
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => selectMethod('cash')}
          className={cn(
            "flex items-center justify-center gap-1.5 h-11 rounded-lg text-xs font-semibold transition-all border",
            payment_method === 'cash'
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-secondary/40 text-muted-foreground border-border/30 hover:bg-secondary/70 hover:text-foreground",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <Banknote className="w-4 h-4" />
          Hotově
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOtherMethod) {
              // Already on other - toggle dropdown
              setShowOther(!showOther);
            } else {
              // Switch to card as default "other"
              selectMethod('card');
              setShowOther(true);
            }
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 h-11 rounded-lg text-xs font-semibold transition-all border",
            isOtherMethod
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-secondary/40 text-muted-foreground border-border/30 hover:bg-secondary/70 hover:text-foreground",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
          Jiné
        </button>
      </div>

      {/* Expanded "Other" methods */}
      {showOther && (
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {OTHER_METHODS.map((opt) => {
            const Icon = opt.icon;
            const isActive = payment_method === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => selectMethod(opt.value)}
                className={cn(
                  "flex items-center justify-center gap-1 h-9 rounded-lg text-[11px] font-medium transition-all border",
                  isActive
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-secondary/30 text-muted-foreground border-border/20 hover:bg-secondary/60",
                  disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Get default payment method based on client preferences and credit balance
 */
export function getDefaultPaymentMethod(
  paymentMode: string | null | undefined,
  _creditBalance: number,
  _priceShare: number
): IndividualPaymentMethod {
  if (paymentMode === 'cash_only') return 'cash';
  return 'credit';
}

/**
 * Payment summary by method
 */
export interface PaymentSummary {
  method: IndividualPaymentMethod;
  label: string;
  icon: typeof Wallet;
  total: number;
  count: number;
}

const paymentOptions: { value: IndividualPaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: 'credit', label: 'Z kreditu', icon: Wallet },
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'card', label: 'Kartou', icon: CreditCard },
  { value: 'bank', label: 'Převodem', icon: Building2 },
  { value: 'pending', label: 'Později', icon: Clock },
];

export function calculatePaymentSummary(participants: ParticipantPayment[]): PaymentSummary[] {
  const summary: Record<IndividualPaymentMethod, { total: number; count: number }> = {
    credit: { total: 0, count: 0 },
    cash: { total: 0, count: 0 },
    card: { total: 0, count: 0 },
    bank: { total: 0, count: 0 },
    pending: { total: 0, count: 0 },
  };

  participants.forEach(p => {
    if (p.price_share > 0) {
      summary[p.payment_method].total += p.price_share;
      summary[p.payment_method].count += 1;
    }
  });

  return paymentOptions
    .filter(opt => summary[opt.value].count > 0)
    .map(opt => ({
      method: opt.value,
      label: opt.label,
      icon: opt.icon,
      total: summary[opt.value].total,
      count: summary[opt.value].count,
    }));
}
