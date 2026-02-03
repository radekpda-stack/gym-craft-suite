import { 
  ShoppingCart, 
  Trash2, 
  Banknote, 
  CreditCard as CardIcon, 
  Wallet,
  Building2,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PaymentMethod } from '@/services/saleProcessor';
import { CartItemRow } from './CartItemRow';
import { CartSummary } from './CartSummary';
import { cn } from '@/lib/utils';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'credit', label: 'Kredit', icon: Wallet },
  { value: 'card', label: 'Kartou', icon: CardIcon },
  { value: 'bank', label: 'Převod', icon: Building2 },
];

interface CartPanelProps {
  cart: ReturnType<typeof useSalesCartWithDiscount>;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  saleNote: string;
  onSaleNoteChange: (note: string) => void;
  clientCreditBalance?: number | null;
  hasCreditTopup: boolean;
  isProcessing: boolean;
  checkoutDisabled: boolean;
  onSale: () => void;
  selectedClient: string;
  noClient: boolean;
}

export function CartPanel({
  cart,
  paymentMethod,
  onPaymentMethodChange,
  saleNote,
  onSaleNoteChange,
  clientCreditBalance,
  hasCreditTopup,
  isProcessing,
  checkoutDisabled,
  onSale,
  selectedClient,
  noClient,
}: CartPanelProps) {
  if (cart.isEmpty) {
    return (
      <div className="card-floating rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
          <ShoppingCart className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Košík je prázdný</p>
        <p className="text-xs text-muted-foreground mt-1">Kliknutím na produkt ho přidáte</p>
      </div>
    );
  }

  const hasMinPriceIssue = cart.validation.errors.some(e => e.type === 'min_price');
  const activeIndex = PAYMENT_METHODS.findIndex(m => m.value === paymentMethod);

  return (
    <div className="card-floating rounded-xl p-4 space-y-4">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          Košík ({cart.totals.itemCount})
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={cart.clear}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          <span className="text-xs">Vyčistit</span>
        </Button>
      </div>

      {/* Validation Errors */}
      {!cart.validation.isValid && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 ring-1 ring-destructive/20">
          <div className="flex items-start gap-2">
            <div className="p-1 rounded-md bg-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Nelze dokončit prodej</p>
              <ul className="text-xs text-destructive/80 mt-1 space-y-0.5">
                {cart.validation.errors.map((error, idx) => (
                  <li key={idx}>• {error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {cart.itemsWithTotals.map((item) => {
          const stockError = cart.validation.errors.find(
            e => e.productId === item.product.id && e.type === 'stock'
          );
          const minPriceError = cart.validation.errors.find(
            e => e.productId === item.product.id && e.type === 'min_price'
          );

          return (
            <CartItemRow
              key={item.product.id}
              product={item.product}
              quantity={item.quantity}
              lineTotal={item.lineTotal}
              lineDiscount={item.lineDiscount}
              lineDiscountAmount={item.lineDiscountAmount}
              lineTotalAfterDiscount={item.lineTotalAfterDiscount}
              onQuantityChange={(qty) => cart.setQuantityDirect(item.product.id, qty)}
              onIncrement={(amt) => cart.incrementQuantity(item.product.id, amt)}
              onDecrement={() => cart.decrementQuantity(item.product.id)}
              onRemove={() => cart.removeItem(item.product.id)}
              onLineDiscountChange={(discount) => cart.setLineDiscount(item.product.id, discount)}
              stockIssue={!!stockError}
              minPriceIssue={!!minPriceError}
              minPriceMessage={minPriceError?.message}
            />
          );
        })}
      </div>

      {/* Payment Method - Animated Pills */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-wide">Způsob platby</Label>
        <div className="relative bg-secondary/30 rounded-xl p-1">
          {/* Animated background indicator */}
          <motion.div
            className="absolute inset-y-1 bg-primary rounded-lg shadow-sm"
            animate={{
              left: `calc(${activeIndex * 25}% + 4px)`,
              width: `calc(25% - 8px)`,
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
          
          <div className="relative grid grid-cols-4 gap-1">
            {PAYMENT_METHODS.map((method) => {
              const disabled = method.value === 'credit' && !selectedClient && !noClient;
              const disabledForTopup = method.value === 'credit' && hasCreditTopup;
              const isActive = paymentMethod === method.value;

              return (
                <button
                  key={method.value}
                  onClick={() => !disabled && !disabledForTopup && onPaymentMethodChange(method.value)}
                  disabled={disabled || disabledForTopup}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-lg transition-colors z-10",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    (disabled || disabledForTopup) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <method.icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sale Note */}
      <div>
        <Label htmlFor="sale-note" className="text-xs text-muted-foreground">
          Poznámka (volitelné)
        </Label>
        <Input
          id="sale-note"
          value={saleNote}
          onChange={(e) => onSaleNoteChange(e.target.value)}
          placeholder="Např. sleva za věrnost..."
          className="mt-1 h-9 text-sm bg-card/60 backdrop-blur-sm border-border/50"
        />
      </div>

      {/* Cart Summary */}
      <CartSummary
        totals={cart.totals}
        orderDiscount={cart.orderDiscount}
        onOrderDiscountChange={cart.setOrderDiscount}
        clientCreditBalance={clientCreditBalance}
        isPayingWithCredit={paymentMethod === 'credit'}
      />

      {/* Credit info messages */}
      {paymentMethod !== 'credit' && !hasCreditTopup && clientCreditBalance != null && (
        <p className="text-xs text-success">
          Kredit klienta nebude ovlivněn
        </p>
      )}
      {hasCreditTopup && paymentMethod !== 'credit' && clientCreditBalance != null && (
        <p className="text-xs text-warning">
          Klientovi bude připsán kredit z dobíjecích položek
        </p>
      )}

      {/* Complete Sale Button */}
      <Button 
        onClick={onSale} 
        disabled={checkoutDisabled} 
        className={cn(
          "w-full h-12 text-sm gap-2 font-bold",
          "bg-success hover:bg-success/90 text-success-foreground",
          "shadow-lg shadow-success/25 transition-all",
          "active:scale-[0.98]"
        )}
        size="lg"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Check className="w-5 h-5" />
        )}
        {isProcessing ? 'Zpracovávám...' : 'Dokončit prodej'}
      </Button>
    </div>
  );
}
