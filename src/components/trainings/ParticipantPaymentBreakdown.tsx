/**
 * ParticipantPaymentBreakdown Component
 * 
 * Shows how each participant paid in a completed training session.
 * Used in TrainingCloseSection for multi-participant trainings.
 */
import { Wallet, Banknote, CreditCard, Building2, Clock, User } from 'lucide-react';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

export interface ParticipantPaymentInfo {
  client_id: string;
  client_name: string;
  price_share: number;
  payment_method: string | null;
}

interface ParticipantPaymentBreakdownProps {
  participants: ParticipantPaymentInfo[];
}

const paymentMethodIcons: Record<string, typeof Wallet> = {
  credit: Wallet,
  cash: Banknote,
  card: CreditCard,
  bank: Building2,
  pending: Clock,
};

const paymentMethodLabels: Record<string, string> = {
  credit: 'Kredit',
  cash: 'Hotovost',
  card: 'Karta',
  bank: 'Převod',
  pending: 'Neuhrazeno',
};

export function ParticipantPaymentBreakdown({ participants }: ParticipantPaymentBreakdownProps) {
  if (participants.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        Platby účastníků
      </p>
      <div className="grid gap-2">
        {participants.map((participant) => {
          const method = participant.payment_method || 'credit';
          const Icon = paymentMethodIcons[method] || Wallet;
          const label = paymentMethodLabels[method] || method;
          const isPaid = method !== 'pending';

          return (
            <div 
              key={participant.client_id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                isPaid ? "bg-success/5 border border-success/20" : "bg-warning/5 border border-warning/20"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ClientAvatar name={participant.client_name} size="xs" />
                <span className="text-sm font-medium truncate">
                  {participant.client_name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                  isPaid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {formatCurrency(participant.price_share)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
