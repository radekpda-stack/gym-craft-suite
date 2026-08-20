import { Search, X, ArrowUpDown, ArrowDownUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SalesChipFilter } from './ui/SalesUI';

export type StockFilter = 'all' | 'low_stock' | 'active' | 'archived';
export type StockSortOption = 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'margin_desc';
export type StockTypeFilter = 'all' | 'inventory' | 'service' | 'credit_topup';

const FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Všechny' },
  { value: 'low_stock', label: 'Pouze nízký sklad' },
  { value: 'active', label: 'Aktivní' },
  { value: 'archived', label: 'Archiv' },
];

const TYPE_OPTIONS: { value: StockTypeFilter; label: string }[] = [
  { value: 'all', label: 'Všechny typy' },
  { value: 'inventory', label: 'Skladové' },
  { value: 'service', label: 'Služby' },
  { value: 'credit_topup', label: 'Dobití kreditu' },
];

type SortKey = 'name' | 'stock' | 'price';
const SORT_KEYS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Název' },
  { key: 'stock', label: 'Zásoba' },
  { key: 'price', label: 'Hodnota' },
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
  const currentSortKey: SortKey = sortBy.startsWith('stock') ? 'stock' : sortBy.startsWith('price') || sortBy === 'margin_desc' ? 'price' : 'name';
  const isDesc = sortBy.endsWith('_desc') || sortBy === 'margin_desc';

  const handleSortClick = (key: SortKey) => {
    if (key === currentSortKey) {
      // toggle direction
      const next: StockSortOption = key === 'name'
        ? (isDesc ? 'name_asc' : 'name_desc')
        : key === 'stock'
        ? (isDesc ? 'stock_asc' : 'stock_desc')
        : (isDesc ? 'price_asc' : 'price_desc');
      onSortChange(next);
    } else {
      const next: StockSortOption = key === 'name' ? 'name_asc' : key === 'stock' ? 'stock_desc' : 'price_desc';
      onSortChange(next);
    }
  };

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

      {/* Quick filter chips (incl. "Pouze nízký sklad" toggle) */}
      <SalesChipFilter options={FILTER_OPTIONS} value={activeFilter} onChange={onActiveFilterChange} />

      {/* Sort chips + type dropdown */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {SORT_KEYS.map((s) => {
            const active = currentSortKey === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => handleSortClick(s.key)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium',
                  'transition-colors duration-150 press-feedback whitespace-nowrap',
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                )}
              >
                {s.label}
                {active && (isDesc ? <ArrowDownUp className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />)}
              </button>
            );
          })}
        </div>

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
      </div>
    </div>
  );
}
