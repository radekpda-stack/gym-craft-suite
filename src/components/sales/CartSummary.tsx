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
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Produkty</span>
              <span>{totals.productsSubtotal.toLocaleString('cs-CZ')} Kč</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Služby</span>
              <span>{totals.servicesSubtotal.toLocaleString('cs-CZ')} Kč</span>
            </div>
          </div>
          <Separator />
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Celková sleva</span>
          <span className="text-destructive font-medium">
            -{totals.totalDiscount.toLocaleString('cs-CZ')} Kč
          </span>
        </div>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="font-semibold">Celkem</span>
        <span className="text-xl font-bold">
          {totals.totalAfterDiscount.toLocaleString('cs-CZ')} Kč
        </span>
      </div>

      {/* New credit balance */}
      {newCreditBalance !== null && (
        <div className={cn(
          'flex justify-between text-sm p-2 rounded-lg',
          newCreditBalance >= 0 ? 'bg-primary/10' : 'bg-destructive/10'
        )}>
          <span className="text-muted-foreground">Nový zůstatek kreditu</span>
          <span className={cn(
            'font-medium',
            newCreditBalance >= 0 ? 'text-primary' : 'text-destructive'
          )}>
            {newCreditBalance.toLocaleString('cs-CZ')} Kč
          </span>
        </div>
      )}
    </div>
  );
}
