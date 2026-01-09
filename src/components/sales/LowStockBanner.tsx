import { AlertTriangle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Product } from '@/hooks/useProducts';

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
      <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="font-medium text-warning">
              Nízký stav zásob: {products.length} {products.length === 1 ? 'položka' : products.length < 5 ? 'položky' : 'položek'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowLowStock}
              className="gap-1.5 h-7 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Zobrazit
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
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
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-warning/20">
            {products.map(p => p.name).join(', ')}
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
