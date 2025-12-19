import { useState, useEffect, useCallback } from 'react';

export type TimeFilter = 'today' | 'week' | 'all';

interface TrainingsPageState {
  timeFilter: TimeFilter;
  statusFilter: string | null;
  activeTab: string;
}

const STORAGE_KEY = 'trainings_page_state';

const defaultState: TrainingsPageState = {
  timeFilter: 'today',
  statusFilter: null,
  activeTab: 'active',
};

export function useTrainingsPageState() {
  const [state, setState] = useState<TrainingsPageState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultState, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load trainings page state:', e);
    }
    return defaultState;
  });

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save trainings page state:', e);
    }
  }, [state]);

  const setTimeFilter = useCallback((timeFilter: TimeFilter) => {
    setState(prev => ({ ...prev, timeFilter }));
  }, []);

  const setStatusFilter = useCallback((statusFilter: string | null) => {
    setState(prev => ({ ...prev, statusFilter }));
  }, []);

  const setActiveTab = useCallback((activeTab: string) => {
    setState(prev => ({ ...prev, activeTab }));
  }, []);

  return {
    ...state,
    setTimeFilter,
    setStatusFilter,
    setActiveTab,
  };
}
