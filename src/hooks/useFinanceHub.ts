/**
 * useFinanceHub - Consolidated financial data hook
 * 
 * This hook provides a centralized way to access all finance-related data
 * with lazy loading support for optimal performance.
 * 
 * Usage:
 * const { stats, analytics, products, expenses } = useFinanceHub();
 */

import { useMemo } from 'react';
import { useFinancialStats, type FinancialStats } from './useFinancialStats';
import { useFinanceAnalytics, type FinanceAnalyticsData, type FinancePeriodType, type FinanceComparisonMode } from './useFinanceAnalytics';
import { useProducts } from './useProducts';
import { useBusinessExpenses } from './useBusinessExpenses';
import { useIncomeByPeriod } from './useIncomeByPeriod';
import { useProfitByPeriod } from './useProfitByPeriod';
import { useSalesStats } from './useSalesStats';
import { useUnifiedFinancialData } from './useUnifiedFinancialData';

export interface FinanceHubOptions {
  /** Load basic financial stats */
  withStats?: boolean;
  /** Load detailed analytics */
  withAnalytics?: boolean;
  /** Analytics period type */
  analyticsPeriod?: FinancePeriodType;
  /** Analytics comparison mode */
  analyticsComparison?: FinanceComparisonMode;
  /** Selected client IDs for analytics */
  analyticsClientIds?: string[];
  /** Load products data */
  withProducts?: boolean;
  /** Load expenses data */
  withExpenses?: boolean;
  /** Load income by period */
  withIncomeByPeriod?: boolean;
  /** Load profit by period */
  withProfitByPeriod?: boolean;
  /** Load sales stats */
  withSalesStats?: boolean;
  /** Load unified financial data */
  withUnifiedData?: boolean;
}

export interface FinanceHubData {
  // Basic stats
  stats?: {
    data: FinancialStats | undefined;
    isLoading: boolean;
  };
  
  // Detailed analytics
  analytics?: {
    data: FinanceAnalyticsData | undefined;
    isLoading: boolean;
  };
  
  // Products
  products?: ReturnType<typeof useProducts>;
  
  // Expenses
  expenses?: ReturnType<typeof useBusinessExpenses>;
  
  // Income by period
  incomeByPeriod?: ReturnType<typeof useIncomeByPeriod>;
  
  // Profit by period
  profitByPeriod?: ReturnType<typeof useProfitByPeriod>;
  
  // Sales stats
  salesStats?: ReturnType<typeof useSalesStats>;
  
  // Unified data
  unifiedData?: ReturnType<typeof useUnifiedFinancialData>;
  
  // Convenience computed values
  summary?: {
    totalIncome: number;
    incomeThisMonth: number;
    incomeLastMonth: number;
    incomeChange: number;
    incomeChangePercent: number;
    productIncome: number;
    trainingIncome: number;
    yearlyProfit: number;
  };
}

const DEFAULT_OPTIONS: FinanceHubOptions = {
  withStats: true, // Stats are lightweight, load by default
  withAnalytics: false,
  analyticsPeriod: 'month',
  analyticsComparison: 'history',
  withProducts: false,
  withExpenses: false,
  withIncomeByPeriod: false,
  withProfitByPeriod: false,
  withSalesStats: false,
  withUnifiedData: false,
};

/**
 * Consolidated hook for accessing all finance-related data
 * 
 * @param options - Which data modules to load
 */
