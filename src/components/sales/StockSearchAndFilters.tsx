import { Search, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type StockFilter = 'all' | 'low_stock' | 'active' | 'archived';
export type StockSortOption = 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'margin_desc';
export type StockTypeFilter = 'all' | 'inventory' | 'service' | 'credit_topup';

const FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Všechny' },
  { value: 'low_stock', label: '⚠ Nízký stav' },
  { value: 'active', label: '✓ Aktivní' },
  { value: 'archived', label: '📦 Archiv' },
];

const TYPE_OPTIONS: { value: StockTypeFilter; label: string }[] = [
  { value: 'all', label: 'Všechny typy' },
  { value: 'inventory', label: 'Skladové' },
  { value: 'service', label: 'Služby' },
  { value: 'credit_topup', label: 'Dobití kreditu' },
];

const SORT_OPTIONS: { value: StockSortOption; label: string }[] = [
  { value: 'name_asc', label: 'Název A–Z' },
  { value: 'name_desc', label: 'Název Z–A' },
  { value: 'stock_asc', label: 'Stav (nejnižší)' },
  { value: 'stock_desc', label: 'Stav (nejvyšší)' },
  { value: 'price_asc', label: 'Cena (vzestupně)' },
  { value: 'price_desc', label: 'Cena (sestupně)' },
  { value: 'margin_desc', label: 'Marže (nejvyšší)' },
];

interface StockSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: StockFilter;
  onActiveFilterChange: (filter: StockFilter) => void;
  typeFilter: StockTypeFilter;
  onTypeFilterChange: (type: StockTypeFilter) => void;
  sortBy: StockSortOption;
  onSortChange: (sort: StockSortOption) => void;
}

export function StockSearchAndFilters({
  searchQuery,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
}: StockSearchAndFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hledat položku..."
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

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={activeFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-7 text-xs px-2.5",
                activeFilter === opt.value && "bg-primary text-primary-foreground"
              )}
              onClick={() => onActiveFilterChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Type filter dropdown */}
        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as StockTypeFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as StockSortOption)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="Řazení" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
