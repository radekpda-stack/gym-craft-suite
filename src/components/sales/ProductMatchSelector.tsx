import { useState } from 'react';
import { Check, ChevronDown, Search, X, Sparkles, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Product } from '@/hooks/useProducts';
import { MatchSuggestion } from '@/hooks/useInvoiceImport';

interface ProductMatchSelectorProps {
  matchedProductId: string | null;
  matchedProductName: string | null;
  confidence: number;
  matchSuggestions: MatchSuggestion[];
  products: Product[];
  onSelect: (productId: string | null) => void;
}

export function ProductMatchSelector({
  matchedProductId,
  matchedProductName,
  confidence,
  matchSuggestions,
  products,
  onSelect,
}: ProductMatchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isMatched = !!matchedProductId;

  // Filter products based on search
  const filteredProducts = products
    .filter(p => p.is_active && p.kind === 'inventory')
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      ((p as any).sku_code || '').toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 20); // Limit for performance

  const handleSelect = (productId: string | null) => {
    onSelect(productId);
    setOpen(false);
    setSearch('');
  };

  const confidenceColor = confidence >= 0.9 
    ? 'text-green-600' 
    : confidence >= 0.7 
      ? 'text-yellow-600' 
      : 'text-orange-600';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "h-7 text-xs gap-1.5 justify-between min-w-[140px]",
            isMatched ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-dashed"
          )}
        >
          {isMatched ? (
            <>
              <Link2 className="w-3 h-3 text-green-600" />
              <span className="truncate max-w-[100px]">{matchedProductName}</span>
              <span className={cn("text-[10px]", confidenceColor)}>
                {Math.round(confidence * 100)}%
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              <span>Přiřadit produkt</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat produkt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {/* Option to unlink */}
          {isMatched && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 text-destructive"
              onClick={() => handleSelect(null)}
            >
              <X className="w-4 h-4" />
              Zrušit přiřazení (vytvořit nový)
            </button>
          )}

          {/* AI Suggestions */}
          {matchSuggestions.length > 0 && !search && (
            <div className="p-2 border-b">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Návrhy AI
              </p>
              {matchSuggestions.map((suggestion) => (
                <button
                  key={suggestion.productId}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/50",
                    matchedProductId === suggestion.productId && "bg-secondary"
                  )}
                  onClick={() => handleSelect(suggestion.productId)}
                >
                  {matchedProductId === suggestion.productId && (
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <span className="truncate block">{suggestion.productName}</span>
                    <span className="text-xs text-muted-foreground">{suggestion.matchReason}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* All products */}
          <div className="p-1">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Žádné produkty nenalezeny
              </p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary/50",
                    matchedProductId === product.id && "bg-secondary"
                  )}
                  onClick={() => handleSelect(product.id)}
                >
                  {matchedProductId === product.id && (
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <span className="truncate block">{product.name}</span>
                    {(product as any).sku_code && (
                      <span className="text-xs text-muted-foreground">
                        SKU: {(product as any).sku_code}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {product.stock_quantity} ks
                  </Badge>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