export function useFinanceHub(options: FinanceHubOptions = {}): FinanceHubData {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Basic stats - loaded by default
  const statsQuery = useFinancialStats();
  
  // Detailed analytics - conditional
  const analyticsQuery = useFinanceAnalytics({
    periodType: opts.analyticsPeriod || 'month',
    comparisonMode: opts.analyticsComparison || 'history',
    selectedClientIds: opts.analyticsClientIds,
  });
  
  // Products - conditional
  const productsQuery = useProducts();
  
  // Expenses - conditional
  const expensesQuery = useBusinessExpenses();
  
  // Income by period - conditional
  const incomeQuery = useIncomeByPeriod(opts.withIncomeByPeriod ? '30days' : undefined);
  
  // Profit by period - conditional (use '30days' which is a valid ProfitPeriod)
  const profitQuery = useProfitByPeriod(opts.withProfitByPeriod ? '30days' : '30days');
  
  // Sales stats - conditional
  const salesQuery = useSalesStats();
  
  // Unified data - conditional (requires a period argument)
  const unifiedQuery = useUnifiedFinancialData(opts.withUnifiedData ? '30days' : '30days');

  // Computed summary
  const summary = useMemo(() => {
    if (!statsQuery.data) return undefined;
    
    const data = statsQuery.data;
    const incomeChange = data.incomeThisMonth - data.incomeLastMonth;
    const incomeChangePercent = data.incomeLastMonth > 0 
      ? Math.round((incomeChange / data.incomeLastMonth) * 100) 
      : 0;
    
    return {
      totalIncome: data.totalIncome,
      incomeThisMonth: data.incomeThisMonth,
      incomeLastMonth: data.incomeLastMonth,
      incomeChange,
      incomeChangePercent,
      productIncome: data.productIncome,
      trainingIncome: data.trainingIncome,
      yearlyProfit: data.yearlyProfit,
    };
  }, [statsQuery.data]);

  return useMemo(() => ({
    ...(opts.withStats && {
      stats: {
        data: statsQuery.data,
        isLoading: statsQuery.isLoading,
      },
    }),
    ...(opts.withAnalytics && {
      analytics: {
        data: analyticsQuery.data,
        isLoading: analyticsQuery.isLoading,
      },
    }),
    ...(opts.withProducts && { products: productsQuery }),
    ...(opts.withExpenses && { expenses: expensesQuery }),
    ...(opts.withIncomeByPeriod && { incomeByPeriod: incomeQuery }),
    ...(opts.withProfitByPeriod && { profitByPeriod: profitQuery }),
    ...(opts.withSalesStats && { salesStats: salesQuery }),
    ...(opts.withUnifiedData && { unifiedData: unifiedQuery }),
    summary,
  }), [
    opts.withStats, statsQuery.data, statsQuery.isLoading,
    opts.withAnalytics, analyticsQuery.data, analyticsQuery.isLoading,
    opts.withProducts, productsQuery,
    opts.withExpenses, expensesQuery,
    opts.withIncomeByPeriod, incomeQuery,
    opts.withProfitByPeriod, profitQuery,
    opts.withSalesStats, salesQuery,
    opts.withUnifiedData, unifiedQuery,
    summary,
  ]);
}

/**
 * Lightweight hook for dashboard financial summary
 */
export function useFinanceSummary() {
  const { data: stats, isLoading } = useFinancialStats();
  
  return useMemo(() => {
    if (!stats) {
      return {
        isLoading,
        incomeThisMonth: 0,
        incomeLastMonth: 0,
        incomeChange: 0,
        incomeChangePercent: 0,
        yearlyIncome: 0,
        yearlyProfit: 0,
        clientsWithLowCredit: 0,
      };
    }
    
    const incomeChange = stats.incomeThisMonth - stats.incomeLastMonth;
    const incomeChangePercent = stats.incomeLastMonth > 0 
      ? Math.round((incomeChange / stats.incomeLastMonth) * 100) 
      : 0;
    
    return {
      isLoading,
      incomeThisMonth: stats.incomeThisMonth,
      incomeLastMonth: stats.incomeLastMonth,
      incomeChange,
      incomeChangePercent,
      yearlyIncome: stats.yearlyIncome,
      yearlyProfit: stats.yearlyProfit,
      clientsWithLowCredit: stats.clientsWithLowCredit,
    };
  }, [stats, isLoading]);
}

// Re-export common types
export type { FinancialStats } from './useFinancialStats';
export type { FinanceAnalyticsData, FinancePeriodType, FinanceComparisonMode } from './useFinanceAnalytics';
