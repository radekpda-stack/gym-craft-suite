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
  // Navigation
  { name: 'page_view_dashboard', category: 'navigation', label: 'Dashboard' },
  { name: 'page_view_clients', category: 'navigation', label: 'Klienti' },
  { name: 'page_view_trainings', category: 'navigation', label: 'Tréninky' },
  { name: 'page_view_calendar', category: 'navigation', label: 'Kalendář' },
  { name: 'page_view_records', category: 'navigation', label: 'Záznamy' },
  { name: 'page_view_sales', category: 'navigation', label: 'Prodeje' },
  { name: 'page_view_ai', category: 'navigation', label: 'AI Asistent' },
  { name: 'page_view_settings', category: 'navigation', label: 'Nastavení' },
  { name: 'page_view_feedback', category: 'navigation', label: 'Zpětná vazba' },
  { name: 'page_view_client_detail', category: 'navigation', label: 'Detail klienta' },
  { name: 'page_view_training_detail', category: 'navigation', label: 'Detail tréninku' },
  { name: 'page_view_training_plans', category: 'navigation', label: 'Tréninkové plány' },
  { name: 'page_view_pr_history', category: 'navigation', label: 'Historie PR' },
  { name: 'page_view_reminders', category: 'navigation', label: 'Připomínky' },
  // Calendar
  { name: 'calendar_day_view', category: 'calendar', label: 'Denní pohled kalendáře' },
  { name: 'calendar_week_view', category: 'calendar', label: 'Týdenní pohled kalendáře' },
  { name: 'calendar_month_view', category: 'calendar', label: 'Měsíční pohled kalendáře' },
  { name: 'calendar_quick_create', category: 'calendar', label: 'Rychlé vytvoření z kalendáře' },
  { name: 'calendar_quick_payment', category: 'calendar', label: 'Rychlá platba z kalendáře' },
  // Clients
  { name: 'client_create', category: 'clients', label: 'Vytvoření klienta' },
  { name: 'client_update', category: 'clients', label: 'Úprava klienta' },
  { name: 'client_delete', category: 'clients', label: 'Smazání klienta' },
  { name: 'client_archive', category: 'clients', label: 'Archivace klienta' },
  { name: 'client_favorite', category: 'clients', label: 'Oblíbený klient' },
  { name: 'client_filter', category: 'clients', label: 'Filtrování klientů' },
  { name: 'client_export', category: 'export', label: 'Export klientů' },
  { name: 'client_shared_budget', category: 'clients', label: 'Sdílený rozpočet' },
  { name: 'client_recurring_schedule', category: 'clients', label: 'Pravidelný rozvrh klienta' },
  // Trainings
  { name: 'training_create', category: 'trainings', label: 'Vytvoření tréninku' },
  { name: 'training_update', category: 'trainings', label: 'Úprava tréninku' },
  { name: 'training_complete', category: 'trainings', label: 'Dokončení tréninku' },
  { name: 'training_cancel', category: 'trainings', label: 'Zrušení tréninku' },
  { name: 'training_duplicate', category: 'trainings', label: 'Duplikace tréninku' },
  { name: 'training_payment_change', category: 'trainings', label: 'Změna platby tréninku' },
  { name: 'training_add_exercise', category: 'trainings', label: 'Přidání cviku do tréninku' },
  // Training Plans
  { name: 'plan_create', category: 'plans', label: 'Vytvoření plánu' },
  { name: 'plan_generate', category: 'plans', label: 'Generování plánu' },
  { name: 'plan_view', category: 'plans', label: 'Zobrazení plánu' },
  { name: 'plan_delete', category: 'plans', label: 'Smazání plánu' },
  // Measurements
  { name: 'measurement_create', category: 'measurements', label: 'Nové měření' },
  { name: 'measurement_update', category: 'measurements', label: 'Úprava měření' },
  { name: 'measurement_delete', category: 'measurements', label: 'Smazání měření' },
  { name: 'measurement_import_pdf', category: 'measurements', label: 'Import měření (PDF)' },
  { name: 'measurement_import_image', category: 'measurements', label: 'Import měření (foto)' },
  { name: 'measurement_export', category: 'export', label: 'Export měření' },
  // Diagnostics
  { name: 'diagnostic_create', category: 'diagnostics', label: 'Nová diagnostika' },
  { name: 'diagnostic_update', category: 'diagnostics', label: 'Úprava diagnostiky' },
  { name: 'diagnostic_ai_analysis', category: 'diagnostics', label: 'AI analýza diagnostiky' },
  { name: 'diagnostic_view', category: 'diagnostics', label: 'Zobrazení diagnostiky' },
  // Finance
  { name: 'credit_add', category: 'finance', label: 'Přidání kreditu' },
  { name: 'credit_deduct', category: 'finance', label: 'Odečtení kreditu' },
  { name: 'product_sale', category: 'finance', label: 'Prodej produktu' },
  { name: 'quick_credit', category: 'finance', label: 'Rychlý kredit' },
  { name: 'credit_statement_export', category: 'finance', label: 'Export výpisu kreditu' },
  { name: 'unpaid_training_pay', category: 'finance', label: 'Uhrazení nezaplaceného tréninku' },
  { name: 'product_stock_receive', category: 'finance', label: 'Příjem zboží na sklad' },
  // Media
  { name: 'photo_upload', category: 'media', label: 'Nahrání fotky' },
  { name: 'photo_compare', category: 'media', label: 'Porovnání fotek' },
  { name: 'voice_record', category: 'media', label: 'Hlasová poznámka' },
  // Search & UI
  { name: 'search_open', category: 'search', label: 'Vyhledávání' },
  { name: 'quick_action_menu', category: 'search', label: 'Rychlé akce (FAB)' },
  { name: 'context_menu_client', category: 'search', label: 'Kontextové menu klienta' },
  { name: 'context_menu_training', category: 'search', label: 'Kontextové menu tréninku' },
  // AI
  { name: 'ai_chat', category: 'ai', label: 'AI Chat' },
  { name: 'ai_operator', category: 'ai', label: 'AI Operátor' },
  { name: 'ai_nutrition_analysis', category: 'ai', label: 'AI analýza stravy' },
  // Feedback
  { name: 'feedback_link_copy', category: 'feedback', label: 'Kopírování odkazu na feedback' },
  { name: 'feedback_link_generate', category: 'feedback', label: 'Generování odkazu na feedback' },
  { name: 'feedback_message_create', category: 'feedback', label: 'Vytvoření zprávy pro feedback' },
  { name: 'feedback_submit', category: 'feedback', label: 'Vyplnění feedbacku' },
  { name: 'feedback_view', category: 'feedback', label: 'Zobrazení feedbacku' },
  { name: 'feedback_test_email', category: 'feedback', label: 'Test email feedbacku' },
  // Nutrition Logging
  { name: 'nutrition_session_create', category: 'nutrition', label: 'Nová nutriční session' },
  { name: 'nutrition_food_add', category: 'nutrition', label: 'Přidání jídla' },
  { name: 'nutrition_drink_add', category: 'nutrition', label: 'Přidání pití' },
  { name: 'nutrition_coffee_add', category: 'nutrition', label: 'Přidání kávy' },
  { name: 'nutrition_link_copy', category: 'nutrition', label: 'Kopírování odkazu na stravu' },
  { name: 'nutrition_qr_generate', category: 'nutrition', label: 'Generování QR kódu stravy' },
  { name: 'nutrition_export', category: 'nutrition', label: 'Export stravy' },
  { name: 'nutrition_analysis_view', category: 'nutrition', label: 'Zobrazení analýzy stravy' },
  // Progress & PR
  { name: 'progress_entry_create', category: 'progress', label: 'Nový záznam progrese' },
  { name: 'pr_view', category: 'progress', label: 'Zobrazení PR' },
  { name: 'pr_history_export', category: 'export', label: 'Export historie PR' },
  // Settings
  { name: 'settings_prices', category: 'settings', label: 'Nastavení cen' },
  { name: 'settings_products', category: 'settings', label: 'Správa produktů' },
  { name: 'settings_exercises', category: 'settings', label: 'Správa cviků' },
  { name: 'settings_tags', category: 'settings', label: 'Správa tagů' },
  { name: 'settings_company', category: 'settings', label: 'Firemní profil' },
  { name: 'settings_capacity', category: 'settings', label: 'Nastavení kapacity' },
  { name: 'settings_feedback', category: 'settings', label: 'Nastavení feedbacku' },
  { name: 'settings_quick_actions', category: 'settings', label: 'Nastavení rychlých akcí' },
  { name: 'settings_nutrition', category: 'settings', label: 'Nastavení stravy' },
  // Export
  { name: 'annual_stats_export', category: 'export', label: 'Export ročních statistik' },
  { name: 'dashboard_kpi_detail', category: 'navigation', label: 'Detail KPI na dashboardu' },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigace',
  calendar: 'Kalendář',
  clients: 'Klienti',
  trainings: 'Tréninky',
  plans: 'Plány',
  measurements: 'Měření',
  diagnostics: 'Diagnostika',
  finance: 'Finance',
  media: 'Média',
  search: 'Vyhledávání',
  ai: 'AI',
  feedback: 'Zpětná vazba',
  nutrition: 'Strava',
  progress: 'Progrese',
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
