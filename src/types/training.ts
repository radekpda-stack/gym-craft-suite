/**
 * Training-related types used across the application
 */

export type TrainingStatus = 'scheduled' | 'completed' | 'cancelled' | 'canceled';
export type PaymentStatus = 'pending' | 'paid' | 'partial';

export interface TrainingSession {
  id: string;
  date: string;
  status: TrainingStatus;
  client_id: string;
  rpe?: number | null;
  final_price?: number | null;
  payment_status?: PaymentStatus;
  participant_count?: number;
  clients?: {
    name: string;
    feedback_enabled?: boolean;
  };
}

export interface TrainingSessionWithClient extends TrainingSession {
  clients: {
    name: string;
    feedback_enabled?: boolean;
  };
}

export interface ScheduleItem {
  id: string;
  clientId: string;
  clientName: string;
  time: string;
  date: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  hasFeedback: boolean;
  hasIssue: boolean;
  feedbackToken?: string;
}
