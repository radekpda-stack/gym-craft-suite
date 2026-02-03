import { AlertTriangle, ChevronDown, ChevronUp, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface LowStockBannerProps {
  products: Product[];
  expanded: boolean;
  onToggleExpand: () => void;
  onShowLowStock: () => void;
}

export function LowStockBanner({
  products,
  expanded,
  onToggleExpand,
  onShowLowStock,
}: LowStockBannerProps) {
  if (products.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <div className="relative overflow-hidden rounded-xl bg-warning/5 backdrop-blur-sm border border-warning/30">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-warning/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-warning/20 shadow-sm shadow-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-warning text-sm">
                  Nízký stav zásob
                </p>
                <p className="text-xs text-muted-foreground">
                  {products.length} {products.length === 1 ? 'položka' : products.length < 5 ? 'položky' : 'položek'} pod minimální hranicí
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowLowStock}
                className="gap-1.5 h-8 text-xs bg-card/60 backdrop-blur-sm border-warning/30 hover:bg-warning/10"
              >
                <Eye className="w-3.5 h-3.5" />
                Zobrazit
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-warning/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {products.slice(0, 10).map(product => {
                  const stockPercent = product.low_stock_threshold > 0 
                    ? Math.min(100, (product.stock_quantity / (product.low_stock_threshold * 2)) * 100)
                    : 20;
                  
                  return (
                    <div 
                      key={product.id}
                      className={cn(
                        "relative overflow-hidden rounded-lg p-3",
                        "bg-card/60 backdrop-blur-sm border border-warning/30",
                        "transition-all duration-200 hover:shadow-sm"
                      )}
                    >
                      {/* Stock gauge */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/30">
                        <div 
                          className="h-full bg-gradient-to-r from-warning to-warning/50 transition-all duration-300"
                          style={{ width: `${stockPercent}%` }}
                        />
                      </div>
                      
                      <div className="flex items-start gap-2 mt-1">
                        <Package className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-warning font-bold tabular-nums">
                              {product.stock_quantity} ks
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ← {product.low_stock_threshold} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {products.length > 10 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  + {products.length - 10} dalších položek
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
