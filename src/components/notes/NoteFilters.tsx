import { memo } from 'react';
import { Search, ArrowUpDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';

export type SortField = 'created_at' | 'updated_at' | 'title';
export type SortOrder = 'asc' | 'desc';

interface NoteFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  clientId: string;
  onClientChange: (clientId: string) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const NoteFilters = memo(function NoteFilters({
  searchQuery,
  onSearchChange,
  clientId,
  onClientChange,
  sortBy,
  sortOrder,
  onSortChange,
}: NoteFiltersProps) {
  const { data: clients = [] } = useClients();
  const activeClients = clients.filter((c) => !c.is_archived);

  const sortOptions = [
    { value: 'created_at-desc', label: 'Nejnovější' },
    { value: 'created_at-asc', label: 'Nejstarší' },
    { value: 'updated_at-desc', label: 'Naposledy upraveno' },
    { value: 'title-asc', label: 'Název A-Z' },
    { value: 'title-desc', label: 'Název Z-A' },
  ];

  const currentSort = `${sortBy}-${sortOrder}`;

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-') as [SortField, SortOrder];
    onSortChange(field, order);
  };

  const hasFilters = searchQuery || clientId;

  const clearFilters = () => {
    onSearchChange('');
    onClientChange('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hledat v poznámkách..."
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Client filter */}
      <div className="w-full sm:w-48">
        <ClientSearchSelect
          clients={activeClients}
          value={clientId}
          onValueChange={onClientChange}
          placeholder="Všichni klienti"
          filterArchived
        />
      </div>

      {/* Sort */}
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-full sm:w-44">
          <ArrowUpDown className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="w-4 h-4 mr-1" />
          Zrušit filtry
        </Button>
      )}
    </div>
  );
});
