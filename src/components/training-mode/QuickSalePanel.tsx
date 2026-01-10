import { useState, useMemo, useCallback } from 'react';
import { 
  Loader2, 
  Package, 
  Check,
  Wrench,
  Coins,
  ShoppingCart,
  X,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Product } from '@/hooks/useProducts';
import { useProductsSortedBySales } from '@/hooks/useProductsSortedBySales';
import { useClients } from '@/hooks/useClients';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';
import { processSaleWithDiscount, showSaleResultToast } from '@/services/saleProcessor';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Helper to normalize text for search
const normalizeText = (text: string) => 
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface QuickProductCardProps {
  product: Product;
  inCart: boolean;
  quantity: number;
  onAdd: () => void;
}

function QuickProductCard({ product, inCart, quantity, onAdd }: QuickProductCardProps) {
  const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;

  const getIcon = () => {
    switch (product.kind) {
      case 'service':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'credit_topup':
        return <Coins className="w-4 h-4 text-amber-500" />;
      default:
        return <Package className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <button
      onClick={onAdd}
      disabled={outOfStock}
      className={cn(
        "relative p-4 rounded-xl text-left transition-all w-full min-h-[64px]",
        "active:scale-[0.98]",
        outOfStock && "opacity-50 cursor-not-allowed",
        inCart 
          ? "bg-primary/20 ring-2 ring-primary" 
          : "bg-secondary/50 hover:bg-secondary active:bg-secondary"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-background/50">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>
        {inCart && (
          <Badge className="bg-primary min-w-8 h-8 flex items-center justify-center text-base font-bold">
            {quantity}
          </Badge>
        )}
      </div>
    </button>
  );
}

export function QuickSalePanel() {
  const queryClient = useQueryClient();
  const { activeSessionId } = useTrainingMode();
  const { data: products = [], isLoading: productsLoading } = useProductsSortedBySales(true);
  const { data: clients = [] } = useClients();
  const { data: participants = [] } = useTrainingParticipants(activeSessionId || undefined);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get default client from active session
  const sessionClientId = participants.length > 0 
    ? participants[0].client_id 
    : null;
  
  // Allow manual client selection, default to session client
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const defaultClientId = selectedClientId || sessionClientId;

  const cart = useSalesCartWithDiscount({ clientId: defaultClientId });

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => 
      p.kind !== 'credit_topup' // Hide credit topups in quick mode
    );

    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery.trim());
      result = result.filter(p => normalizeText(p.name).includes(query));
    }

    // Sort: in-stock first, then by name
    return result.sort((a, b) => {
      const aInStock = a.kind !== 'inventory' || (a.stock_quantity || 0) > 0;
      const bInStock = b.kind !== 'inventory' || (b.stock_quantity || 0) > 0;
      if (aInStock !== bInStock) return aInStock ? -1 : 1;
      return a.name.localeCompare(b.name, 'cs');
    });
  }, [products, searchQuery]);

  const handleQuickSale = useCallback(async () => {
    if (cart.isEmpty || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await processSaleWithDiscount({
        clientId: defaultClientId,
        paymentMethod: 'cash',
        items: cart.items,
        orderDiscount: null,
        itemDiscounts: [],
      });

      if (result.success) {
        toast.success('Prodej zaznamenán', {
          description: 'Detaily můžete doplnit později na iPadu.'
        });
        cart.clear();
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      } else {
        toast.error('Chyba při prodeji', {
          description: result.error || 'Zkuste to znovu'
        });
      }
    } catch (error) {
      console.error('Quick sale error:', error);
      toast.error('Chyba při prodeji');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, defaultClientId, isProcessing, queryClient]);

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Client selection + Search */}
      <div className="p-4 border-b border-border/50 bg-background space-y-3">
        {/* Client selector */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <ClientSearchSelect
            clients={clients.map(c => ({ 
              id: c.id, 
              name: c.name,
              credit_balance: c.credit_balance,
              is_archived: c.is_archived 
            }))}
            value={defaultClientId || ''}
            onValueChange={(val) => setSelectedClientId(val || null)}
            placeholder="Vybrat klienta..."
            filterArchived
            showCreditBalance
          />
        </div>
        
        {/* Search */}
        <Input
          placeholder="Hledat produkt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      {/* Products list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Žádné produkty</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const cartItem = cart.getItem(product.id);
              return (
                <QuickProductCard
                  key={product.id}
                  product={product}
                  inCart={!!cartItem}
                  quantity={cartItem?.quantity || 0}
                  onAdd={() => cart.addItem(product)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Cart summary & checkout */}
      {!cart.isEmpty && (
        <div className="border-t border-border/50 p-4 space-y-3 bg-background safe-area-bottom">
          {/* Cart items */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="secondary" className="shrink-0">{item.quantity}×</Badge>
                  <span className="truncate text-sm">{item.product.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="font-medium text-sm">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => cart.removeItem(item.product.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <span className="font-medium">Celkem:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(cart.totals.totalAfterDiscount)}
            </span>
          </div>

          {/* Checkout button */}
          <Button
            onClick={handleQuickSale}
            disabled={isProcessing}
            className="w-full h-14 gap-2 text-base font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Zpracovávám...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Potvrdit prodej
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
