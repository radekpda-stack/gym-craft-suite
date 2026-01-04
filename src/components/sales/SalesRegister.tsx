import { useState, useMemo, useCallback } from 'react';
import { 
  ShoppingCart, 
  Loader2, 
  Package, 
  Banknote, 
  CreditCard as CardIcon, 
  Wallet,
  User,
  AlertTriangle,
  Check,
  Wrench,
  Building2,
  Coins,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/hooks/useProducts';
import { useProductsSortedBySales } from '@/hooks/useProductsSortedBySales';
import { useClients } from '@/hooks/useClients';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';
import { processSaleWithDiscount, showSaleResultToast, PaymentMethod } from '@/services/saleProcessor';
import { CartItemRow } from './CartItemRow';
import { CartSummary } from './CartSummary';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { useQueryClient } from '@tanstack/react-query';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'credit', label: 'Kredit', icon: Wallet },
  { value: 'card', label: 'Kartou', icon: CardIcon },
  { value: 'bank', label: 'Převod', icon: Building2 },
];

type SortOption = 'best_selling' | 'least_selling' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'best_selling', label: 'Nejprodávanější' },
  { value: 'least_selling', label: 'Nejméně prodávané' },
  { value: 'name_asc', label: 'Název A-Z' },
  { value: 'name_desc', label: 'Název Z-A' },
  { value: 'price_asc', label: 'Cena ↑' },
  { value: 'price_desc', label: 'Cena ↓' },
];

