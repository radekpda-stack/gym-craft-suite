import { useState, useCallback } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Loader2, 
  AlertCircle, 
  Banknote, 
  CreditCard, 
  Wallet,
  Building2,
  Coins
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useProducts, Product } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useSalesCart } from '@/hooks/useSalesCart';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { processSale, showSaleResultToast, PaymentMethod } from '@/services/saleProcessor';
import { cn } from '@/lib/utils';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { formatCurrency } from '@/lib/formatters';
import { useQueryClient } from '@tanstack/react-query';

interface QuickProductSaleProps {
  collapsed?: boolean;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', shortLabel: 'Hot.', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kred.', icon: Wallet },
  { value: 'card', label: 'Kartou', shortLabel: 'Kart.', icon: CreditCard },
  { value: 'bank', label: 'Převod', shortLabel: 'Přev.', icon: Building2 },
];

export function QuickProductSale({ collapsed = false }: QuickProductSaleProps) {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useProducts(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Shared cart hook
  const cart = useSalesCart({ clientId: selectedClient || null });

  // Get shared budget balance for selected client
  const { data: sharedBudget } = useSharedBudgetBalance(selectedClient || undefined);
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const effectiveBalance = sharedBudget?.displayBalance ?? selectedClientData?.credit_balance ?? 0;
  const hasCreditTopup = cart.items.some(item => item.product.kind === 'credit_topup');

  const addToCart = useCallback(() => {
    const product = products.find(p => p.id === selectedProductToAdd);
    if (!product) return;
    cart.addItem(product);
    setSelectedProductToAdd('');
  }, [products, selectedProductToAdd, cart]);

  const handleSale = useCallback(async () => {
    if (!selectedClient || cart.items.length === 0) return;
    if (!cart.validation.isValid) return;

    setIsProcessing(true);
    try {
      const result = await processSale({
        clientId: selectedClient,
        paymentMethod,
        items: cart.items,
      });

      showSaleResultToast(result, cart.totalAmount);

      if (result.success) {
        featureTracker.track('product_sale', 'finance', { 
          itemCount: cart.items.length, 
          totalAmount: cart.totalAmount, 
          paymentMethod 
        });
        resetForm();
        setIsOpen(false);

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedClient, cart, paymentMethod, queryClient]);

  const resetForm = useCallback(() => {
    setSelectedClient('');
    cart.clear();
    setSelectedProductToAdd('');
    setPaymentMethod('cash');
  }, [cart]);

  const availableProducts = products.filter(
    p => !cart.hasItem(p.id)
  );

  const getProductIcon = (product: Product) => {
    if (product.kind === 'credit_topup') return <Coins className="w-3 h-3 text-amber-500" />;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {!collapsed && (
            <span className="font-medium truncate">Prodej</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            Prodej produktů
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div>
            <Label className="text-xs sm:text-sm">Klient</Label>
            {clientsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground">Žádní klienti nejsou k dispozici</p>
                <Button variant="outline" size="sm" asChild onClick={() => setIsOpen(false)}>
                  <Link to="/clients">Přidat klienta</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-1.5 sm:mt-2">
                <ClientSearchSelect
                  clients={clients}
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                  placeholder="Vyhledat klienta..."
                  showCreditBalance
                  filterArchived={false}
                />
              </div>
            )}
          </div>

          {selectedClientData && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-secondary/50 text-xs sm:text-sm">
              <span className="text-muted-foreground">Kredit: </span>
              <span className={cn(
                "font-semibold",
                (selectedClientData.credit_balance || 0) < 0 ? "text-destructive" : 
                (selectedClientData.credit_balance || 0) < 500 ? "text-warning" : "text-success"
              )}>
                {formatCurrency(selectedClientData.credit_balance || 0)}
              </span>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Způsob platby</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="grid grid-cols-4 gap-1.5 sm:gap-2"
            >
              {PAYMENT_METHODS.map((method) => {
                const disabled = method.value === 'credit' && hasCreditTopup;
                return (
                  <div key={method.value}>
                    <RadioGroupItem
                      value={method.value}
                      id={`quick-payment-${method.value}`}
                      className="peer sr-only"
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`quick-payment-${method.value}`}
                      className={cn(
                        "flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all",
                        "hover:bg-secondary/50",
                        paymentMethod === method.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <method.icon className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5",
                        paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-[10px] sm:text-xs font-medium text-center",
                        paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        <span className="hidden xs:inline">{method.label}</span>
                        <span className="xs:hidden">{method.shortLabel}</span>
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Add product */}
          <div>
            <Label className="text-xs sm:text-sm">Přidat produkt</Label>
            {productsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground">Žádné produkty nejsou dostupné</p>
                <Button variant="outline" size="sm" asChild onClick={() => setIsOpen(false)}>
                  <Link to="/sales">Přidat produkty v nastavení</Link>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1.5 sm:mt-2">
                <Select value={selectedProductToAdd} onValueChange={setSelectedProductToAdd}>
                  <SelectTrigger className="flex-1 h-10 sm:h-9">
                    <SelectValue placeholder="Vyberte produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-2">
                            {getProductIcon(product)}
                            <span>{product.name} - {formatCurrency(product.price)}</span>
                          </div>
                          {product.kind === 'inventory' && (
                            <span className={cn(
                              "text-xs",
                              (product.stock_quantity || 0) <= (product.low_stock_threshold || 5) 
                                ? "text-warning" 
                                : "text-muted-foreground"
                            )}>
                              ({product.stock_quantity || 0} ks)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={addToCart} 
                  disabled={!selectedProductToAdd}
                  size="icon"
                  className="h-10 w-10 sm:h-9 sm:w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.items.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Košík ({cart.totalItems})</Label>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {cart.items.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.product.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatCurrency(item.product.price)} × {item.quantity} = {' '}
                        <span className="font-medium text-foreground">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7"
                        onClick={() => cart.decrementQuantity(item.product.id)}
                      >
                        <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </Button>
                      <span className="w-6 sm:w-5 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7"
                        onClick={() => cart.incrementQuantity(item.product.id)}
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                        onClick={() => cart.removeItem(item.product.id)}
                      >
                        <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          {cart.items.length > 0 && (
            <div className={cn(
              "p-3 sm:p-4 rounded-xl border",
              paymentMethod === 'credit' 
                ? "bg-primary/10 border-primary/20" 
                : "bg-success/10 border-success/20"
            )}>
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Celkem:</p>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.icon && (
                    (() => {
                      const Icon = PAYMENT_METHODS.find(m => m.value === paymentMethod)!.icon;
                      return <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />;
                    })()
                  )}
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
                  </span>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatCurrency(cart.totalAmount)}
              </p>
              {selectedClientData && paymentMethod === 'credit' && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Nový zůstatek: {' '}
                  <span className={cn(
                    "font-medium",
                    (effectiveBalance - cart.totalAmount) < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {formatCurrency(effectiveBalance - cart.totalAmount)}
                  </span>
                </p>
              )}
              {paymentMethod !== 'credit' && (
                <p className="text-[10px] sm:text-xs text-success mt-1">
                  Kredit klienta nebude ovlivněn
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={handleSale} 
            disabled={!selectedClient || cart.items.length === 0 || isProcessing || !cart.validation.isValid} 
            className="w-full h-11 sm:h-10"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isProcessing ? 'Zpracovávám...' : `Prodat (${cart.totalItems})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
