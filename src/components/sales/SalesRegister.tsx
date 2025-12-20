import { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Loader2, 
  Package, 
  Banknote, 
  CreditCard as CardIcon, 
  Wallet,
  User,
  AlertTriangle,
  Check,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Badge } from '@/components/ui/badge';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction, PaymentMethod } from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface CartItem {
  product: Product;
  quantity: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'cash', label: 'Hotově', icon: Banknote },
  { value: 'credit', label: 'Kredit', icon: Wallet },
  { value: 'card', label: 'Kartou', icon: CardIcon },
];

export function SalesRegister() {
  const { data: products = [], isLoading: productsLoading } = useProducts(true);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const createTransaction = useCreateTransaction();
  const updateProduct = useUpdateProduct();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [noClient, setNoClient] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sort clients by last activity (most recent first)
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [clients]);

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: Product) => {
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

  const handleNoClientToggle = () => {
    setNoClient(!noClient);
    if (!noClient) {
      setSelectedClient('');
    }
  };

  const handleSale = async () => {
    if (cart.length === 0) {
      toast.error('Košík je prázdný');
      return;
    }

    if (!noClient && !selectedClient) {
      toast.error('Vyberte klienta nebo zvolte prodej bez klienta');
      return;
    }

    setIsProcessing(true);
    try {
      const skipCreditUpdate = paymentMethod !== 'credit';
      
      // Find or create anonymous client for "no client" sales
      let clientIdToUse = selectedClient;
      
      if (noClient) {
        // Look for existing anonymous client
        const anonymousClient = clients.find(c => c.name === 'Anonymní zákazník');
        if (anonymousClient) {
          clientIdToUse = anonymousClient.id;
        } else {
          toast.error('Systémový klient "Anonymní zákazník" nebyl nalezen. Vytvořte ho prosím v Klientech.');
          setIsProcessing(false);
          return;
        }
      }

      for (const item of cart) {
        const itemTotal = item.product.price * item.quantity;
        await createTransaction.mutateAsync({
          client_id: clientIdToUse,
          amount: -itemTotal,
          type: 'product',
          description: `${item.product.name}${item.quantity > 1 ? ` (${item.quantity}x)` : ''}`,
          product_id: item.product.id,
          payment_method: paymentMethod,
          skip_credit_update: skipCreditUpdate,
        });

        // Decrease stock for products (not services)
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
        paymentMethod,
        anonymous: noClient 
      });

      toast.success(`Prodej dokončen: ${formatCurrency(totalAmount)}`);
      
      // Reset form
      setCart([]);
      setSelectedClient('');
      setNoClient(false);
      setPaymentMethod('cash');
    } catch (error) {
      toast.error('Chyba při zpracování prodeje');
    } finally {
      setIsProcessing(false);
    }
  };

  const isLowStock = (product: Product) => 
    product.category !== 'service' && product.stock_quantity <= product.low_stock_threshold;

  const getItemInCart = (productId: string) => cart.find(item => item.product.id === productId);

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
            Prodej bude zaznamenán jako anonymní
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

      {/* Products Grid */}
      <div>
        <Label className="mb-3 block text-sm font-medium">Produkty a služby</Label>
        {products.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Žádné produkty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Přidejte produkty v záložce Sklad
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {products.map((product) => {
              const cartItem = getItemInCart(product.id);
              const inCart = !!cartItem;
              const lowStock = isLowStock(product);
              const isService = product.category === 'service';

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "relative p-3 sm:p-4 rounded-xl text-left transition-all",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    inCart 
                      ? "bg-primary/20 ring-2 ring-primary" 
                      : "glass hover:bg-secondary/50",
                    lowStock && "ring-1 ring-warning/50"
                  )}
                >
                  {/* Product type badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {isService ? (
                      <Wrench className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Package className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {isService ? 'Služba' : 'Produkt'}
                    </span>
                  </div>

                  {/* Name & Price */}
                  <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                  <p className="text-lg sm:text-xl font-bold text-primary mt-1">
                    {formatCurrency(product.price)}
                  </p>

                  {/* Stock info */}
                  {!isService && (
                    <div className="flex items-center gap-1 mt-2">
                      {lowStock && <AlertTriangle className="w-3 h-3 text-warning" />}
                      <span className={cn(
                        "text-xs",
                        lowStock ? "text-warning font-medium" : "text-muted-foreground"
                      )}>
                        {product.stock_quantity || 0} ks
                      </span>
                    </div>
                  )}

                  {/* In cart indicator */}
                  {inCart && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      {cartItem.quantity}×
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="glass rounded-xl p-4">
          <Label className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ShoppingCart className="w-4 h-4" />
            Košík ({cart.length})
          </Label>

          <div className="space-y-2 mb-4">
            {cart.map((item) => (
              <div 
                key={item.product.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.price)} × {item.quantity} = {' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, -1)}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <Label className="mb-2 block text-sm">Způsob platby</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-3 gap-2"
            >
              {PAYMENT_METHODS.map((method) => (
                <div key={method.value}>
                  <RadioGroupItem
                    value={method.value}
                    id={`payment-${method.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`payment-${method.value}`}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      "hover:bg-secondary/50",
                      paymentMethod === method.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border"
                    )}
                  >
                    <method.icon className={cn(
                      "w-5 h-5",
                      paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                    )}>
                      {method.label}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Total */}
          <div className={cn(
            "p-4 rounded-xl border mb-4",
            paymentMethod === 'credit' 
              ? "bg-primary/10 border-primary/20" 
              : "bg-success/10 border-success/20"
          )}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Celkem:</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {formatCurrency(totalAmount)}
            </p>
            {selectedClientData && paymentMethod === 'credit' && (
              <p className="text-sm text-muted-foreground mt-2">
                Nový zůstatek:{' '}
                <span className={cn(
                  "font-medium",
                  ((selectedClientData.credit_balance || 0) - totalAmount) < 0 
                    ? "text-destructive" 
                    : "text-foreground"
                )}>
                  {formatCurrency((selectedClientData.credit_balance || 0) - totalAmount)}
                </span>
              </p>
            )}
            {paymentMethod !== 'credit' && (
              <p className="text-xs text-success mt-2">
                Kredit klienta nebude ovlivněn
              </p>
            )}
          </div>

          {/* Complete Sale Button */}
          <Button 
            onClick={handleSale} 
            disabled={isProcessing || cart.length === 0 || (!noClient && !selectedClient)} 
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
