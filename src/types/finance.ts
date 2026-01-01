/**
 * Finance-related types used across the application
 */

export type TransactionType = 'payment' | 'manual' | 'product' | 'training' | 'refund';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'credit';

export interface CreditTransaction {
  id: string;
  client_id: string;
  amount: number;
  type: TransactionType;
  payment_method?: PaymentMethod | null;
  created_at: string;
  description?: string | null;
  product_id?: string | null;
  training_session_id?: string | null;
  status: string;
  clients?: {
    name: string;
  };
}

export interface ProductTransaction {
  id: string;
  amount: number;
  type: 'product';
  product_id: string | null;
  created_at: string;
}
