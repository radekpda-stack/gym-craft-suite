import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, format } from 'date-fns';

export type StatsPeriod = '7d' | '30d' | '90d' | 'all';

interface FeatureCount {
  feature_name: string;
  feature_category: string;
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface TrendDataPoint {
  date: string;
  count: number;
}

// Define all trackable features for comparison
export const ALL_FEATURES = [
  { name: 'page_view_dashboard', category: 'navigation', label: 'Dashboard' },
  { name: 'page_view_clients', category: 'navigation', label: 'Klienti' },
  { name: 'page_view_trainings', category: 'navigation', label: 'Tréninky' },
  { name: 'page_view_calendar', category: 'navigation', label: 'Kalendář' },
  { name: 'page_view_measurements', category: 'navigation', label: 'Měření' },
  { name: 'page_view_diagnostics', category: 'navigation', label: 'Diagnostika' },
  { name: 'page_view_progress', category: 'navigation', label: 'Progres' },
  { name: 'page_view_ai', category: 'navigation', label: 'AI Asistent' },
  { name: 'page_view_settings', category: 'navigation', label: 'Nastavení' },
  { name: 'page_view_feedback', category: 'navigation', label: 'Zpětná vazba' },
  { name: 'client_create', category: 'clients', label: 'Vytvoření klienta' },
  { name: 'client_update', category: 'clients', label: 'Úprava klienta' },
  { name: 'client_delete', category: 'clients', label: 'Smazání klienta' },
  { name: 'client_filter_gender', category: 'clients', label: 'Filtr pohlaví' },
  { name: 'client_export', category: 'export', label: 'Export klientů' },
  { name: 'training_create', category: 'trainings', label: 'Vytvoření tréninku' },
  { name: 'training_complete', category: 'trainings', label: 'Dokončení tréninku' },
  { name: 'training_cancel', category: 'trainings', label: 'Zrušení tréninku' },
  { name: 'measurement_create', category: 'measurements', label: 'Nové měření' },
  { name: 'measurement_import', category: 'measurements', label: 'Import měření' },
  { name: 'measurement_export', category: 'export', label: 'Export měření' },
  { name: 'credit_add', category: 'finance', label: 'Přidání kreditu' },
  { name: 'product_sale', category: 'finance', label: 'Prodej produktu' },
  { name: 'quick_credit', category: 'finance', label: 'Rychlý kredit' },
  { name: 'search_open', category: 'search', label: 'Vyhledávání' },
  { name: 'ai_chat', category: 'ai', label: 'AI Chat' },
  { name: 'feedback_submit', category: 'feedback', label: 'Odeslání feedbacku' },
  { name: 'photo_upload', category: 'media', label: 'Nahrání fotky' },
  { name: 'voice_record', category: 'media', label: 'Hlasová poznámka' },
  { name: 'diagnostic_create', category: 'diagnostics', label: 'Nová diagnostika' },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigace',
  clients: 'Klienti',
  trainings: 'Tréninky',
  measurements: 'Měření',
  diagnostics: 'Diagnostika',
  finance: 'Finance',
  media: 'Média',
  search: 'Vyhledávání',
  ai: 'AI',
  feedback: 'Zpětná vazba',
  settings: 'Nastavení',
  export: 'Export',
};

function getPeriodStartDate(period: StatsPeriod): Date | null {
  switch (period) {
    case '7d':
      return startOfDay(subDays(new Date(), 7));
    case '30d':
      return startOfDay(subDays(new Date(), 30));
    case '90d':
      return startOfDay(subDays(new Date(), 90));
    case 'all':
      return null;
  }
}

export function useFeatureStats(period: StatsPeriod = '30d') {
  const startDate = getPeriodStartDate(period);

  // Top features query
  const { data: topFeatures, isLoading: loadingTop } = useQuery({
    queryKey: ['feature-stats-top', period],
    queryFn: async () => {
      let query = supabase
        .from('feature_usage')
        .select('feature_name, feature_category');
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count features
      const counts = new Map<string, { category: string; count: number }>();
      for (const row of data || []) {
        const key = row.feature_name;
        const existing = counts.get(key);
        if (existing) {
          existing.count++;
        } else {
          counts.set(key, { category: row.feature_category, count: 1 });
        }
      }

      const result: FeatureCount[] = [];
      counts.forEach((value, key) => {
        result.push({
          feature_name: key,
          feature_category: value.category,
          count: value.count
        });
      });

      return result.sort((a, b) => b.count - a.count);
    }
  });

  // Category breakdown query
  const { data: categoryBreakdown, isLoading: loadingCategories } = useQuery({
    queryKey: ['feature-stats-categories', period],
    queryFn: async () => {
      let query = supabase
        .from('feature_usage')
        .select('feature_category');
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data || []) {
        const key = row.feature_category;
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      const result: CategoryCount[] = [];
      counts.forEach((count, category) => {
        result.push({ category, count });
      });

      return result.sort((a, b) => b.count - a.count);
    }
  });

  // Trend data query
  const { data: trendData, isLoading: loadingTrend } = useQuery({
    queryKey: ['feature-stats-trend', period],
    queryFn: async () => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const start = startOfDay(subDays(new Date(), days));

      const { data, error } = await supabase
        .from('feature_usage')
        .select('created_at')
        .gte('created_at', start.toISOString());

      if (error) throw error;

      // Group by day
      const counts = new Map<string, number>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        counts.set(date, 0);
      }

      for (const row of data || []) {
        const date = format(new Date(row.created_at), 'yyyy-MM-dd');
        if (counts.has(date)) {
          counts.set(date, (counts.get(date) || 0) + 1);
        }
      }

      const result: TrendDataPoint[] = [];
      counts.forEach((count, date) => {
        result.push({ date, count });
      });

      return result;
    }
  });

  // Unused features
  const unusedFeatures = ALL_FEATURES.filter(
    f => !topFeatures?.some(tf => tf.feature_name === f.name)
  );

  // Total usage count
  const totalUsage = topFeatures?.reduce((sum, f) => sum + f.count, 0) || 0;

  return {
    topFeatures: topFeatures || [],
    categoryBreakdown: categoryBreakdown || [],
    trendData: trendData || [],
    unusedFeatures,
    totalUsage,
    isLoading: loadingTop || loadingCategories || loadingTrend
  };
}

export function useClearFeatureStats() {
  return async () => {
    const { error } = await supabase.from('feature_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  };
}
