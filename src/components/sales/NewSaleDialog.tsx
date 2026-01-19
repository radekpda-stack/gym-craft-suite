import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Plus, Minus, X, Loader2, AlertCircle, Banknote, CreditCard, Wallet, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useProducts, Product } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useSalesCart, CartItem } from '@/hooks/useSalesCart';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { processSale, showSaleResultToast, PaymentMethod } from '@/services/saleProcessor';
import { cn } from '@/lib/utils';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { useQueryClient } from '@tanstack/react-query';

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', shortLabel: 'Hot.', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kred.', icon: Wallet },
  { value: 'card', label: 'Kartou', shortLabel: 'Kart.', icon: CreditCard },
  { value: 'bank', label: 'Převodem', shortLabel: 'Přev.', icon: Building },
];

export function NewSaleDialog({ open, onOpenChange }: NewSaleDialogProps) {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useProducts(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const cart = useSalesCart();

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get shared budget balance for selected client
  const { data: sharedBudget } = useSharedBudgetBalance(selectedClient || undefined);
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const effectiveBalance = sharedBudget?.displayBalance ?? selectedClientData?.credit_balance ?? 0;

  // Update cart validation when client changes
  useEffect(() => {
    cart.validation;
  }, [selectedClient]);

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProductToAdd);
    if (!product) return;
    cart.addItem(product, 1);
    setSelectedProductToAdd('');
  };

  const handleSale = async () => {
    if (cart.items.length === 0) return;
    
    // Check if credit payment requires client
    if (paymentMethod === 'credit' && !selectedClient) return;
    
    // Check if credit_topup requires client
    const hasCreditTopup = cart.items.some(item => item.product.kind === 'credit_topup');
    if (hasCreditTopup && !selectedClient) return;

    setIsProcessing(true);
    try {
      const result = await processSale({
        clientId: selectedClient || null,
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
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
        
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    cart.clear();
    setSelectedProductToAdd('');
    setPaymentMethod('cash');
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) resetForm();
  };

  const availableProducts = products.filter(
    p => !cart.items.some(item => item.product.id === p.id)
  );

  const hasCreditTopup = cart.items.some(item => item.product.kind === 'credit_topup');
  const canCheckout = cart.items.length > 0 && 
    !isProcessing &&
    (paymentMethod !== 'credit' || selectedClient) &&
    (!hasCreditTopup || selectedClient) &&
    !cart.validation.hasStockIssues;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            Nový prodej
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div>
            <Label className="text-xs sm:text-sm">Klient (volitelné)</Label>
            {clientsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
                {(selectedClientData.credit_balance || 0).toLocaleString('cs-CZ')} Kč
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
                const isDisabled = method.value === 'credit' && hasCreditTopup;
                return (
                  <div key={method.value}>
                    <RadioGroupItem
                      value={method.value}
                      id={`payment-${method.value}`}
                      className="peer sr-only"
                      disabled={isDisabled}
                    />
                    <Label
                      htmlFor={`payment-${method.value}`}
                      className={cn(
                        "flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all",
                        "hover:bg-secondary/50",
                        paymentMethod === method.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border",
                        isDisabled && "opacity-50 cursor-not-allowed"
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
            {paymentMethod !== 'credit' && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Platba se neodečte z kreditového účtu
              </p>
            )}
            {hasCreditTopup && paymentMethod === 'credit' && (
              <p className="text-[10px] sm:text-xs text-warning">
                Dobití kreditu nelze platit kreditem
              </p>
            )}
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
                <Button variant="outline" size="sm" asChild onClick={() => onOpenChange(false)}>
                  <Link to="/settings">Přidat produkty v nastavení</Link>
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
                          <span>{product.name} - {product.price.toLocaleString('cs-CZ')} Kč</span>
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
                          {product.kind === 'credit_topup' && (
                            <span className="text-xs text-emerald-500">
                              +{(product.credit_delta || 0).toLocaleString('cs-CZ')} Kč
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

          {/* Validation Errors */}
          {cart.validation.hasStockIssues && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive font-medium">Nedostatek skladem:</p>
              <ul className="text-xs text-destructive mt-1">
                {cart.validation.errors.filter(e => e.type === 'insufficient_stock').map((error, i) => (
                  <li key={i}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {hasCreditTopup && !selectedClient && (
            <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-xs text-warning font-medium">
                Dobití kreditu vyžaduje výběr klienta
              </p>
            </div>
          )}

          {/* Cart */}
          {cart.items.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Košík ({cart.items.length})</Label>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {cart.items.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-xs sm:text-sm truncate">{item.product.name}</p>
                        {item.product.kind === 'credit_topup' && (
                          <span className="text-[10px] text-emerald-500 font-medium">
                            +{(item.product.credit_delta || 0).toLocaleString('cs-CZ')} Kč
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {item.product.price.toLocaleString('cs-CZ')} Kč × {item.quantity} = {' '}
                        <span className="font-medium text-foreground">
                          {(item.product.price * item.quantity).toLocaleString('cs-CZ')} Kč
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
                {cart.totalAmount.toLocaleString('cs-CZ')} Kč
              </p>
              {selectedClientData && paymentMethod === 'credit' && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Nový zůstatek: {' '}
                  <span className={cn(
                    "font-medium",
                    (effectiveBalance - cart.totalAmount) < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {(effectiveBalance - cart.totalAmount).toLocaleString('cs-CZ')} Kč
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
            disabled={!canCheckout} 
            className="w-full h-11 sm:h-10"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isProcessing ? 'Zpracovávám...' : `Prodat (${cart.items.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
