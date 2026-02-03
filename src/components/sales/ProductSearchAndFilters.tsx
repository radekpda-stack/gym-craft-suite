import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: null, label: 'Vše' },
  { value: 'supplement', label: 'Doplňky' },
  { value: 'drink', label: 'Nápoje' },
  { value: 'snack', label: 'Svačiny' },
  { value: 'service', label: 'Služby' },
  { value: 'other', label: 'Ostatní' },
];

interface ProductSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
}

export function ProductSearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  inStockOnly,
  onInStockOnlyChange,
}: ProductSearchAndFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
            onClick={() => onSearchChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
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
