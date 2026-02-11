import { ShoppingBag, Plus } from 'lucide-react';
import { useClientPurchaseSuggestions } from '@/hooks/useClientPurchaseSuggestions';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ClientPurchaseSuggestionsProps {
  clientId: string | undefined;
  products: Product[];
  onAddToCart: (product: Product) => void;
  getCartQuantity: (productId: string) => number;
}

export function ClientPurchaseSuggestions({ 
  clientId, 
  products, 
  onAddToCart,
  getCartQuantity 
}: ClientPurchaseSuggestionsProps) {
  const { data: suggestions = [] } = useClientPurchaseSuggestions(clientId);

  if (!clientId || suggestions.length === 0) return null;

  return (
    <div className="card-floating rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1 rounded-md bg-accent/10">
          <ShoppingBag className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">Obvykle kupuje</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map(suggestion => {
          const product = products.find(p => p.id === suggestion.productId);
          if (!product || !product.is_active) return null;
          const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;
          const inCart = getCartQuantity(suggestion.productId);

          return (
            <button
              key={suggestion.productId}
              onClick={() => !outOfStock && product && onAddToCart(product)}
              disabled={outOfStock}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                "bg-card/60 border border-border/50 text-left min-w-0",
                "hover:shadow-sm hover:border-primary/30 active:scale-[0.98]",
                outOfStock && "opacity-40 cursor-not-allowed",
                inCart > 0 && "ring-1 ring-primary bg-primary/5"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate max-w-[120px]">{suggestion.productName}</p>
                <p className="text-[10px] text-muted-foreground">{suggestion.purchaseCount}× koupeno</p>
              </div>
              {!outOfStock && (
                <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
