// Re-export everything from useCreditOperations for backwards compatibility
export {
  useCreditTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransactionPaymentMethod,
  useProductSales,
  type CreditTransaction,
  type CreateTransactionInput,
  type TransactionType,
  type PaymentMethod,
} from './useCreditOperations';
