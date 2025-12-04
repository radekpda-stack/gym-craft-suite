import { useState, useEffect, useCallback } from 'react';

export interface LayoutPreferences {
  sidebarOrder: string[];
  dashboardStatsOrder: string[];
  dashboardSectionsOrder: string[];
}

const DEFAULT_SIDEBAR_ORDER = [
  'dashboard',
  'clients',
  'trainings',
  'exercises',
  'diagnostics',
  'measurements',
  'calendar',
  'canceled',
  'ai-assistant',
  'settings',
];

const DEFAULT_DASHBOARD_STATS_ORDER = [
  'income',
  'profit',
  'credit',
  'costs',
  'lowCredit',
];

const DEFAULT_DASHBOARD_SECTIONS_ORDER = [
  'charts',
  'statsAndCredits',
  'mainContent',
  'taxCalculator',
];

const STORAGE_KEY = 'layout-preferences';

function loadPreferences(): LayoutPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Merge new items that might be missing from stored preferences
      let sidebarOrder = parsed.sidebarOrder || DEFAULT_SIDEBAR_ORDER;
      
      // Add any missing items from DEFAULT_SIDEBAR_ORDER
      DEFAULT_SIDEBAR_ORDER.forEach(item => {
        if (!sidebarOrder.includes(item)) {
          // Insert before 'settings' if possible, otherwise at the end
          const settingsIndex = sidebarOrder.indexOf('settings');
          if (settingsIndex !== -1) {
            sidebarOrder.splice(settingsIndex, 0, item);
          } else {
            sidebarOrder.push(item);
          }
        }
      });
      
      return {
        sidebarOrder,
        dashboardStatsOrder: parsed.dashboardStatsOrder || DEFAULT_DASHBOARD_STATS_ORDER,
        dashboardSectionsOrder: parsed.dashboardSectionsOrder || DEFAULT_DASHBOARD_SECTIONS_ORDER,
      };
    }
  } catch (e) {
    console.error('Failed to load layout preferences:', e);
  }
  return {
    sidebarOrder: DEFAULT_SIDEBAR_ORDER,
    dashboardStatsOrder: DEFAULT_DASHBOARD_STATS_ORDER,
    dashboardSectionsOrder: DEFAULT_DASHBOARD_SECTIONS_ORDER,
  };
}

function savePreferences(prefs: LayoutPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save layout preferences:', e);
  }
}

export function useLayoutPreferences() {
  const [preferences, setPreferences] = useState<LayoutPreferences>(loadPreferences);

  const updateSidebarOrder = useCallback((newOrder: string[]) => {
    setPreferences(prev => {
      const updated = { ...prev, sidebarOrder: newOrder };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const updateDashboardStatsOrder = useCallback((newOrder: string[]) => {
    setPreferences(prev => {
      const updated = { ...prev, dashboardStatsOrder: newOrder };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const updateDashboardSectionsOrder = useCallback((newOrder: string[]) => {
    setPreferences(prev => {
      const updated = { ...prev, dashboardSectionsOrder: newOrder };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults: LayoutPreferences = {
      sidebarOrder: DEFAULT_SIDEBAR_ORDER,
      dashboardStatsOrder: DEFAULT_DASHBOARD_STATS_ORDER,
      dashboardSectionsOrder: DEFAULT_DASHBOARD_SECTIONS_ORDER,
    };
    setPreferences(defaults);
    savePreferences(defaults);
  }, []);

  return {
    preferences,
    updateSidebarOrder,
    updateDashboardStatsOrder,
    updateDashboardSectionsOrder,
    resetToDefaults,
  };
}
