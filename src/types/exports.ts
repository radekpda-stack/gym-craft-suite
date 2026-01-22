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

// Finance types
export type { 
  CreditTransaction, 
  ProductTransaction,
  TransactionType, 
  PaymentMethod 
} from './finance';

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
