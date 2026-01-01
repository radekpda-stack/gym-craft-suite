/**
 * Feedback-related types used across the application
 */

export type FeedbackStatus = 'pending' | 'completed' | 'expired';

export interface FeedbackRequest {
  id: string;
  training_session_id: string;
  status: FeedbackStatus;
  created_at: string;
  token?: string;
}

export interface TrainingFeedback {
  id: string;
  client_id: string;
  training_date: string;
  body_feel?: number | null;
  pain?: number | null;
  rpe_rating?: number | null;
  is_red_flag?: boolean;
  notes?: string | null;
  created_at: string;
}
