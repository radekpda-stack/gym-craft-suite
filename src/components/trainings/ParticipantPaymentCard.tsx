/**
 * ParticipantPaymentCard Component
 * 
 * Compact card for each participant with individual payment method selection.
 * Now includes editable price share for custom payment splits.
 * Auto-fills payment method based on client preferences.
 */
import { useState } from 'react';
import { Wallet, Banknote, CreditCard, Building2, Clock, Pencil, Check } from 'lucide-react';
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
  payment_mode?: string | null; // client preference: 'credit', 'cash_only', 'mixed'
}

interface ParticipantPaymentCardProps {
  participant: ParticipantPayment;
  onChange: (clientId: string, method: IndividualPaymentMethod) => void;
  onPriceChange?: (clientId: string, newPrice: number) => void;
  disabled?: boolean;
  allowPriceEdit?: boolean;
}

const paymentOptions: { value: IndividualPaymentMethod; label: string; shortLabel: string; icon: typeof Wallet }[] = [
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kredit', icon: Wallet },
  { value: 'cash', label: 'Hotově', shortLabel: 'Hotově', icon: Banknote },
  { value: 'card', label: 'Kartou', shortLabel: 'Kartou', icon: CreditCard },
  { value: 'bank', label: 'Převodem', shortLabel: 'Převodem', icon: Building2 },
  { value: 'pending', label: 'Později', shortLabel: 'Později', icon: Clock },
];

export function ParticipantPaymentCard({ 
  participant, 
  onChange,
  onPriceChange,
  disabled,
  allowPriceEdit = true,
}: ParticipantPaymentCardProps) {
  const { credit_balance, price_share, payment_method } = participant;
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(price_share.toString());

  const afterBalance = credit_balance - price_share;
  const isDebt = afterBalance < 0;
  const showCreditLine = payment_method === 'credit';

  const handlePriceEdit = () => {
    setEditedPrice(price_share.toString());
    setIsEditingPrice(true);
  };

  const handlePriceConfirm = () => {
    const newPrice = Math.max(0, parseInt(editedPrice) || 0);
    onPriceChange?.(participant.client_id, newPrice);
    setIsEditingPrice(false);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceConfirm();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setEditedPrice(price_share.toString());
    }
  };

  return (
    <div className="p-3 rounded-xl border bg-card space-y-2">
      {/* Header: Avatar, Name, Price */}
      <div className="flex items-center gap-3">
        <ClientAvatar name={participant.client_name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{participant.client_name}</p>
          {showCreditLine && (
            <p className={cn(
              "text-xs",
              isDebt ? "text-warning" : "text-muted-foreground"
            )}>
              Kredit: {formatCurrency(credit_balance)} → {formatCurrency(afterBalance)}
              {isDebt ? ` (dluh ${formatCurrency(Math.abs(afterBalance))})` : ''}
            </p>
          )}
        </div>
        <div className="text-right flex items-center gap-1">
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                onKeyDown={handlePriceKeyDown}
                onBlur={handlePriceConfirm}
                className="w-20 h-8 text-right text-sm font-bold"
                autoFocus
                min={0}
                step={100}
              />
              <span className="text-xs text-muted-foreground">Kč</span>
              <button
                type="button"
                onClick={handlePriceConfirm}
                className="p-1 rounded-md hover:bg-secondary text-success"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="font-bold text-primary">{formatCurrency(price_share)}</span>
              {allowPriceEdit && onPriceChange && !disabled && (
                <button
                  type="button"
                  onClick={handlePriceEdit}
                  className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Upravit částku"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment method buttons - segmented control style */}
      <div className="flex gap-1">
        {paymentOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = payment_method === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(participant.client_id, option.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                disabled && "opacity-40 cursor-not-allowed"
              )}
              title={option.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
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
  // If client is cash only, default to cash
  if (paymentMode === 'cash_only') {
    return 'cash';
  }

  // Otherwise default to credit (can go to zero/negative = debt)
  if (paymentMode === 'credit' || paymentMode === 'mixed' || !paymentMode) {
    return 'credit';
  }

  return 'cash';
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

export function calculatePaymentSummary(participants: ParticipantPayment[]): PaymentSummary[] {
  const summary: Record<IndividualPaymentMethod, { total: number; count: number }> = {
    credit: { total: 0, count: 0 },
    cash: { total: 0, count: 0 },
    card: { total: 0, count: 0 },
    bank: { total: 0, count: 0 },
    pending: { total: 0, count: 0 },
  };

  participants.forEach(p => {
    // Only count participants who are actually paying something
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
