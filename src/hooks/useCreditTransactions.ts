// Re-export everything from useCreditOperations for backwards compatibility
export {
  useCreditTransactions,
  useCreateTransaction,
  useDeleteTransaction, // Now uses reversal instead of DELETE
  useUpdateTransactionPaymentMethod,
  useProductSales,
  type CreditTransaction,
  type CreateTransactionInput,
  type TransactionType,
  type PaymentMethod,
} from './useCreditOperations';