export function SalesRegister() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useProductsSortedBySales(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [noClient, setNoClient] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<SortOption>('best_selling');
  const [outOfStockLast, setOutOfStockLast] = useState(true);
  const [hideOutOfStock, setHideOutOfStock] = useState(false);

  // New cart hook with discount support
  const cart = useSalesCartWithDiscount({ clientId: noClient ? null : selectedClient || null });

  // Sort and filter products
  const sortedProducts = useMemo(() => {
    let result = [...products];

    // Filter out of stock if enabled (only applies to inventory items)
    if (hideOutOfStock) {
      result = result.filter(p => p.kind !== 'inventory' || (p.stock_quantity || 0) > 0);
    }

    // Sort based on option
    const compareFn = (a: Product, b: Product): number => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'cs');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'cs');
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'least_selling':
          // Reverse of default (best selling)
          return a.name.localeCompare(b.name, 'cs');
        case 'best_selling':
        default:
          // Already sorted by sales from hook
          return 0;
      }
    };

    if (sortBy !== 'best_selling') {
      result.sort(compareFn);
    }

    if (sortBy === 'least_selling') {
      result.reverse();
    }

    // Move out of stock to end if enabled
    if (outOfStockLast) {
      const inStock = result.filter(p => p.kind !== 'inventory' || (p.stock_quantity || 0) > 0);
      const outOfStock = result.filter(p => p.kind === 'inventory' && (p.stock_quantity || 0) <= 0);
      result = [...inStock, ...outOfStock];
    }

    return result;
  }, [products, sortBy, outOfStockLast, hideOutOfStock]);

  // Sort clients by last activity
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [clients]);

  const selectedClientData = clients.find(c => c.id === selectedClient);

  const handleNoClientToggle = useCallback(() => {
    setNoClient(!noClient);
    if (!noClient) {
      setSelectedClient('');
    }
  }, [noClient]);

  const handleSale = useCallback(async () => {
    if (cart.isEmpty) return;

    // Validate: credit payment requires client
    if (paymentMethod === 'credit' && !selectedClient) return;

    // Validate cart
    if (!cart.validation.isValid) return;

    setIsProcessing(true);
    try {
      const result = await processSaleWithDiscount({
        clientId: noClient ? null : selectedClient || null,
        paymentMethod,
        items: cart.items,
        orderDiscount: cart.orderDiscount,
        itemDiscounts: cart.itemsWithTotals
          .filter(item => item.lineDiscount && item.product.kind === 'inventory')
          .map(item => ({
            productId: item.product.id,
            type: item.lineDiscount!.type,
            value: item.lineDiscount!.value,
          })),
      });

      showSaleResultToast(result, cart.totals.totalAfterDiscount);

      if (result.success) {
        featureTracker.track('product_sale', 'finance', { 
          itemCount: cart.items.length, 
          totalAmount: cart.totals.totalAfterDiscount, 
          paymentMethod,
          hasDiscount: cart.totals.totalDiscount > 0,
          anonymous: noClient 
        });

        // Reset form
        cart.clear();
        setSelectedClient('');
        setNoClient(false);
        setPaymentMethod('cash');

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['products_sorted_by_sales'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
        queryClient.invalidateQueries({ queryKey: ['sales_stats'] });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, selectedClient, noClient, queryClient]);

  const isLowStock = (product: Product) => 
    product.kind === 'inventory' && product.stock_quantity <= product.low_stock_threshold;

  const getProductIcon = (product: Product) => {
    switch (product.kind) {
      case 'service':
        return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
      case 'credit_topup':
        return <Coins className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Package className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getProductKindLabel = (product: Product) => {
    switch (product.kind) {
      case 'service':
        return 'Služba';
      case 'credit_topup':
        return 'Dobití';
      default:
        return 'Produkt';
    }
  };

  // Check if checkout is disabled
  const checkoutDisabled = useMemo(() => {
    if (isProcessing) return true;
    if (cart.isEmpty) return true;
    if (!cart.validation.isValid) return true;
    if (paymentMethod === 'credit' && !selectedClient) return true;
    return false;
  }, [isProcessing, cart.isEmpty, cart.validation.isValid, paymentMethod, selectedClient]);

  // Check if credit topup in cart requires client
  const hasCreditTopup = cart.items.some(item => item.product.kind === 'credit_topup');
  const creditTopupNeedsClient = hasCreditTopup && noClient;

  if (productsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Client Selection */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4" />
            Klient
          </Label>
          <Button
            variant={noClient ? "default" : "outline"}
            size="sm"
            onClick={handleNoClientToggle}
            className="gap-2"
            disabled={hasCreditTopup}
          >
            {noClient ? <Check className="w-4 h-4" /> : null}
            Bez klienta
          </Button>
        </div>
        
        {!noClient ? (
          <ClientSearchSelect
            clients={sortedClients}
            value={selectedClient}
            onValueChange={setSelectedClient}
            placeholder="Vyhledat klienta..."
            showCreditBalance
            filterArchived={false}
          />
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
            Prodej bude zaznamenán bez přiřazení klientovi
            {creditTopupNeedsClient && (
              <p className="text-destructive mt-1 font-medium">
                ⚠️ Dobití kreditu vyžaduje výběr klienta
              </p>
            )}
          </div>
        )}

        {selectedClientData && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kredit:</span>
              <span className={cn(
                "font-semibold",
                (selectedClientData.credit_balance || 0) < 0 ? "text-destructive" : 
                (selectedClientData.credit_balance || 0) < 500 ? "text-warning" : "text-success"
              )}>
                {formatCurrency(selectedClientData.credit_balance || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {!cart.validation.isValid && !cart.isEmpty && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Nelze dokončit prodej</p>
              <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                {cart.validation.errors.map((error, idx) => (
                  <li key={idx}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid with Sorting */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <Label className="text-sm font-medium">Produkty a služby</Label>
          
          {/* Compact filters in popover for mobile */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Řazení</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Řazení</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="out-of-stock-last" className="text-sm cursor-pointer">
                      Vyprodané na konec
                    </Label>
                    <Switch
                      id="out-of-stock-last"
                      checked={outOfStockLast}
                      onCheckedChange={setOutOfStockLast}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hide-out-of-stock" className="text-sm cursor-pointer">
                      Skrýt vyprodané
                    </Label>
                    <Switch
                      id="hide-out-of-stock"
                      checked={hideOutOfStock}
                      onCheckedChange={setHideOutOfStock}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {sortedProducts.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Žádné produkty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Přidejte produkty v záložce Sklad
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {sortedProducts.map((product) => {
              const cartItem = cart.getItem(product.id);
              const inCart = !!cartItem;
              const lowStock = isLowStock(product);
              const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && cart.addItem(product)}
                  disabled={outOfStock}
                  className={cn(
                    "relative p-3 sm:p-4 rounded-xl text-left transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    outOfStock && "opacity-50 cursor-not-allowed",
                    inCart 
                      ? "bg-primary/20 ring-2 ring-primary" 
                      : "glass hover:bg-secondary/50",
                    lowStock && !outOfStock && "ring-1 ring-warning/50"
                  )}
                >
                  {/* Product type badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {getProductIcon(product)}
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {getProductKindLabel(product)}
                    </span>
                  </div>

                  {/* Name & Price */}
                  <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                  <p className="text-lg sm:text-xl font-bold text-primary mt-1">
                    {formatCurrency(product.price)}
                  </p>

                  {/* Credit delta for topups */}
                  {product.kind === 'credit_topup' && product.credit_delta > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      +{formatCurrency(product.credit_delta)} kredit
                    </p>
                  )}

                  {/* Stock info for inventory */}
                  {product.kind === 'inventory' && (
                    <div className="flex items-center gap-1 mt-2">
                      {outOfStock ? (
                        <span className="text-xs text-destructive font-medium">Vyprodáno</span>
                      ) : (
                        <>
                          {lowStock && <AlertTriangle className="w-3 h-3 text-warning" />}
                          <span className={cn(
                            "text-xs",
                            lowStock ? "text-warning font-medium" : "text-muted-foreground"
                          )}>
                            {product.stock_quantity || 0} ks
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* In cart indicator with count */}
                  {inCart && (
                    <Badge className="absolute -top-2 -right-2 bg-primary min-w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg">
                      {cartItem.quantity}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      {!cart.isEmpty && (
        <div className="glass rounded-xl p-4">
          <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ShoppingCart className="w-4 h-4" />
            Košík ({cart.totals.itemCount})
          </Label>

          <div className="space-y-2 mb-4">
            {cart.itemsWithTotals.map((item) => {
              const stockError = cart.validation.errors.find(
                e => e.productId === item.product.id && e.type === 'stock'
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
                />
              );
            })}
          </div>

          {/* Payment Method - Compact on mobile */}
          <div className="mb-4">
            <Label className="mb-2 block text-sm">Způsob platby</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-4 gap-1.5 sm:gap-2"
            >
              {PAYMENT_METHODS.map((method) => {
                // Credit requires client
                const disabled = method.value === 'credit' && !selectedClient && !noClient;
                // Credit topup cannot be paid by credit
                const disabledForTopup = method.value === 'credit' && hasCreditTopup;

                return (
                  <div key={method.value}>
                    <RadioGroupItem
                      value={method.value}
                      id={`payment-${method.value}`}
                      className="peer sr-only"
                      disabled={disabled || disabledForTopup}
                    />
                    <Label
                      htmlFor={`payment-${method.value}`}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 cursor-pointer transition-all",
                        "hover:bg-secondary/50",
                        paymentMethod === method.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border",
                        (disabled || disabledForTopup) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <method.icon className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6",
                        paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-[10px] sm:text-xs font-medium text-center leading-tight",
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

          {/* Cart Summary with Discounts */}
          <div className="mb-4">
            <CartSummary
              totals={cart.totals}
              orderDiscount={cart.orderDiscount}
              onOrderDiscountChange={cart.setOrderDiscount}
              clientCreditBalance={selectedClientData?.credit_balance}
              isPayingWithCredit={paymentMethod === 'credit'}
            />
          </div>

          {/* Credit info for non-credit payments */}
          {paymentMethod !== 'credit' && !hasCreditTopup && selectedClientData && (
            <p className="text-xs text-success mb-4">
              Kredit klienta nebude ovlivněn
            </p>
          )}
          {hasCreditTopup && paymentMethod !== 'credit' && selectedClientData && (
            <p className="text-xs text-amber-600 mb-4">
              Klientovi bude připsán kredit z dobíjecích položek
            </p>
          )}

          {/* Complete Sale Button */}
          <Button 
            onClick={handleSale} 
            disabled={checkoutDisabled} 
            className="w-full h-12 text-base gap-2"
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
      )}
    </div>
  );
}
