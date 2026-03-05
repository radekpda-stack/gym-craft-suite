import { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: null, label: 'Vše' },
  { value: 'supplement', label: 'Doplňky' },
  { value: 'drink', label: 'Nápoje' },
  { value: 'snack', label: 'Svačiny' },
  { value: 'service', label: 'Služby' },
  { value: 'other', label: 'Ostatní' },
];

const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface ProductSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
  products?: Product[];
  onProductSelect?: (product: Product) => void;
}

export function ProductSearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  inStockOnly,
  onInStockOnlyChange,
  products = [],
  onProductSelect,
}: ProductSearchAndFiltersProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = searchQuery.trim().length >= 1
    ? products
        .filter(p => {
          const q = normalizeText(searchQuery.trim());
          return normalizeText(p.name).includes(q);
        })
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-3">
      {/* Search input with autocomplete */}
      <div className="relative" ref={wrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
          placeholder="Vyhledat produkt..."
          className={cn(
            "pl-9 pr-9 bg-card/60 backdrop-blur-sm border-border/50",
            "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "transition-all duration-200"
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => { onSearchChange(''); setShowSuggestions(false); }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && onProductSelect && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(product => {
              const outOfStock = product.kind === 'inventory' && (product.stock_quantity || 0) <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (!outOfStock) {
                      onProductSelect(product);
                    }
                    onSearchChange('');
                    setShowSuggestions(false);
                  }}
                  disabled={outOfStock}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left",
                    "hover:bg-primary/10 transition-colors duration-150",
                    "border-b border-border/30 last:border-b-0",
                    outOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{product.name}</span>
                    {product.kind === 'inventory' && (
                      <span className={cn(
                        "text-[11px]",
                        outOfStock ? "text-destructive" :
                        (product.stock_quantity || 0) <= (product.low_stock_threshold || 0)
                          ? "text-warning" : "text-muted-foreground"
                      )}>
                        {outOfStock ? 'Vyprodáno' : `${product.stock_quantity} ks`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatCurrency(product.price)}
                    </span>
                    {!outOfStock && (
                      <div className="p-1 rounded-md bg-primary/10">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category chips and in-stock filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value ?? 'all'}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-7 text-xs px-2.5",
                selectedCategory === cat.value && "bg-primary text-primary-foreground"
              )}
              onClick={() => onCategoryChange(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="in-stock-only"
            checked={inStockOnly}
            onCheckedChange={onInStockOnlyChange}
          />
          <Label htmlFor="in-stock-only" className="text-xs cursor-pointer whitespace-nowrap">
            Jen skladem
          </Label>
        </div>
      </div>
    </div>
  );
}
