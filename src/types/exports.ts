/**
 * Centralized type exports
 * Import types from here for consistent usage across the application
 */

// Client types
export type { 
  Client, 
  ClientQuickInfo, 
  ClientRef,
  PaymentMode, 
  Gender, 
  ClientStatus 
} from './client';

// Training types
export type { 
  TrainingSession, 
  TrainingSessionWithClient,
  ScheduleItem,
  TrainingStatus, 
  PaymentStatus 
} from './training';

// Dashboard types
export type { 
  DashboardViewModel,
  PriorityTask,
  CapacityInfo,
  FinanceMetrics,
  TrendData,
  WeeklySummary,
  ParticipantBreakdown,
  TopClient,
  DayDistributionItem,
  HourDistributionItem,
  DayStatus,
  TaskType,
  TaskSeverity
} from './dashboard';

// Finance types - canonical source is useCreditOperations
export type { 
  CreditTransaction,
  TransactionType, 
  PaymentMethod 
} from '@/hooks/useCreditOperations';

// Feedback types
export type { 
  FeedbackRequest, 
  TrainingFeedback,
  FeedbackStatus 
} from './feedback';

// Common types
export type { 
  ApiResponse, 
  PaginatedResponse,
  Status,
  Trend,
  DateRange,
  SortConfig
} from './common';
