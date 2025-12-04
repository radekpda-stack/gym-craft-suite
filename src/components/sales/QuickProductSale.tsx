import { useState } from 'react';
import { Package, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProducts, Product } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { cn } from '@/lib/utils';

interface QuickProductSaleProps {
  collapsed?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function QuickProductSale({ collapsed = false }: QuickProductSaleProps) {
  const { data: products = [] } = useProducts(true);
  const { data: clients = [] } = useClients();
  const createTransaction = useCreateTransaction();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
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
      // Create a transaction for each product in cart
      for (const item of cart) {
        const itemTotal = item.product.price * item.quantity;
        await createTransaction.mutateAsync({
          client_id: selectedClient,
          amount: -itemTotal,
          type: 'product',
          description: `${item.product.name}${item.quantity > 1 ? ` (${item.quantity}x)` : ''}`,
          product_id: item.product.id,
        });
      }

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Prodej produktů
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Klient</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="mt-2">
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
          </div>

          {selectedClientData && (
            <div className="p-3 rounded-xl bg-secondary/50 text-sm">
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

          {/* Add product */}
          <div>
            <Label>Přidat produkt</Label>
            <div className="flex gap-2 mt-2">
              <Select value={selectedProductToAdd} onValueChange={setSelectedProductToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Vyberte produkt" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.price.toLocaleString('cs-CZ')} Kč
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={addToCart} 
                disabled={!selectedProductToAdd}
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <Label>Košík ({cart.length} položek)</Label>
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.product.price.toLocaleString('cs-CZ')} Kč × {item.quantity} = {' '}
                        <span className="font-medium text-foreground">
                          {(item.product.price * item.quantity).toLocaleString('cs-CZ')} Kč
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          {cart.length > 0 && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Celkem k odečtení:</p>
              <p className="text-2xl font-bold text-foreground">
                {totalAmount.toLocaleString('cs-CZ')} Kč
              </p>
              {selectedClientData && (
                <p className="text-sm text-muted-foreground mt-1">
                  Nový zůstatek: {' '}
                  <span className={cn(
                    "font-medium",
                    ((selectedClientData.credit_balance || 0) - totalAmount) < 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {((selectedClientData.credit_balance || 0) - totalAmount).toLocaleString('cs-CZ')} Kč
                  </span>
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={handleSale} 
            disabled={!selectedClient || cart.length === 0 || isProcessing} 
            className="w-full"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isProcessing ? 'Zpracovávám...' : `Prodat (${cart.length} položek)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
