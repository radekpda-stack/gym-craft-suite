/**
 * ParticipantPaymentCard Component
 * 
 * Premium floating card for each participant with animated payment method selection.
 * Now includes editable price share for custom payment splits.
 * Auto-fills payment method based on client preferences.
 */
import { Wallet, Banknote, CreditCard, Building2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
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
  { value: 'cash', label: 'Hotově', shortLabel: 'Cash', icon: Banknote },
  { value: 'card', label: 'Kartou', shortLabel: 'Karta', icon: CreditCard },
  { value: 'bank', label: 'Převodem', shortLabel: 'Banka', icon: Building2 },
  { value: 'pending', label: 'Později', shortLabel: 'Dluží', icon: Clock },
];

export function ParticipantPaymentCard({ 
  participant, 
  onChange,
  onPriceChange,
  disabled,
  allowPriceEdit = true,
}: ParticipantPaymentCardProps) {
  const { credit_balance, price_share, payment_method } = participant;

  const afterBalance = credit_balance - price_share;
  const isDebt = afterBalance < 0;
  const isLowCredit = afterBalance >= 0 && afterBalance < 1000;
  const showCreditLine = payment_method === 'credit';

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = Math.max(0, parseInt(e.target.value) || 0);
    onPriceChange?.(participant.client_id, newPrice);
  };

  // Find active index for pill animation
  const activeIndex = paymentOptions.findIndex(opt => opt.value === payment_method);

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
      {/* Header: Avatar, Name, Price */}
      <div className="flex items-center gap-3">
        <ClientAvatar name={participant.client_name} size="sm" className="ring-2 ring-border/30" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{participant.client_name}</p>
          {showCreditLine && (
            <p className={cn(
              "text-xs tabular-nums",
              isDebt ? "text-destructive" : isLowCredit ? "text-warning" : "text-muted-foreground"
            )}>
              Kredit: {formatCurrency(credit_balance)} → {formatCurrency(afterBalance)}
              {isDebt && <span className="font-medium"> (dluh {formatCurrency(Math.abs(afterBalance))})</span>}
            </p>
          )}
        </div>
        <div className="text-right flex items-center gap-1">
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

      {/* Payment method buttons - animated pill style */}
      <div className="relative flex gap-1 p-1 rounded-xl bg-secondary/40 border border-border/30">
        {/* Animated background indicator */}
        <motion.div
          className="absolute inset-y-1 bg-primary rounded-lg shadow-sm"
          initial={false}
          animate={{
            left: `calc(${activeIndex * (100 / paymentOptions.length)}% + 4px)`,
            width: `calc(${100 / paymentOptions.length}% - 8px)`,
          }}
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 30,
          }}
        />
        
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
                "relative z-10 flex-1 flex items-center justify-center gap-0.5 py-2 px-0.5 rounded-lg text-[10px] font-medium transition-colors min-w-0",
                isSelected
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "opacity-40 cursor-not-allowed"
              )}
              title={option.label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline truncate">{option.shortLabel}</span>
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
