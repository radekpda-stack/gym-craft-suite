import { useState } from 'react';
import { Package, ShoppingCart, Plus, Minus, X, Loader2, AlertCircle, Banknote, CreditCard, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction, PaymentMethod } from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface QuickProductSaleProps {
  collapsed?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', shortLabel: 'Hot.', icon: Banknote },
  { value: 'credit', label: 'Z kreditu', shortLabel: 'Kred.', icon: Wallet },
  { value: 'card', label: 'Kartou', shortLabel: 'Kart.', icon: CreditCard },
];

export function QuickProductSale({ collapsed = false }: QuickProductSaleProps) {
  const { data: products = [], isLoading: productsLoading } = useProducts(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const createTransaction = useCreateTransaction();
  const updateProduct = useUpdateProduct();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProductToAdd);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProductToAdd('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSale = async () => {
    if (!selectedClient || cart.length === 0) return;

    setIsProcessing(true);
    try {
      const skipCreditUpdate = paymentMethod !== 'credit';

      for (const item of cart) {
        const itemTotal = item.product.price * item.quantity;
        await createTransaction.mutateAsync({
          client_id: selectedClient,
          amount: -itemTotal,
          type: 'product',
          description: `${item.product.name}${item.quantity > 1 ? ` (${item.quantity}x)` : ''}`,
          product_id: item.product.id,
          payment_method: paymentMethod,
          skip_credit_update: skipCreditUpdate,
        });

        if (item.product.category !== 'service') {
          const newStock = Math.max(0, (item.product.stock_quantity || 0) - item.quantity);
          await updateProduct.mutateAsync({
            id: item.product.id,
            stock_quantity: newStock,
          });
        }
      }

      featureTracker.track('product_sale', 'finance', { 
        itemCount: cart.length, 
        totalAmount, 
        paymentMethod 
      });
      resetForm();
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setCart([]);
    setSelectedProductToAdd('');
    setPaymentMethod('cash');
  };

  const availableProducts = products.filter(
    p => !cart.some(item => item.product.id === p.id)
  );

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
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="mt-1.5 sm:mt-2 h-10 sm:h-9">
                  <SelectValue placeholder="Vyberte klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{client.name}</span>
                        <span className={cn(
                          "text-xs",
                          (client.credit_balance || 0) < 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              className="grid grid-cols-3 gap-1.5 sm:gap-2"
            >
              {PAYMENT_METHODS.map((method) => (
                <div key={method.value}>
                  <RadioGroupItem
                    value={method.value}
                    id={`quick-payment-${method.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`quick-payment-${method.value}`}
                    className={cn(
                      "flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all",
                      "hover:bg-secondary/50",
                      paymentMethod === method.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border"
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
              ))}
            </RadioGroup>
            {paymentMethod === 'cash' && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Platba hotově se neodečte z kreditového účtu
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
                <Button variant="outline" size="sm" asChild onClick={() => setIsOpen(false)}>
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
                          {product.category !== 'service' && (
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
          {cart.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Košík ({cart.length})</Label>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.product.name}</p>
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
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </Button>
                      <span className="w-6 sm:w-5 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
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
          {cart.length > 0 && (
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
                {totalAmount.toLocaleString('cs-CZ')} Kč
              </p>
              {selectedClientData && paymentMethod === 'credit' && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Nový zůstatek: {' '}
                  <span className={cn(
                    "font-medium",
                    ((selectedClientData.credit_balance || 0) - totalAmount) < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {((selectedClientData.credit_balance || 0) - totalAmount).toLocaleString('cs-CZ')} Kč
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
            disabled={!selectedClient || cart.length === 0 || isProcessing} 
            className="w-full h-11 sm:h-10"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isProcessing ? 'Zpracovávám...' : `Prodat (${cart.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}