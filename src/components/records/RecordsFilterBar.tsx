import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useClients } from '@/hooks/useClients';
import { RecordsFeedFilters, PeriodFilter, RecordType, DateRange } from '@/hooks/useRecordsFeed';
import { Calendar as CalendarIcon, Filter, Search, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface RecordsFilterBarProps {
  filters: RecordsFeedFilters;
  onFiltersChange: (filters: RecordsFeedFilters) => void;
  counts: {
    measurement: number;
    diagnostic: number;
    total: number;
  };
  className?: string;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: 'week', label: 'Tento týden' },
  { value: 'month', label: 'Tento měsíc' },
  { value: 'all', label: 'Vše' },
  { value: 'custom', label: 'Vlastní období' },
];

const typeOptions: { value: RecordType | 'all'; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'measurement', label: 'Měření' },
  { value: 'diagnostic', label: 'Diagnostika' },
];

const DEFAULT_FILTERS: RecordsFeedFilters = {
  clientId: null,
  period: 'week',
  recordType: 'all',
  searchQuery: '',
  customDateRange: null,
};

function hasActiveFilters(filters: RecordsFeedFilters): boolean {
  return (
    filters.clientId !== null ||
    filters.period !== 'week' ||
    filters.recordType !== 'all' ||
    filters.searchQuery !== '' ||
    filters.customDateRange !== null
  );
}

export function RecordsFilterBar({ 
  filters, 
  onFiltersChange, 
  counts,
  className 
}: RecordsFilterBarProps) {
  const { data: clients = [] } = useClients();
  const activeClients = clients.filter(c => !c.is_archived);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onFiltersChange({
        ...filters,
        period: 'custom',
        customDateRange: range,
      });
    }
  };

  const handleResetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const formatDateRange = () => {
    if (!filters.customDateRange?.from) return 'Vybrat období';
    const from = format(filters.customDateRange.from, 'd. M.', { locale: cs });
    if (!filters.customDateRange.to) return from;
    const to = format(filters.customDateRange.to, 'd. M. yyyy', { locale: cs });
    return `${from} – ${to}`;
  };

  const showResetButton = hasActiveFilters(filters);
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat v poznámkách..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-8 h-9 rounded-lg"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Client filter */}
        <ClientSearchSelect
          clients={activeClients}
          value={filters.clientId || ''}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, clientId: value || null })
          }
          placeholder="Všichni klienti"
          allowAll
          allLabel="Všichni klienti"
          className="w-[160px] sm:w-[180px] h-9"
        />
        
        {/* Period filter */}
        {filters.period !== 'custom' ? (
          <Select
            value={filters.period}
            onValueChange={(value: PeriodFilter) => {
              if (value === 'custom') {
                setDatePickerOpen(true);
              }
              onFiltersChange({ ...filters, period: value, customDateRange: value === 'custom' ? filters.customDateRange : null })
            }}
          >
            <SelectTrigger className="w-[140px] h-9 rounded-lg glass">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 rounded-lg glass">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDateRange()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFiltersChange({ ...filters, period: 'week', customDateRange: null });
                    setDatePickerOpen(false);
                  }}
                  className="text-xs"
                >
                  ← Zpět na rychlé filtry
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={filters.customDateRange || undefined}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                locale={cs}
              />
            </PopoverContent>
          </Popover>
        )}
        
        {/* Type filter */}
        <Select
          value={filters.recordType}
          onValueChange={(value: RecordType | 'all') => 
            onFiltersChange({ ...filters, recordType: value })
          }
        >
          <SelectTrigger className="w-[140px] h-9 rounded-lg glass">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {option.value !== 'all' && (
                  <span className="ml-2 text-muted-foreground">
                    ({counts[option.value as RecordType]})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Reset filters button */}
        {showResetButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
        
        {/* Total count indicator */}
        <span className="text-sm text-muted-foreground ml-auto">
          {counts.total} {counts.total === 1 ? 'záznam' : counts.total < 5 ? 'záznamy' : 'záznamů'}
        </span>
      </div>
    </div>
  );
}
