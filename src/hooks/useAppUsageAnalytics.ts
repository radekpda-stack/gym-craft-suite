import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, format } from 'date-fns';
import { ALL_FEATURES, CATEGORY_LABELS } from './useFeatureStats';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

interface CategoryDistribution {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

interface NavigationVsActions {
  type: 'navigation' | 'action';
  label: string;
  count: number;
  percentage: number;
}

interface FeatureUsageItem {
  name: string;
  label: string;
  category: string;
  count: number;
}

interface ModuleConversion {
  module: string;
  label: string;
  views: number;
  actions: number;
  conversionRate: number;
}

interface FrictionPoint {
  pattern: string;
  type: 'rapid_leave' | 'repeated_edits' | 'zero_actions' | 'frequent_cancel' | 'unused_feature';
  count: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface Recommendation {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export interface AppUsageAnalytics {
  totalEvents: number;
  uniqueSessions: number;
  avgEventsPerSession: number;
  categoryDistribution: CategoryDistribution[];
  navigationVsActions: NavigationVsActions[];
  topFeatures: FeatureUsageItem[];
  leastUsedFeatures: FeatureUsageItem[];
  moduleConversion: ModuleConversion[];
  frictionPoints: FrictionPoint[];
  recommendations: Recommendation[];
}

function getPeriodStartDate(period: AnalyticsPeriod): Date {
  switch (period) {
    case '7d':
      return startOfDay(subDays(new Date(), 7));
    case '30d':
      return startOfDay(subDays(new Date(), 30));
    case '90d':
      return startOfDay(subDays(new Date(), 90));
  }
}

// Define modules and their view/action patterns
const MODULE_PATTERNS: { module: string; label: string; viewPattern: RegExp; actionPattern: RegExp }[] = [
  { 
    module: 'clients', 
    label: 'Klienti',
    viewPattern: /^page_view_client/i,
    actionPattern: /^client_(create|update|delete|archive|unarchive)/i
  },
  { 
    module: 'trainings', 
    label: 'Tréninky',
    viewPattern: /^page_view_training/i,
    actionPattern: /^training_(create|update|complete|cancel|delete|duplicate)/i
  },
  { 
    module: 'calendar', 
    label: 'Kalendář',
    viewPattern: /^(page_view_calendar|calendar_(day|week|month)_view)/i,
    actionPattern: /^calendar_(quick_create|quick_payment)/i
  },
  { 
    module: 'finance', 
    label: 'Finance',
    viewPattern: /^page_view_sales/i,
    actionPattern: /^(credit_|product_sale|unpaid_training_pay)/i
  },
  { 
    module: 'feedback', 
    label: 'Feedback',
    viewPattern: /^(page_view_feedback|feedback_view)/i,
    actionPattern: /^feedback_(link_copy|link_generate|message_create)/i
  },
  { 
    module: 'measurements', 
    label: 'Měření',
    viewPattern: /^page_view_records/i,
    actionPattern: /^measurement_(create|update|import)/i
  },
  { 
    module: 'diagnostics', 
    label: 'Diagnostika',
    viewPattern: /^diagnostic_view/i,
    actionPattern: /^diagnostic_(create|update|ai_analysis)/i
  },
  { 
    module: 'settings', 
    label: 'Nastavení',
    viewPattern: /^page_view_settings/i,
    actionPattern: /^settings_/i
  },
];

export function useAppUsageAnalytics(period: AnalyticsPeriod = '30d') {
  const startDate = getPeriodStartDate(period);

  return useQuery({
    queryKey: ['app-usage-analytics', period],
    queryFn: async (): Promise<AppUsageAnalytics> => {
      // Fetch all feature usage data
      const { data: usageData, error: usageError } = await supabase
        .from('feature_usage')
        .select('feature_name, feature_category, session_id, success, created_at')
        .gte('created_at', startDate.toISOString());

      if (usageError) throw usageError;

      const events = usageData || [];
      const totalEvents = events.length;

      // Unique sessions
      const uniqueSessionIds = new Set(events.filter(e => e.session_id).map(e => e.session_id));
      const uniqueSessions = uniqueSessionIds.size || 1;
      const avgEventsPerSession = Math.round(totalEvents / uniqueSessions);

      // Category distribution
      const categoryCounts = new Map<string, number>();
      for (const event of events) {
        const cat = event.feature_category;
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }

      const categoryDistribution: CategoryDistribution[] = Array.from(categoryCounts.entries())
        .map(([category, count]) => ({
          category,
          label: CATEGORY_LABELS[category] || category,
          count,
          percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Navigation vs Actions
      const navigationCount = events.filter(e => e.feature_name.startsWith('page_view_')).length;
      const actionCount = totalEvents - navigationCount;
      
      const navigationVsActions: NavigationVsActions[] = [
        { 
          type: 'navigation', 
          label: 'Navigace (zobrazení stránek)', 
          count: navigationCount,
          percentage: totalEvents > 0 ? Math.round((navigationCount / totalEvents) * 100) : 0
        },
        { 
          type: 'action', 
          label: 'Akce (vytvoření, úpravy, mazání)', 
          count: actionCount,
          percentage: totalEvents > 0 ? Math.round((actionCount / totalEvents) * 100) : 0
        }
      ];

      // Feature counts
      const featureCounts = new Map<string, { category: string; count: number }>();
      for (const event of events) {
        const existing = featureCounts.get(event.feature_name);
        if (existing) {
          existing.count++;
        } else {
          featureCounts.set(event.feature_name, { category: event.feature_category, count: 1 });
        }
      }

      // Map to labels
      const featureWithLabels: FeatureUsageItem[] = Array.from(featureCounts.entries())
        .map(([name, data]) => {
          const featureDef = ALL_FEATURES.find(f => f.name === name);
          return {
            name,
            label: featureDef?.label || name,
            category: data.category,
            count: data.count
          };
        })
        .sort((a, b) => b.count - a.count);

      const topFeatures = featureWithLabels.slice(0, 10);
      
      // Least used (but used at least once)
      const leastUsedFeatures = featureWithLabels
        .filter(f => f.count > 0)
        .slice(-10)
        .reverse();

      // Module conversion
      const moduleConversion: ModuleConversion[] = MODULE_PATTERNS.map(mp => {
        const views = events.filter(e => mp.viewPattern.test(e.feature_name)).length;
        const actions = events.filter(e => mp.actionPattern.test(e.feature_name)).length;
        const conversionRate = views > 0 ? Math.round((actions / views) * 100) : 0;

        return {
          module: mp.module,
          label: mp.label,
          views,
          actions,
          conversionRate
        };
      }).filter(m => m.views > 0 || m.actions > 0).sort((a, b) => b.views - a.views);

      // Friction points analysis
      const frictionPoints: FrictionPoint[] = [];

      // 1. Zero actions in modules with views
      for (const mc of moduleConversion) {
        if (mc.views > 5 && mc.actions === 0) {
          frictionPoints.push({
            pattern: `Modul "${mc.label}" otevírán, ale bez akcí`,
            type: 'zero_actions',
            count: mc.views,
            severity: 'high',
            suggestion: 'Zvážit zjednodušení workflow nebo přidání onboardingu'
          });
        } else if (mc.views > 10 && mc.conversionRate < 20) {
          frictionPoints.push({
            pattern: `Nízká konverze v modulu "${mc.label}" (${mc.conversionRate}%)`,
            type: 'zero_actions',
            count: mc.views,
            severity: 'medium',
            suggestion: 'Analyzovat UX a zjednodušit cestu k akci'
          });
        }
      }

      // 2. Frequent cancels
      const cancelCount = events.filter(e => e.feature_name.includes('cancel')).length;
      if (cancelCount > 5) {
        frictionPoints.push({
          pattern: `Časté rušení/storno akcí`,
          type: 'frequent_cancel',
          count: cancelCount,
          severity: cancelCount > 20 ? 'high' : 'medium',
          suggestion: 'Přidat potvrzovací dialogy nebo undo funkci'
        });
      }

      // 3. Repeated edits (potential confusion)
      const editCount = events.filter(e => e.feature_name.includes('update') || e.feature_name.includes('edit')).length;
      const createCount = events.filter(e => e.feature_name.includes('create')).length;
      if (createCount > 0 && editCount / createCount > 3) {
        frictionPoints.push({
          pattern: `Vysoký poměr úprav vs vytvoření (${Math.round(editCount / createCount)}:1)`,
          type: 'repeated_edits',
          count: editCount,
          severity: 'medium',
          suggestion: 'Zlepšit formuláře pro první zadání dat'
        });
      }

      // 4. Unused features
      const usedFeatureNames = new Set(events.map(e => e.feature_name));
      const unusedImportant = ALL_FEATURES.filter(f => 
        !usedFeatureNames.has(f.name) && 
        !f.name.startsWith('page_view_') &&
        ['export', 'ai', 'plans'].includes(f.category)
      );
      
      if (unusedImportant.length > 3) {
        frictionPoints.push({
          pattern: `${unusedImportant.length} funkcí nikdy nebylo použito`,
          type: 'unused_feature',
          count: unusedImportant.length,
          severity: 'low',
          suggestion: 'Zvážit lepší viditelnost nebo odstranění nevyužívaných funkcí'
        });
      }

      // Generate recommendations
      const recommendations: Recommendation[] = [];

      // Success recommendations
      if (topFeatures.length > 0) {
        const topCat = categoryDistribution[0];
        if (topCat) {
          recommendations.push({
            type: 'success',
            message: `${topCat.label} je nejpoužívanější kategorie (${topCat.percentage}% aktivit) - výborně!`
          });
        }
      }

      // Warning recommendations
      const lowConversionModules = moduleConversion.filter(m => m.conversionRate < 30 && m.views > 5);
      for (const lcm of lowConversionModules.slice(0, 2)) {
        recommendations.push({
          type: 'warning',
          message: `Modul "${lcm.label}" má nízkou konverzi (${lcm.conversionRate}%) - zvážit UX audit`
        });
      }

      // Info recommendations
      if (actionCount / navigationCount < 0.3) {
        recommendations.push({
          type: 'info',
          message: 'Více prohlížení než akcí - aplikace je možná příliš složitá pro běžné úkony'
        });
      }

      const unusedCategories = Object.keys(CATEGORY_LABELS).filter(
        cat => !categoryCounts.has(cat) && !['system', 'search'].includes(cat)
      );
      if (unusedCategories.length > 0) {
        recommendations.push({
          type: 'info',
          message: `Nevyužité kategorie: ${unusedCategories.map(c => CATEGORY_LABELS[c]).join(', ')}`
        });
      }

      return {
        totalEvents,
        uniqueSessions,
        avgEventsPerSession,
        categoryDistribution,
        navigationVsActions,
        topFeatures,
        leastUsedFeatures,
        moduleConversion,
        frictionPoints,
        recommendations
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
