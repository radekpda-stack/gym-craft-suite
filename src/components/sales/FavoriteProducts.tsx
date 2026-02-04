import { Star, Sparkles } from 'lucide-react';
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
    <div className="card-floating rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-warning/10 shadow-sm shadow-warning/20">
          <Star className="w-4 h-4 text-warning fill-warning" />
        </div>
        <span className="text-sm font-semibold">Top produkty</span>
        <span className="text-xs text-muted-foreground">
          ({topProducts.length})
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-hidden">
        {topProducts.map(product => {
          const inCart = getCartQuantity(product.id);
          
          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className={cn(
                "relative flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all duration-200 min-w-0 overflow-hidden",
                "bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm",
                "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]",
                inCart && "ring-2 ring-primary bg-primary/10"
              )}
            >
              <span className="font-medium text-sm line-clamp-1 w-full">
                {product.name}
              </span>
              <span className="text-primary font-bold text-base tabular-nums">
                {formatCurrency(product.price)}
              </span>
              
              {inCart > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 bg-primary min-w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg animate-scale-in">
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
