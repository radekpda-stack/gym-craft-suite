// Performance Export types

export type ExportPeriod = '30' | '90' | '180' | '365' | 'all';
export type ExerciseFilter = 'all' | 'prs' | 'custom';

export interface PerformanceExportOptions {
  clientId: string;
  clientName: string;
  period: ExportPeriod;
  exerciseFilter: ExerciseFilter;
  selectedExercises?: string[];
  includeStats: boolean;
  includeChart: boolean;
  includePRs: boolean;
  includeDetails: boolean;
}

export interface ExerciseEntryForExport {
  id: string;
  date: string;
  exerciseName: string;
  exerciseId: string | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  timeSeconds: number | null;
  distanceMeters: number | null;
  isBodyweight: boolean;
  isPr: boolean;
  rpe: number | null;
  notes: string | null;
}

export interface ExportPR {
  exerciseName: string;
  bestValue: number;
  bestDisplay: string;
  unit: string;
  metricType: 'weight' | 'time' | 'reps' | 'distance';
  achievedAt: string;
}

export interface PerformanceExportStats {
  totalEntries: number;
  totalSessions: number;
  totalPRs: number;
  totalVolume: number;
  totalDuration: number;
  topExercises: { name: string; count: number }[];
  periodStart: string;
  periodEnd: string;
}

export interface ChartDataPoint {
  date: string;
  volume: number;
  sessions: number;
}

export interface PerformanceExportData {
  entries: ExerciseEntryForExport[];
  prs: ExportPR[];
  stats: PerformanceExportStats;
  chartData: ChartDataPoint[];
  uniqueExercises: { id: string | null; name: string }[];
}
