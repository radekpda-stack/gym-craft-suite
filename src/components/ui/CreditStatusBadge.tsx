import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface CreditStatusBadgeProps {
  balance: number | null | undefined;
  groupBalance?: number | null;
  isGroup?: boolean;
  className?: string;
}

export function CreditStatusBadge({ 
  balance, 
  groupBalance,
  isGroup = false,
  className 
}: CreditStatusBadgeProps) {
  // Use group balance if client is in a group, otherwise use individual balance
  const displayBalance = isGroup ? (groupBalance ?? 0) : (balance ?? 0);
  const numBalance = displayBalance;
  
  const status = numBalance > 500 ? 'ok' : numBalance > 0 ? 'low' : 'zero';
  
  const config = {
    ok: {
      bgClass: 'bg-success/15 text-success',
    },
    low: {
      bgClass: 'bg-warning/15 text-warning',
    },
    zero: {
      bgClass: 'bg-destructive/15 text-destructive',
    },
  };
  
  const { bgClass } = config[status];
  
  // Format amount
  const formattedAmount = numBalance.toLocaleString('cs-CZ');
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide',
        bgClass,
        className
      )}
    >
      {isGroup && <Users className="w-3 h-3" />}
      {formattedAmount} Kč
    </span>
  );
}
