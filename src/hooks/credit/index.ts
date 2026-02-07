/**
 * Credit System v2 - Unified Exports
 * 
 * This module provides the new Event Sourcing based credit system
 * with real-time updates and running balance support.
 */

// Core balance hook (PRIMARY - use this for reading balance)
export { 
  useCreditBalance, 
  useCreditBalanceValue,
  useCreditOperationsV2,
  type CreditBalanceData 
} from '../useCreditBalance';

// Real-time subscriptions
export { 
  useCreditRealtime, 
  useCreditRealtimeGroup 
} from '../useCreditRealtime';

// Legacy exports for backwards compatibility
export {
  useCreditTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransactionPaymentMethod,
  useSharedBudgetBalance,
  useSharedBudgetTransactions,
  useUpdateSharedBudgetBalance,
  usePendingPayments,
  applyCreditDelta,
  getClientGroupId,
  getClientBudgetGroup,
  type CreditTransaction,
  type CreateTransactionInput,
  type TransactionType,
  type PaymentMethod,
  type SharedBudgetInfo,
  type ApplyCreditDeltaResult,
} from '../useCreditOperations';
