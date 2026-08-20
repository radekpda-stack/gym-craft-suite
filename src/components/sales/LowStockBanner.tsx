import { AlertTriangle, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import { StockBar } from './ui/SalesUI';

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

  const itemWord =
    products.length === 1 ? 'položka' : products.length < 5 ? 'položky' : 'položek';

  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <div className="rounded-2xl bg-warning/5 p-4 sm:p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-xl bg-warning/15 shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning truncate">Nízký stav zásob</p>
            <p className="text-xs text-muted-foreground truncate">
              <span className="tabular-nums font-medium">{products.length}</span> {itemWord} pod
              minimální hranicí
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowLowStock}
              className="gap-1.5 h-9 min-h-[36px] rounded-full px-3 text-xs text-warning hover:bg-warning/10 press-feedback"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Zobrazit</span>
            </Button>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full press-feedback"
                aria-label={expanded ? 'Sbalit seznam' : 'Rozbalit seznam'}
              >
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200 ease-out',
                    expanded && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.slice(0, 10).map((product) => (
              <div key={product.id} className="rounded-xl bg-card/70 p-3 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1 min-w-0">
                  <span className="text-base font-bold tabular-nums text-warning">
                    {product.stock_quantity}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    ks · min {product.low_stock_threshold}
                  </span>
                </div>
                <StockBar
                  quantity={product.stock_quantity}
                  threshold={product.low_stock_threshold}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
          {products.length > 10 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              + <span className="tabular-nums">{products.length - 10}</span> dalších položek
            </p>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
