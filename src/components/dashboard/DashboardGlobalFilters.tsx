import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Filter, 
  CalendarDays, 
  X, 
  ChevronDown,
  Banknote,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useDashboardFilters, 
  GlobalPeriod, 
  AccountingMode, 
  PaymentStatusFilter,
  ItemTypeFilter 
} from '@/contexts/DashboardFiltersContext';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS: { value: GlobalPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měsíce' },
  { value: '6months', label: '6 měsíců' },
  { value: '12months', label: '12 měsíců' },
  { value: 'custom', label: 'Vlastní' },
];

const ACCOUNTING_OPTIONS: { value: AccountingMode; label: string; description: string }[] = [
  { value: 'cash', label: 'CASH', description: 'Podle data platby' },
  { value: 'accrual', label: 'ACCRUAL', description: 'Podle data služby' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusFilter; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'paid', label: 'Zaplaceno' },
  { value: 'unpaid', label: 'Nezaplaceno' },
  { value: 'overdue', label: 'Po splatnosti' },
];

const ITEM_TYPE_OPTIONS: { value: ItemTypeFilter; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'trainings', label: 'Tréninky' },
  { value: 'products', label: 'Produkty' },
  { value: 'credits', label: 'Kredity' },
  { value: 'cancellations', label: 'Storna' },
];

export function DashboardGlobalFilters() {
  const {
    filters,
    setGlobalPeriod,
    setCustomDateRange,
    setAccountingMode,
    setPaymentStatus,
    setItemType,
    resetFilters,
    isFilterActive,
  } = useDashboardFilters();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const activeFiltersCount = [
    filters.paymentStatus !== 'all',
    filters.itemType !== 'all',
    filters.clientIds.length > 0,
    filters.productIds.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.slice(0, 4).map((opt) => (
            <Button
              key={opt.value}
              variant={filters.globalPeriod === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-xs px-3 h-8',
                filters.globalPeriod === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setGlobalPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          
          {/* Custom date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.globalPeriod === 'custom' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'rounded-full text-xs px-3 h-8 gap-1.5',
                  filters.globalPeriod === 'custom' && 'bg-primary text-primary-foreground'
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {filters.globalPeriod === 'custom' && filters.customDateRange 
                  ? `${format(filters.customDateRange.from, 'd.M.')} - ${format(filters.customDateRange.to, 'd.M.')}`
                  : 'Vlastní'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: filters.customDateRange?.from,
                  to: filters.customDateRange?.to,
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setCustomDateRange({ from: range.from, to: range.to });
                    setGlobalPeriod('custom');
                    setCalendarOpen(false);
                  }
                }}
                locale={cs}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Accounting mode toggle */}
        <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
          {ACCOUNTING_OPTIONS.map((opt) => (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={filters.accountingMode === opt.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'rounded-full text-xs px-3 h-8 gap-1.5',
                    filters.accountingMode === opt.value && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => setAccountingMode(opt.value)}
                >
                  {opt.value === 'cash' ? (
                    <Banknote className="w-3.5 h-3.5" />
                  ) : (
                    <Receipt className="w-3.5 h-3.5" />
                  )}
                  {opt.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{opt.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <Button
          variant={showAdvanced || isFilterActive ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtry
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAdvanced && 'rotate-180')} />
        </Button>

        {/* Reset button */}
        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={resetFilters}
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}

        {/* Date range indicator */}
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {format(filters.dateRange.from, 'd. MMM', { locale: cs })} – {format(filters.dateRange.to, 'd. MMM yyyy', { locale: cs })}
        </div>
      </div>

      {/* Advanced filters row */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
          {/* Payment status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Stav platby:</span>
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => setPaymentStatus(value as PaymentStatusFilter)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Typ:</span>
            <Select
              value={filters.itemType}
              onValueChange={(value) => setItemType(value as ItemTypeFilter)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode explanation */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help ml-auto">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {filters.accountingMode === 'cash' 
                    ? 'Počítáno podle data platby'
                    : 'Počítáno podle data služby/výkonu'
                  }
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium mb-1">
                {filters.accountingMode === 'cash' ? 'CASH režim' : 'ACCRUAL režim'}
              </p>
              <p className="text-xs">
                {filters.accountingMode === 'cash'
                  ? 'Příjmy a výdaje se započítávají v okamžiku skutečného příjmu/výdaje peněz. Nezaplacené položky nejsou zahrnuty.'
                  : 'Příjmy a výdaje se započítávají v okamžiku poskytnutí služby, bez ohledu na datum platby.'
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
