/**
 * Common utility types used across the application
 */

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  total: number;
  page: number;
  pageSize: number;
}

// Generic status types
export type Status = 'ok' | 'warning' | 'error';
export type Trend = 'up' | 'down' | 'stable';

// Date range filter
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Sorting
export interface SortConfig<T> {
  key: keyof T;
  direction: 'asc' | 'desc';
}
