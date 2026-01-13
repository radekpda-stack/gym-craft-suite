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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PaymentMethod } from '@/services/saleProcessor';
import { CartItemRow } from './CartItemRow';
import { CartSummary } from './CartSummary';
import { cn } from '@/lib/utils';
import { useSalesCartWithDiscount, CartValidationError } from '@/hooks/useSalesCartWithDiscount';

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
  selectedClientData?: { credit_balance?: number | null } | null;
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
  selectedClientData,
  hasCreditTopup,
  isProcessing,
  checkoutDisabled,
  onSale,
  selectedClient,
  noClient,
}: CartPanelProps) {
  if (cart.isEmpty) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground text-sm">Košík je prázdný</p>
        <p className="text-xs text-muted-foreground mt-1">Kliknutím na produkt ho přidáte</p>
      </div>
    );
  }

  const hasMinPriceIssue = cart.validation.errors.some(e => e.type === 'min_price');

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <ShoppingCart className="w-4 h-4" />
          Košík ({cart.totals.itemCount})
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={cart.clear}
          className="text-destructive hover:text-destructive h-8 px-2"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          <span className="text-xs">Vyčistit</span>
        </Button>
      </div>

      {/* Validation Errors */}
      {!cart.validation.isValid && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
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

      {/* Payment Method */}
      <div>
        <Label className="mb-2 block text-xs text-muted-foreground">Způsob platby</Label>
        <RadioGroup 
          value={paymentMethod} 
          onValueChange={(v) => onPaymentMethodChange(v as PaymentMethod)}
          className="grid grid-cols-4 gap-1.5"
        >
          {PAYMENT_METHODS.map((method) => {
            const disabled = method.value === 'credit' && !selectedClient && !noClient;
            const disabledForTopup = method.value === 'credit' && hasCreditTopup;

            return (
              <div key={method.value}>
                <RadioGroupItem
                  value={method.value}
                  id={`panel-payment-${method.value}`}
                  className="peer sr-only"
                  disabled={disabled || disabledForTopup}
                />
                <Label
                  htmlFor={`panel-payment-${method.value}`}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border-2 cursor-pointer transition-all",
                    "hover:bg-secondary/50",
                    paymentMethod === method.value 
                      ? "border-primary bg-primary/10" 
                      : "border-border",
                    (disabled || disabledForTopup) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <method.icon className={cn(
                    "w-4 h-4",
                    paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                  )}>
                    {method.label}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
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
          className="mt-1 h-8 text-sm"
        />
      </div>

      {/* Cart Summary */}
      <CartSummary
        totals={cart.totals}
        orderDiscount={cart.orderDiscount}
        onOrderDiscountChange={cart.setOrderDiscount}
        clientCreditBalance={selectedClientData?.credit_balance}
        isPayingWithCredit={paymentMethod === 'credit'}
      />

      {/* Credit info messages */}
      {paymentMethod !== 'credit' && !hasCreditTopup && selectedClientData && (
        <p className="text-xs text-success">
          Kredit klienta nebude ovlivněn
        </p>
      )}
      {hasCreditTopup && paymentMethod !== 'credit' && selectedClientData && (
        <p className="text-xs text-warning">
          Klientovi bude připsán kredit z dobíjecích položek
        </p>
      )}

      {/* Complete Sale Button */}
      <Button 
        onClick={onSale} 
        disabled={checkoutDisabled} 
        className="w-full h-11 text-sm gap-2"
        size="lg"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        {isProcessing ? 'Zpracovávám...' : 'Dokončit prodej'}
      </Button>
    </div>
  );
}
