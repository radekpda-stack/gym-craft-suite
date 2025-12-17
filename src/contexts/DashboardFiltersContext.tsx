import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export type AccountingMode = 'cash' | 'accrual';
export type PaymentStatusFilter = 'all' | 'paid' | 'unpaid' | 'overdue';
export type ItemTypeFilter = 'all' | 'trainings' | 'products' | 'credits' | 'expenses' | 'cancellations';
export type GlobalPeriod = '30days' | '3months' | '6months' | '12months' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  // Period
  globalPeriod: GlobalPeriod;
  customDateRange: DateRange | null;
  
  // Accounting
  accountingMode: AccountingMode;
  
  // Filters
  paymentStatus: PaymentStatusFilter;
  itemType: ItemTypeFilter;
  clientIds: string[];
  productIds: string[];
  
  // Computed
  dateRange: DateRange;
}

interface DashboardFiltersContextType {
  filters: DashboardFilters;
  setGlobalPeriod: (period: GlobalPeriod) => void;
  setCustomDateRange: (range: DateRange | null) => void;
  setAccountingMode: (mode: AccountingMode) => void;
  setPaymentStatus: (status: PaymentStatusFilter) => void;
  setItemType: (type: ItemTypeFilter) => void;
  setClientIds: (ids: string[]) => void;
  setProductIds: (ids: string[]) => void;
  resetFilters: () => void;
  isFilterActive: boolean;
}

const defaultFilters: Omit<DashboardFilters, 'dateRange'> = {
  globalPeriod: '30days',
  customDateRange: null,
  accountingMode: 'accrual',
  paymentStatus: 'all',
  itemType: 'all',
  clientIds: [],
  productIds: [],
};

function calculateDateRange(period: GlobalPeriod, customRange: DateRange | null): DateRange {
  if (period === 'custom' && customRange) {
    return customRange;
  }
  
  const now = new Date();
  // Normalize to start of day to prevent constant recalculation
  now.setHours(0, 0, 0, 0);
  
  switch (period) {
    case '30days':
      return { from: subDays(now, 30), to: now };
    case '3months':
      return { from: subMonths(now, 3), to: now };
    case '6months':
      return { from: subMonths(now, 6), to: now };
    case '12months':
      return { from: subMonths(now, 12), to: now };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

const DashboardFiltersContext = createContext<DashboardFiltersContextType | null>(null);

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [globalPeriod, setGlobalPeriod] = useState<GlobalPeriod>(defaultFilters.globalPeriod);
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(defaultFilters.customDateRange);
  const [accountingMode, setAccountingMode] = useState<AccountingMode>(defaultFilters.accountingMode);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>(defaultFilters.paymentStatus);
  const [itemType, setItemType] = useState<ItemTypeFilter>(defaultFilters.itemType);
  const [clientIds, setClientIds] = useState<string[]>(defaultFilters.clientIds);
  const [productIds, setProductIds] = useState<string[]>(defaultFilters.productIds);

  const dateRange = useMemo(() => 
    calculateDateRange(globalPeriod, customDateRange),
    [globalPeriod, customDateRange]
  );

  const filters: DashboardFilters = useMemo(() => ({
    globalPeriod,
    customDateRange,
    accountingMode,
    paymentStatus,
    itemType,
    clientIds,
    productIds,
    dateRange,
  }), [globalPeriod, customDateRange, accountingMode, paymentStatus, itemType, clientIds, productIds, dateRange]);

  const isFilterActive = useMemo(() => 
    paymentStatus !== 'all' || 
    itemType !== 'all' || 
    clientIds.length > 0 || 
    productIds.length > 0,
    [paymentStatus, itemType, clientIds, productIds]
  );

  const resetFilters = () => {
    setGlobalPeriod(defaultFilters.globalPeriod);
    setCustomDateRange(defaultFilters.customDateRange);
    setAccountingMode(defaultFilters.accountingMode);
    setPaymentStatus(defaultFilters.paymentStatus);
    setItemType(defaultFilters.itemType);
    setClientIds(defaultFilters.clientIds);
    setProductIds(defaultFilters.productIds);
  };

  return (
    <DashboardFiltersContext.Provider
      value={{
        filters,
        setGlobalPeriod,
        setCustomDateRange,
        setAccountingMode,
        setPaymentStatus,
        setItemType,
        setClientIds,
        setProductIds,
        resetFilters,
        isFilterActive,
      }}
    >
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    // Return safe defaults when used outside provider (prevents crash during initial render)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return {
      filters: {
        globalPeriod: '30days' as GlobalPeriod,
        customDateRange: null,
        accountingMode: 'accrual' as AccountingMode,
        paymentStatus: 'all' as PaymentStatusFilter,
        itemType: 'all' as ItemTypeFilter,
        clientIds: [],
        productIds: [],
        dateRange: { from: subDays(now, 30), to: now },
      },
      setGlobalPeriod: () => {},
      setCustomDateRange: () => {},
      setAccountingMode: () => {},
      setPaymentStatus: () => {},
      setItemType: () => {},
      setClientIds: () => {},
      setProductIds: () => {},
      resetFilters: () => {},
      isFilterActive: false,
    };
  }
  return context;
}
