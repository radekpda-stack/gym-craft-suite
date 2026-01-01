/**
 * Analytics Core Types
 * 
 * Central type definitions for the analytics system.
 * All analytics events flow through these types.
 */

export type EventCategory = 
  | 'navigation'
  | 'calendar'
  | 'clients'
  | 'trainings'
  | 'plans'
  | 'measurements'
  | 'diagnostics'
  | 'finance'
  | 'media'
  | 'search'
  | 'ai'
  | 'feedback'
  | 'nutrition'
  | 'progress'
  | 'settings'
  | 'export'
  | 'reminders'
  | 'system'
  | 'challenges'
  | 'exercises'
  | 'gamification'
  | 'client-portal';

export type ErrorCode = 
  | 'VALIDATION'
  | 'NETWORK'
  | 'SERVER'
  | 'AUTH'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface AnalyticsEvent {
  event_id: string;
  event_name: string;
  category: EventCategory;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  
  // Timing
  duration_ms?: number;
  active_duration_ms?: number;
  visibility_interruptions?: number;
  
  // Status
  success?: boolean;
  error_message?: string;
  error_code?: ErrorCode;
  
  // Entity tracking
  entity_type?: string;
  entity_id?: string;
  
  // Retry info
  retry_count?: number;
  
  // Enriched metadata
  metadata?: Record<string, any>;
}

export interface TrackOptions {
  metadata?: Record<string, any>;
  duration_ms?: number;
  active_duration_ms?: number;
  visibility_interruptions?: number;
  success?: boolean;
  error_message?: string;
  error_code?: ErrorCode;
  entity_type?: string;
  entity_id?: string;
  debounceMs?: number;
  skipDedup?: boolean;
}

export interface PageViewState {
  pageName: string;
  startTime: number;
  activeTime: number;
  lastActiveTime: number;
  visibilityInterruptions: number;
  isActive: boolean;
}

export interface EventQueueItem {
  event: AnalyticsEvent;
  retryCount: number;
  addedAt: number;
}

// Backwards compatibility
export type FeatureCategory = EventCategory;
