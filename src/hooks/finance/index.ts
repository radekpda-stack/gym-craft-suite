/**
 * Finance hooks - all hooks related to financial data
 */

// Consolidated hub hook
export { useFinanceHub, useFinanceSummary, type FinanceHubOptions, type FinanceHubData } from '../useFinanceHub';

// Core finance hooks
export { useCreditTransactions, useCreateTransaction, useDeleteTransaction } from '../useCreditTransactions';
export { useFinanceAnalytics, type FinanceAnalyticsData, type FinancePeriodType } from '../useFinanceAnalytics';
export { useFinancialStats, type FinancialStats } from '../useFinancialStats';
export { useIncomeByPeriod } from '../useIncomeByPeriod';
export { useProfitByPeriod } from '../useProfitByPeriod';
export { useSalesStats, useSalesTrend } from '../useSalesStats';

// Product hooks
export { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../useProducts';
export { useProductSalesData } from '../useProductSalesData';
export { useProductDetailData } from '../useProductDetailData';
export { useProductSalesDetail } from '../useProductSalesDetail';
export { useProductsSortedBySales } from '../useProductsSortedBySales';

// Sales hooks
export { useSalesOrders } from '../useSalesOrders';
export { useSalesCart } from '../useSalesCart';
export { useSalesCartWithDiscount } from '../useSalesCartWithDiscount';

// Utilities
export { useUnpaidTrainings } from '../useUnpaidTrainings';
export { useUnifiedFinancialData } from '../useUnifiedFinancialData';
export { useSharedBudgetBalance } from '../useSharedBudgetBalance';
export { usePriceTransition, useClientTrainingPrice, getEffectiveTrainingPrice } from '../usePriceTransition';
