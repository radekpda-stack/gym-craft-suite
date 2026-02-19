import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  isProcessing: boolean;
  checkoutDisabled: boolean;
  onCheckout: () => void;
  onScrollToCart: () => void;
}

export function MobileCartBar({ 
  itemCount, 
  total, 
  isProcessing, 
  checkoutDisabled, 
  onCheckout,
  onScrollToCart
}: MobileCartBarProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-[88px] left-0 right-0 z-40 lg:hidden px-3 pb-2">
      <div className={cn(
        "flex items-center justify-between gap-3",
        "px-4 py-3 rounded-2xl",
        "bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/10"
      )}>
        <button 
          onClick={onScrollToCart}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <span className="font-bold text-base tabular-nums">{formatCurrency(total)}</span>
        </button>

        <Button
          size="sm"
          disabled={checkoutDisabled || isProcessing}
          onClick={onCheckout}
          className="px-5 rounded-xl font-semibold"
        >
          Zaplatit
        </Button>
      </div>
    </div>
  );
}
