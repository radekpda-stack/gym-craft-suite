import { useMemo, useState } from 'react';
import { useMeasurements, Measurement } from './useMeasurements';
import { useDiagnostics, Diagnostic } from './useDiagnostics';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export type RecordType = 'measurement' | 'diagnostic';
export type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export interface BaseRecordItem {
  id: string;
  date: string;
  clientId: string;
}

export interface MeasurementRecordItem extends BaseRecordItem {
  type: 'measurement';
  data: Measurement;
}

export interface DiagnosticRecordItem extends BaseRecordItem {
  type: 'diagnostic';
  data: Diagnostic;
}

export type RecordItem = MeasurementRecordItem | DiagnosticRecordItem;

export interface RecordsFeedFilters {
  clientId: string | null;
  period: PeriodFilter;
  recordType: RecordType | 'all';
}

const STORAGE_KEY = 'records-feed-filters';

function getDefaultFilters(): RecordsFeedFilters {
  if (typeof window === 'undefined') {
    return { clientId: null, period: 'week', recordType: 'all' };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Reset recordType if it was 'training' from old data
      if (parsed.recordType === 'training') {
        parsed.recordType = 'all';
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  
  return { clientId: null, period: 'week', recordType: 'all' };
}

function getPeriodRange(period: PeriodFilter): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'all':
      return null;
  }
}

export function useRecordsFeed() {
  const [filters, setFiltersState] = useState<RecordsFeedFilters>(getDefaultFilters);
  
  // Fetch measurements and diagnostics only
  const { data: measurements = [], isLoading: measurementsLoading } = useMeasurements(filters.clientId || undefined);
  const { data: diagnostics = [], isLoading: diagnosticsLoading } = useDiagnostics(filters.clientId || undefined);
  
  // Persist filters to localStorage
  const setFilters = (newFilters: RecordsFeedFilters | ((prev: RecordsFeedFilters) => RecordsFeedFilters)) => {
    setFiltersState(prev => {
      const updated = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };
  
  // Aggregate and filter records
  const records = useMemo(() => {
    const items: RecordItem[] = [];
    const periodRange = getPeriodRange(filters.period);
    
    const isInPeriod = (dateStr: string) => {
      if (!periodRange) return true;
      const date = parseISO(dateStr);
      return isWithinInterval(date, periodRange);
    };
    
    // Add measurements
    if (filters.recordType === 'all' || filters.recordType === 'measurement') {
      measurements.forEach(measurement => {
        if (isInPeriod(measurement.date)) {
          items.push({
            id: measurement.id,
            date: measurement.date,
            clientId: measurement.client_id,
            type: 'measurement',
            data: measurement,
          });
        }
      });
    }
    
    // Add diagnostics
    if (filters.recordType === 'all' || filters.recordType === 'diagnostic') {
      diagnostics.forEach(diagnostic => {
        if (isInPeriod(diagnostic.date)) {
          items.push({
            id: diagnostic.id,
            date: diagnostic.date,
            clientId: diagnostic.client_id,
            type: 'diagnostic',
            data: diagnostic,
          });
        }
      });
    }
    
    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return items;
  }, [measurements, diagnostics, filters.period, filters.recordType]);
  
  // Group records by day
  const groupedRecords = useMemo(() => {
    const groups: Record<string, RecordItem[]> = {};
    
    records.forEach(record => {
      const dateKey = record.date.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });
    
    // Sort items within each group by time
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return groups;
  }, [records]);
  
  // Get sorted day keys
  const sortedDays = useMemo(() => {
    return Object.keys(groupedRecords).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedRecords]);
  
  // Counts for each type
  const counts = useMemo(() => ({
    measurement: records.filter(r => r.type === 'measurement').length,
    diagnostic: records.filter(r => r.type === 'diagnostic').length,
    total: records.length,
  }), [records]);
  
  const isLoading = measurementsLoading || diagnosticsLoading;
  
  return {
    records,
    groupedRecords,
    sortedDays,
    counts,
    filters,
    setFilters,
    isLoading,
  };
}
