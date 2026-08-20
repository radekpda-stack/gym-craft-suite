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
  LucideIcon,
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
import { SalesSegmented } from './ui/SalesUI';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
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

  return (
    <div data-cart-panel className="card-floating rounded-xl p-4 space-y-4">
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

      {/* Payment Method - Segmented Toggle */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-wide">Způsob platby</Label>
        <SalesSegmented
          options={PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label, icon: m.icon }))}
          value={paymentMethod}
          onChange={(v) => {
            const disabled = v === 'credit' && !selectedClient && !noClient;
            const disabledForTopup = v === 'credit' && hasCreditTopup;
            if (!disabled && !disabledForTopup) onPaymentMethodChange(v);
          }}
        />
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

      {/* Complete Sale Button - Premium with glow */}
      <Button 
        onClick={onSale} 
        disabled={checkoutDisabled} 
        className={cn(
          "relative w-full h-12 text-sm gap-2 font-bold overflow-hidden",
          "bg-success hover:bg-success/90 text-success-foreground",
          "shadow-lg transition-all duration-200",
          "active:scale-[0.98]",
          !checkoutDisabled && "shadow-success/40 hover:shadow-xl hover:shadow-success/50"
        )}
        size="lg"
      >
        {/* Subtle glow overlay when ready */}
        {!checkoutDisabled && !isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
        )}
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
