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
  'aiWidget',
  'mainContent',
];

const STORAGE_KEY = 'layout-preferences';

function loadPreferences(): LayoutPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Merge new sidebar items that might be missing from stored preferences
      let sidebarOrder = parsed.sidebarOrder || DEFAULT_SIDEBAR_ORDER;
      DEFAULT_SIDEBAR_ORDER.forEach(item => {
        if (!sidebarOrder.includes(item)) {
          const settingsIndex = sidebarOrder.indexOf('settings');
          if (settingsIndex !== -1) {
            sidebarOrder.splice(settingsIndex, 0, item);
          } else {
            sidebarOrder.push(item);
          }
        }
      });
      
      // Merge new dashboard sections that might be missing
      let dashboardSectionsOrder = parsed.dashboardSectionsOrder || DEFAULT_DASHBOARD_SECTIONS_ORDER;
      // Remove deprecated items
      dashboardSectionsOrder = dashboardSectionsOrder.filter((id: string) => id !== 'taxCalculator');
      // Add new items
      DEFAULT_DASHBOARD_SECTIONS_ORDER.forEach(item => {
        if (!dashboardSectionsOrder.includes(item)) {
          const mainContentIndex = dashboardSectionsOrder.indexOf('mainContent');
          if (mainContentIndex !== -1) {
            dashboardSectionsOrder.splice(mainContentIndex, 0, item);
          } else {
            dashboardSectionsOrder.push(item);
          }
        }
      });
      
      return {
        sidebarOrder,
        dashboardStatsOrder: parsed.dashboardStatsOrder || DEFAULT_DASHBOARD_STATS_ORDER,
        dashboardSectionsOrder,
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
