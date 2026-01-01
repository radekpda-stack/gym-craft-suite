import { cn } from '@/lib/utils';

interface CreditStatusBadgeProps {
  balance: number | null | undefined;
  className?: string;
  showAmount?: boolean;
}

export function CreditStatusBadge({ balance, className, showAmount = false }: CreditStatusBadgeProps) {
  const numBalance = balance ?? 0;
  
  const status = numBalance > 500 ? 'ok' : numBalance > 0 ? 'low' : 'zero';
  
  const config = {
    ok: {
      label: 'OK',
      bgClass: 'bg-success/15 text-success',
    },
    low: {
      label: 'Low',
      bgClass: 'bg-warning/15 text-warning',
    },
    zero: {
      label: 'Zero',
      bgClass: 'bg-destructive/15 text-destructive',
    },
  };
  
  const { label, bgClass } = config[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
        bgClass,
        className
      )}
    >
      {showAmount ? `${numBalance.toLocaleString('cs-CZ')} Kč` : label}
    </span>
  );
}
