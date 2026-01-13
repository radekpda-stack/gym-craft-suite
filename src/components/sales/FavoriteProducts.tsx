import { Star } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FavoriteProductsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  getCartQuantity: (productId: string) => number;
  maxItems?: number;
}

export function FavoriteProducts({ 
  products, 
  onAddToCart, 
  getCartQuantity,
  maxItems = 6 
}: FavoriteProductsProps) {
  // Only show inventory products that are in stock
  const topProducts = products
    .filter(p => p.kind === 'inventory' && (p.stock_quantity || 0) > 0)
    .slice(0, maxItems);

  if (topProducts.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-warning fill-warning" />
        <span className="text-sm font-medium">Top produkty</span>
        <span className="text-xs text-muted-foreground">
          ({topProducts.length})
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {topProducts.map(product => {
          const inCart = getCartQuantity(product.id);
          
          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                "hover:scale-[1.02] active:scale-[0.98]",
                inCart 
                  ? "bg-primary/20 ring-2 ring-primary" 
                  : "bg-secondary/50 hover:bg-secondary"
              )}
            >
              <span className="font-medium truncate max-w-[100px]">
                {product.name}
              </span>
              <span className="text-primary font-semibold whitespace-nowrap">
                {formatCurrency(product.price)}
              </span>
              
              {inCart > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 bg-primary min-w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
                  {inCart}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
