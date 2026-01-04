import { useState, useCallback } from 'react';

export interface LayoutPreferences {
  sidebarOrder: string[];
  hiddenSidebarItems: string[];
  dashboardStatsOrder: string[];
  dashboardSectionsOrder: string[];
  quickActionOrder: string[];
  hiddenQuickActions: string[];
}

const DEFAULT_SIDEBAR_ORDER = [
  'dashboard',
  'clients',
  'trainings',
  'progress',
  'sales',
  'diagnostics',
  'measurements',
  'calendar',
  'canceled',
  'ai-assistant',
  'settings',
];

const DEFAULT_HIDDEN_SIDEBAR_ITEMS: string[] = [];

const DEFAULT_DASHBOARD_STATS_ORDER = [
  'income',
  'profit',
  'credit',
  'costs',
  'lowCredit',
  'unpaid',
];

const DEFAULT_DASHBOARD_SECTIONS_ORDER = [
  'unpaid',
  'charts',
  'trainingStats',
  'trainingTrend',
  'topClients',
  'statsAndCredits',
  'aiWidget',
  'mainContent',
];

const DEFAULT_QUICK_ACTION_ORDER = [
  'sale',
  'credit',
  'training',
  'diagnostic',
  'measurement',
  'performance',
];

const DEFAULT_HIDDEN_QUICK_ACTIONS: string[] = [];

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
      dashboardSectionsOrder = dashboardSectionsOrder.filter((id: string) => 
        id !== 'taxCalculator' && id !== 'salesChart'
      );
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

      // Merge new quick actions that might be missing
      let quickActionOrder = parsed.quickActionOrder || DEFAULT_QUICK_ACTION_ORDER;
      DEFAULT_QUICK_ACTION_ORDER.forEach(item => {
        if (!quickActionOrder.includes(item)) {
          quickActionOrder.push(item);
        }
      });
      
      return {
        sidebarOrder,
        hiddenSidebarItems: parsed.hiddenSidebarItems || DEFAULT_HIDDEN_SIDEBAR_ITEMS,
        dashboardStatsOrder: parsed.dashboardStatsOrder || DEFAULT_DASHBOARD_STATS_ORDER,
        dashboardSectionsOrder,
        quickActionOrder,
        hiddenQuickActions: parsed.hiddenQuickActions || DEFAULT_HIDDEN_QUICK_ACTIONS,
      };
    }
  } catch (e) {
    console.error('Failed to load layout preferences:', e);
  }
  return {
    sidebarOrder: DEFAULT_SIDEBAR_ORDER,
    hiddenSidebarItems: DEFAULT_HIDDEN_SIDEBAR_ITEMS,
    dashboardStatsOrder: DEFAULT_DASHBOARD_STATS_ORDER,
    dashboardSectionsOrder: DEFAULT_DASHBOARD_SECTIONS_ORDER,
    quickActionOrder: DEFAULT_QUICK_ACTION_ORDER,
    hiddenQuickActions: DEFAULT_HIDDEN_QUICK_ACTIONS,
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
      hiddenSidebarItems: DEFAULT_HIDDEN_SIDEBAR_ITEMS,
      dashboardStatsOrder: DEFAULT_DASHBOARD_STATS_ORDER,
      dashboardSectionsOrder: DEFAULT_DASHBOARD_SECTIONS_ORDER,
      quickActionOrder: DEFAULT_QUICK_ACTION_ORDER,
      hiddenQuickActions: DEFAULT_HIDDEN_QUICK_ACTIONS,
    };
    setPreferences(defaults);
    savePreferences(defaults);
  }, []);

  const toggleSidebarItemVisibility = useCallback((itemId: string) => {
    setPreferences(prev => {
      const isHidden = prev.hiddenSidebarItems.includes(itemId);
      const newHiddenItems = isHidden
        ? prev.hiddenSidebarItems.filter(id => id !== itemId)
        : [...prev.hiddenSidebarItems, itemId];
      const updated = { ...prev, hiddenSidebarItems: newHiddenItems };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const updateQuickActionOrder = useCallback((newOrder: string[]) => {
    setPreferences(prev => {
      const updated = { ...prev, quickActionOrder: newOrder };
      savePreferences(updated);
      return updated;
    });
  }, []);

  const toggleQuickActionVisibility = useCallback((actionId: string) => {
    setPreferences(prev => {
      const isHidden = prev.hiddenQuickActions.includes(actionId);
      // Prevent hiding all actions - at least one must remain visible
      const visibleCount = prev.quickActionOrder.filter(id => !prev.hiddenQuickActions.includes(id)).length;
      if (!isHidden && visibleCount <= 1) {
        return prev; // Don't hide if it's the last visible action
      }
      const newHiddenActions = isHidden
        ? prev.hiddenQuickActions.filter(id => id !== actionId)
        : [...prev.hiddenQuickActions, actionId];
      const updated = { ...prev, hiddenQuickActions: newHiddenActions };
      savePreferences(updated);
      return updated;
    });
  }, []);

  return {
    preferences,
    updateSidebarOrder,
    updateDashboardStatsOrder,
    updateDashboardSectionsOrder,
    toggleSidebarItemVisibility,
    updateQuickActionOrder,
    toggleQuickActionVisibility,
    resetToDefaults,
  };
}
