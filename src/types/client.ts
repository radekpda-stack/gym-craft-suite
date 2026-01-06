/**
 * Client-related types used across the application
 * This is the single source of truth for client types
 */

export type PaymentMode = 'credit' | 'cash_only' | 'mixed';
export type Gender = 'male' | 'female' | null;
export type ClientStatus = 'ok' | 'warning' | 'error';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  training_goals: string[];
  notes: string;
  health_restrictions: string;
  credit_balance: number;
  birth_date: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  feedback_enabled: boolean;
  gender: Gender;
  payment_mode: PaymentMode;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  training_start_date: string | null;
  // Extended personal data fields
  handedness: string | null;
  occupation: string | null;
  sitting_hours_daily: number | null;
  sports_history: string | null;
  current_activities: string[] | null;
  sleep_hours: number | null;
  stress_level: number | null;
  dietary_restrictions: string[] | null;
  supplements: string[] | null;
  // Custom pricing fields
  custom_training_price: number | null;
  custom_price_note: string | null;
  custom_price_credit_limit: number | null;
  // Price transition fields
  grandfathered_credit: number | null;
  grandfathered_at: string | null;
  use_legacy_pricing: boolean;
}

export interface ClientQuickInfo {
  id: string;
  name: string;
  creditBalance: number;
  lastTrainingDate: Date | null;
  status: ClientStatus;
  isFavorite: boolean;
  unpaidCount: number;
}

/**
 * Minimal client info from DB join
 */
export interface ClientRef {
  id: string;
  name: string;
  feedback_enabled?: boolean;
}
