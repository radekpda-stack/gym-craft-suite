import { Separator } from '@/components/ui/separator';
import { CartDiscountSection } from './CartDiscountSection';
import { CartDiscount, CartTotals } from '@/hooks/useSalesCartWithDiscount';
import { cn } from '@/lib/utils';

interface CartSummaryProps {
  totals: CartTotals;
  orderDiscount: CartDiscount | null;
  onOrderDiscountChange: (discount: CartDiscount | null) => void;
  clientCreditBalance?: number | null;
  isPayingWithCredit?: boolean;
  className?: string;
}

export function CartSummary({
  totals,
  orderDiscount,
  onOrderDiscountChange,
  clientCreditBalance,
  isPayingWithCredit,
  className,
}: CartSummaryProps) {
  const hasDiscount = totals.totalDiscount > 0;
  const hasProducts = totals.productsSubtotal > 0;
  const hasServices = totals.servicesSubtotal > 0;
  const showBreakdown = hasProducts && hasServices;

  // Calculate new balance after credit payment
  const newCreditBalance = clientCreditBalance != null && isPayingWithCredit
    ? clientCreditBalance - totals.totalAfterDiscount
    : null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Breakdown by type */}
      {showBreakdown && (
        <>
          <div className="space-y-1.5 text-sm p-3 rounded-xl bg-secondary/30">
            <div className="flex justify-between text-muted-foreground">
              <span>Produkty</span>
              <span className="tabular-nums">{totals.productsSubtotal.toLocaleString('cs-CZ')} Kč</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Služby</span>
              <span className="tabular-nums">{totals.servicesSubtotal.toLocaleString('cs-CZ')} Kč</span>
            </div>
          </div>
          <Separator className="bg-border/50" />
        </>
      )}

      {/* Discount section */}
      {hasProducts && (
        <CartDiscountSection
          discount={orderDiscount}
          onDiscountChange={onOrderDiscountChange}
          productsSubtotal={totals.productsSubtotal}
        />
      )}

      {/* Total discount display */}
      {hasDiscount && (
        <div className="flex justify-between text-sm p-2 rounded-lg bg-destructive/10">
          <span className="text-muted-foreground">Celková sleva</span>
          <span className="text-destructive font-semibold tabular-nums">
            -{totals.totalDiscount.toLocaleString('cs-CZ')} Kč
          </span>
        </div>
      )}

      <Separator className="bg-border/50" />

      {/* Total */}
      <div className="flex justify-between items-center p-3 rounded-xl bg-primary/5">
        <span className="font-semibold">Celkem</span>
        <span className="text-2xl font-bold tabular-nums">
          {totals.totalAfterDiscount.toLocaleString('cs-CZ')} Kč
        </span>
      </div>

      {/* New credit balance */}
      {newCreditBalance !== null && (
        <div className={cn(
          'flex justify-between text-sm p-3 rounded-xl border',
          newCreditBalance >= 0 
            ? 'bg-success/10 border-success/30' 
            : 'bg-destructive/10 border-destructive/30'
        )}>
          <span className="text-muted-foreground">Nový zůstatek kreditu</span>
          <span className={cn(
            'font-semibold tabular-nums',
            newCreditBalance >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {newCreditBalance.toLocaleString('cs-CZ')} Kč
          </span>
        </div>
      )}
    </div>
  );
}
