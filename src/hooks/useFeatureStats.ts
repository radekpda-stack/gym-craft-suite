import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface SessionStats {
  totalSessions: number;
  avgDuration: number;
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
}

interface DailyActiveUsers {
  date: string;
  users: number;
}

// Define all trackable features for comparison
export const ALL_FEATURES = [
  // ==============================
  // NAVIGATION - Page Views
  // ==============================
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
  { name: 'page_view_training_plan_detail', category: 'navigation', label: 'Detail tréninkovému plánu' },
  { name: 'page_view_pr_history', category: 'navigation', label: 'Historie PR' },
  { name: 'page_view_reminders', category: 'navigation', label: 'Připomínky' },
  { name: 'page_view_feedback_overview', category: 'navigation', label: 'Přehled feedbacků' },
  { name: 'page_view_canceled_trainings', category: 'navigation', label: 'Zrušené tréninky' },
  { name: 'page_view_public_nutrition_log', category: 'navigation', label: 'Veřejný nutriční log' },
  { name: 'page_view_public_feedback', category: 'navigation', label: 'Veřejný feedback' },
  { name: 'page_view_auth', category: 'navigation', label: 'Přihlášení' },
  { name: 'page_view_not_found', category: 'navigation', label: '404 stránka' },
  { name: 'page_view_my_profile', category: 'navigation', label: 'Můj profil' },
  { name: 'page_view_statistics', category: 'navigation', label: 'Statistiky' },
  { name: 'page_view_challenges', category: 'navigation', label: 'Výzvy' },
  { name: 'page_view_exercises', category: 'navigation', label: 'Cviky' },
  { name: 'page_view_exercise_detail', category: 'navigation', label: 'Detail cviku' },
  { name: 'page_view_tests', category: 'navigation', label: 'Testy' },
  { name: 'page_view_nutrition_campaigns', category: 'navigation', label: 'Nutriční kampaně' },
  { name: 'page_view_nutrition_overview', category: 'navigation', label: 'Přehled stravy' },
  { name: 'page_view_client_portal_admin', category: 'navigation', label: 'Admin klientské zóny' },
  { name: 'page_view_analytics', category: 'navigation', label: 'Analytika' },
  { name: 'page_view_app_usage_stats', category: 'navigation', label: 'Statistika využívání' },
  { name: 'page_view_business_analytics', category: 'navigation', label: 'Byznys analytika' },
  { name: 'page_view_capacity_stats', category: 'navigation', label: 'Statistiky kapacity' },
  { name: 'page_view_schedule', category: 'navigation', label: 'Rozvrh' },
  { name: 'page_view_nutrition', category: 'navigation', label: 'Strava' },
  { name: 'page_view_nutrition_client_detail', category: 'navigation', label: 'Strava - detail klienta' },
  
  // ==============================
  // CALENDAR
  // ==============================
  { name: 'calendar_day_view', category: 'calendar', label: 'Denní pohled kalendáře' },
  { name: 'calendar_week_view', category: 'calendar', label: 'Týdenní pohled kalendáře' },
  { name: 'calendar_month_view', category: 'calendar', label: 'Měsíční pohled kalendáře' },
  { name: 'calendar_quick_create', category: 'calendar', label: 'Rychlé vytvoření z kalendáře' },
  { name: 'calendar_quick_payment', category: 'calendar', label: 'Rychlá platba z kalendáře' },
  { name: 'calendar_drag_drop', category: 'calendar', label: 'Přesun tréninku v kalendáři' },
  { name: 'calendar_recurring_create', category: 'calendar', label: 'Vytvoření pravidelného tréninku' },
  
  // ==============================
  // CLIENTS
  // ==============================
  { name: 'client_create', category: 'clients', label: 'Vytvoření klienta' },
  { name: 'client_update', category: 'clients', label: 'Úprava klienta' },
  { name: 'client_delete', category: 'clients', label: 'Smazání klienta' },
  { name: 'client_archive', category: 'clients', label: 'Archivace klienta' },
  { name: 'client_unarchive', category: 'clients', label: 'Obnovení klienta z archivu' },
  { name: 'client_favorite', category: 'clients', label: 'Oblíbený klient' },
  { name: 'client_filter', category: 'clients', label: 'Filtrování klientů' },
  { name: 'client_export', category: 'export', label: 'Export klientů' },
  { name: 'client_shared_budget', category: 'clients', label: 'Sdílený rozpočet' },
  { name: 'client_recurring_schedule', category: 'clients', label: 'Pravidelný rozvrh klienta' },
  { name: 'client_tag_add', category: 'clients', label: 'Přidání tagu ke klientovi' },
  { name: 'client_tag_remove', category: 'clients', label: 'Odebrání tagu od klienta' },
  { name: 'client_portal_access_create', category: 'clients', label: 'Vytvoření přístupu do portálu' },
  { name: 'client_portal_access_revoke', category: 'clients', label: 'Zrušení přístupu do portálu' },
  { name: 'context_menu_add_training', category: 'clients', label: 'Kontext menu - přidat trénink' },
  { name: 'context_menu_add_credit', category: 'clients', label: 'Kontext menu - přidat kredit' },
  { name: 'context_menu_add_measurement', category: 'clients', label: 'Kontext menu - přidat měření' },
  { name: 'context_menu_add_progress', category: 'clients', label: 'Kontext menu - přidat progres' },
  { name: 'context_menu_add_note', category: 'clients', label: 'Kontext menu - přidat poznámku' },
  
  // ==============================
  // TRAININGS
  // ==============================
  { name: 'training_create', category: 'trainings', label: 'Vytvoření tréninku' },
  { name: 'training_update', category: 'trainings', label: 'Úprava tréninku' },
  { name: 'training_complete', category: 'trainings', label: 'Dokončení tréninku' },
  { name: 'training_cancel', category: 'trainings', label: 'Zrušení tréninku' },
  { name: 'training_delete', category: 'trainings', label: 'Smazání tréninku' },
  { name: 'training_duplicate', category: 'trainings', label: 'Duplikace tréninku' },
  { name: 'training_payment_change', category: 'trainings', label: 'Změna platby tréninku' },
  { name: 'training_add_exercise', category: 'trainings', label: 'Přidání cviku do tréninku' },
  { name: 'training_batch_create', category: 'trainings', label: 'Hromadné vytvoření tréninků' },
  { name: 'training_note_add', category: 'trainings', label: 'Přidání poznámky k tréninku' },
  { name: 'training_cardio_add', category: 'trainings', label: 'Přidání kardia k tréninku' },
  
  // ==============================
  // TRAINING PLANS
  // ==============================
  { name: 'plan_create', category: 'plans', label: 'Vytvoření plánu' },
  { name: 'plan_generate', category: 'plans', label: 'Generování plánu' },
  { name: 'plan_view', category: 'plans', label: 'Zobrazení plánu' },
  { name: 'plan_delete', category: 'plans', label: 'Smazání plánu' },
  { name: 'plan_duplicate', category: 'plans', label: 'Duplikace plánu' },
  { name: 'plan_share', category: 'plans', label: 'Sdílení plánu' },
  { name: 'plan_pdf_export', category: 'plans', label: 'Export plánu do PDF' },
  
  // ==============================
  // MEASUREMENTS
  // ==============================
  { name: 'measurement_create', category: 'measurements', label: 'Nové měření' },
  { name: 'measurement_update', category: 'measurements', label: 'Úprava měření' },
  { name: 'measurement_delete', category: 'measurements', label: 'Smazání měření' },
  { name: 'measurement_import_pdf', category: 'measurements', label: 'Import měření (PDF)' },
  { name: 'measurement_import_image', category: 'measurements', label: 'Import měření (foto)' },
  { name: 'measurement_export', category: 'export', label: 'Export měření' },
  { name: 'measurement_chart_view', category: 'measurements', label: 'Zobrazení grafu měření' },
  
  // ==============================
  // DIAGNOSTICS
  // ==============================
  { name: 'diagnostic_create', category: 'diagnostics', label: 'Nová diagnostika' },
  { name: 'diagnostic_update', category: 'diagnostics', label: 'Úprava diagnostiky' },
  { name: 'diagnostic_delete', category: 'diagnostics', label: 'Smazání diagnostiky' },
  { name: 'diagnostic_ai_analysis', category: 'diagnostics', label: 'AI analýza diagnostiky' },
  { name: 'diagnostic_view', category: 'diagnostics', label: 'Zobrazení diagnostiky' },
  { name: 'diagnostic_photo_add', category: 'diagnostics', label: 'Přidání foto k diagnostice' },
  { name: 'diagnostic_video_add', category: 'diagnostics', label: 'Přidání videa k diagnostice' },
  
  // ==============================
  // FINANCE
  // ==============================
  { name: 'credit_add', category: 'finance', label: 'Přidání kreditu' },
  { name: 'credit_deduct', category: 'finance', label: 'Odečtení kreditu' },
  { name: 'product_sale', category: 'finance', label: 'Prodej produktu' },
  { name: 'product_create', category: 'finance', label: 'Vytvoření produktu' },
  { name: 'product_update', category: 'finance', label: 'Úprava produktu' },
  { name: 'product_delete', category: 'finance', label: 'Smazání produktu' },
  { name: 'quick_credit', category: 'finance', label: 'Rychlý kredit' },
  { name: 'credit_statement_export', category: 'finance', label: 'Export výpisu kreditu' },
  { name: 'unpaid_training_pay', category: 'finance', label: 'Uhrazení nezaplaceného tréninku' },
  { name: 'product_stock_receive', category: 'finance', label: 'Příjem zboží na sklad' },
  { name: 'package_create', category: 'finance', label: 'Vytvoření balíčku tréninků' },
  { name: 'package_assign', category: 'finance', label: 'Přiřazení balíčku klientovi' },
  { name: 'income_chart_view', category: 'finance', label: 'Zobrazení grafu příjmů' },
  
  // ==============================
  // MEDIA
  // ==============================
  { name: 'photo_upload', category: 'media', label: 'Nahrání fotky' },
  { name: 'photo_compare', category: 'media', label: 'Porovnání fotek' },
  { name: 'voice_record', category: 'media', label: 'Hlasová poznámka' },
  { name: 'video_upload', category: 'media', label: 'Nahrání videa' },
  { name: 'media_delete', category: 'media', label: 'Smazání média' },
  { name: 'media_gallery_view', category: 'media', label: 'Zobrazení galerie' },
  
  // ==============================
  // SEARCH & UI
  // ==============================
  { name: 'search_open', category: 'search', label: 'Vyhledávání' },
  { name: 'search_open_keyboard', category: 'search', label: 'Vyhledávání (klávesnice)' },
  { name: 'search_result_select', category: 'search', label: 'Výběr výsledku vyhledávání' },
  { name: 'quick_action_menu', category: 'search', label: 'Rychlé akce (FAB)' },
  { name: 'context_menu_client', category: 'search', label: 'Kontextové menu klienta' },
  { name: 'context_menu_training', category: 'search', label: 'Kontextové menu tréninku' },
  { name: 'fab_open', category: 'navigation', label: 'FAB otevření' },
  { name: 'fab_action_training', category: 'navigation', label: 'FAB - nový trénink' },
  { name: 'fab_action_client', category: 'navigation', label: 'FAB - nový klient' },
  { name: 'fab_action_credit', category: 'navigation', label: 'FAB - přidat kredit' },
  { name: 'fab_action_sale', category: 'navigation', label: 'FAB - nový prodej' },
  
  // ==============================
  // AI
  // ==============================
  { name: 'ai_chat', category: 'ai', label: 'AI Chat' },
  { name: 'ai_chat_message', category: 'ai', label: 'AI Chat zpráva' },
  { name: 'ai_operator', category: 'ai', label: 'AI Operátor' },
  { name: 'ai_nutrition_analysis', category: 'ai', label: 'AI analýza stravy' },
  { name: 'ai_plan_generate', category: 'ai', label: 'AI generování plánu' },
  { name: 'ai_diagnostic_analysis', category: 'ai', label: 'AI analýza diagnostiky' },
  
  // ==============================
  // FEEDBACK
  // ==============================
  { name: 'feedback_link_copy', category: 'feedback', label: 'Kopírování odkazu na feedback' },
  { name: 'feedback_link_generate', category: 'feedback', label: 'Generování odkazu na feedback' },
  { name: 'feedback_message_create', category: 'feedback', label: 'Vytvoření zprávy pro feedback' },
  { name: 'feedback_submit', category: 'feedback', label: 'Vyplnění feedbacku' },
  { name: 'feedback_view', category: 'feedback', label: 'Zobrazení feedbacku' },
  { name: 'feedback_test_email', category: 'feedback', label: 'Test email feedbacku' },
  { name: 'feedback_reminder_send', category: 'feedback', label: 'Odeslání připomínky feedbacku' },
  
  // ==============================
  // NUTRITION
  // ==============================
  { name: 'nutrition_session_create', category: 'nutrition', label: 'Nová nutriční session' },
  { name: 'nutrition_food_add', category: 'nutrition', label: 'Přidání jídla' },
  { name: 'nutrition_drink_add', category: 'nutrition', label: 'Přidání pití' },
  { name: 'nutrition_coffee_add', category: 'nutrition', label: 'Přidání kávy' },
  { name: 'nutrition_link_copy', category: 'nutrition', label: 'Kopírování odkazu na stravu' },
  { name: 'nutrition_qr_generate', category: 'nutrition', label: 'Generování QR kódu stravy' },
  { name: 'nutrition_export', category: 'nutrition', label: 'Export stravy' },
  { name: 'nutrition_analysis_view', category: 'nutrition', label: 'Zobrazení analýzy stravy' },
  { name: 'nutrition_campaign_create', category: 'nutrition', label: 'Vytvoření nutriční kampaně' },
  { name: 'nutrition_campaign_start', category: 'nutrition', label: 'Spuštění nutriční kampaně' },
  { name: 'nutrition_campaign_end', category: 'nutrition', label: 'Ukončení nutriční kampaně' },
  
  // ==============================
  // CHALLENGES (Výzvy)
  // ==============================
  { name: 'challenge_create', category: 'challenges', label: 'Vytvoření výzvy' },
  { name: 'challenge_update', category: 'challenges', label: 'Úprava výzvy' },
  { name: 'challenge_delete', category: 'challenges', label: 'Smazání výzvy' },
  { name: 'challenge_publish', category: 'challenges', label: 'Publikování výzvy' },
  { name: 'challenge_close', category: 'challenges', label: 'Ukončení výzvy' },
  { name: 'challenge_view_leaderboard', category: 'challenges', label: 'Zobrazení žebříčku výzvy' },
  { name: 'challenge_submission_approve', category: 'challenges', label: 'Schválení výsledku výzvy' },
  { name: 'challenge_submission_reject', category: 'challenges', label: 'Zamítnutí výsledku výzvy' },
  { name: 'challenge_winner_announce', category: 'challenges', label: 'Vyhlášení vítěze výzvy' },
  
  // ==============================
  // EXERCISES (Cviky)
  // ==============================
  { name: 'exercise_create', category: 'exercises', label: 'Vytvoření cviku' },
  { name: 'exercise_update', category: 'exercises', label: 'Úprava cviku' },
  { name: 'exercise_delete', category: 'exercises', label: 'Smazání cviku' },
  { name: 'exercise_video_add', category: 'exercises', label: 'Přidání videa ke cviku' },
  { name: 'exercise_search', category: 'exercises', label: 'Vyhledávání cviku' },
  { name: 'exercise_filter', category: 'exercises', label: 'Filtrování cviků' },
  
  // ==============================
  // PROGRESS & PR
  // ==============================
  { name: 'progress_entry_create', category: 'progress', label: 'Nový záznam progrese' },
  { name: 'progress_entry_update', category: 'progress', label: 'Úprava záznamu progrese' },
  { name: 'progress_entry_delete', category: 'progress', label: 'Smazání záznamu progrese' },
  { name: 'pr_view', category: 'progress', label: 'Zobrazení PR' },
  { name: 'pr_history_export', category: 'export', label: 'Export historie PR' },
  { name: 'pr_new_achieved', category: 'progress', label: 'Nové PR dosaženo' },
  { name: 'progress_chart_view', category: 'progress', label: 'Zobrazení grafu progrese' },
  
  // ==============================
  // SETTINGS
  // ==============================
  { name: 'settings_prices', category: 'settings', label: 'Nastavení cen' },
  { name: 'settings_products', category: 'settings', label: 'Správa produktů' },
  { name: 'settings_exercises', category: 'settings', label: 'Správa cviků' },
  { name: 'settings_tags', category: 'settings', label: 'Správa tagů' },
  { name: 'settings_company', category: 'settings', label: 'Firemní profil' },
  { name: 'settings_capacity', category: 'settings', label: 'Nastavení kapacity' },
  { name: 'settings_feedback', category: 'settings', label: 'Nastavení feedbacku' },
  { name: 'settings_quick_actions', category: 'settings', label: 'Nastavení rychlých akcí' },
  { name: 'settings_nutrition', category: 'settings', label: 'Nastavení stravy' },
  { name: 'settings_modules', category: 'settings', label: 'Nastavení modulů' },
  { name: 'settings_theme', category: 'settings', label: 'Nastavení vzhledu' },
  { name: 'settings_badges', category: 'settings', label: 'Nastavení odznaků' },
  { name: 'settings_gamification', category: 'settings', label: 'Nastavení gamifikace' },
  { name: 'settings_client_portal', category: 'settings', label: 'Nastavení klientského portálu' },
  { name: 'settings_calendar_share', category: 'settings', label: 'Sdílení kalendáře' },
  { name: 'settings_data_export', category: 'settings', label: 'Export dat' },
  
  // ==============================
  // REMINDERS
  // ==============================
  { name: 'reminder_create', category: 'reminders', label: 'Vytvoření připomínky' },
  { name: 'reminder_complete', category: 'reminders', label: 'Dokončení připomínky' },
  { name: 'reminder_delete', category: 'reminders', label: 'Smazání připomínky' },
  { name: 'reminder_update', category: 'reminders', label: 'Úprava připomínky' },
  { name: 'reminder_snooze', category: 'reminders', label: 'Odložení připomínky' },
  
  // ==============================
  // EXPORT
  // ==============================
  { name: 'annual_stats_export', category: 'export', label: 'Export ročních statistik' },
  { name: 'dashboard_kpi_detail', category: 'navigation', label: 'Detail KPI na dashboardu' },
  { name: 'analytics_export', category: 'export', label: 'Analytický export' },
  { name: 'export_transactions_csv', category: 'export', label: 'Export transakcí (CSV)' },
  { name: 'export_transactions_pdf', category: 'export', label: 'Export transakcí (PDF)' },
  { name: 'export_financial_summary_csv', category: 'export', label: 'Export finančního přehledu (CSV)' },
  { name: 'export_financial_summary_pdf', category: 'export', label: 'Export finančního přehledu (PDF)' },
  { name: 'export_measurements_pdf', category: 'export', label: 'Export měření (PDF)' },
  { name: 'export_progress_csv', category: 'export', label: 'Export progrese (CSV)' },
  { name: 'export_progress_pdf', category: 'export', label: 'Export progrese (PDF)' },
  { name: 'data_export_full', category: 'export', label: 'Kompletní export dat' },
  
  // ==============================
  // BADGES & GAMIFICATION
  // ==============================
  { name: 'badge_definition_create', category: 'gamification', label: 'Vytvoření odznaku' },
  { name: 'badge_definition_update', category: 'gamification', label: 'Úprava odznaku' },
  { name: 'badge_definition_delete', category: 'gamification', label: 'Smazání odznaku' },
  { name: 'badge_award_manual', category: 'gamification', label: 'Ruční udělení odznaku' },
  { name: 'xp_settings_update', category: 'gamification', label: 'Úprava XP nastavení' },
  { name: 'leaderboard_view', category: 'gamification', label: 'Zobrazení žebříčku' },
  
  // ==============================
  // CLIENT PORTAL - Page Views
  // ==============================
  { name: 'page_view_client_portal_overview', category: 'client-portal', label: 'Portál - Přehled' },
  { name: 'page_view_client_portal_progress', category: 'client-portal', label: 'Portál - Progres' },
  { name: 'page_view_client_portal_attendance', category: 'client-portal', label: 'Portál - Docházka' },
  { name: 'page_view_client_portal_credit', category: 'client-portal', label: 'Portál - Kredit' },
  { name: 'page_view_client_portal_nutrition', category: 'client-portal', label: 'Portál - Strava' },
  { name: 'page_view_client_portal_settings', category: 'client-portal', label: 'Portál - Nastavení' },
  { name: 'page_view_client_portal_challenges', category: 'client-portal', label: 'Portál - Výzvy' },
  { name: 'page_view_client_portal_leaderboard', category: 'client-portal', label: 'Portál - Žebříček' },
  { name: 'page_view_client_portal_badges', category: 'client-portal', label: 'Portál - Odznaky' },
  { name: 'page_view_client_portal_workout_diary', category: 'client-portal', label: 'Portál - Deník tréninků' },
  { name: 'page_view_client_portal_measurements', category: 'client-portal', label: 'Portál - Měření' },
  { name: 'page_view_client_portal_plans', category: 'client-portal', label: 'Portál - Tréninkové plány' },
  
  // ==============================
  // CLIENT PORTAL - Actions
  // ==============================
  { name: 'client_portal_login', category: 'client-portal', label: 'Portál - Přihlášení' },
  { name: 'client_portal_logout', category: 'client-portal', label: 'Portál - Odhlášení' },
  { name: 'client_portal_overview_viewed', category: 'client-portal', label: 'Portál - Zobrazení přehledu' },
  { name: 'client_portal_progress_viewed', category: 'client-portal', label: 'Portál - Zobrazení progresu' },
  { name: 'client_portal_attendance_viewed', category: 'client-portal', label: 'Portál - Zobrazení docházky' },
  { name: 'client_portal_credit_viewed', category: 'client-portal', label: 'Portál - Zobrazení kreditu' },
  { name: 'client_portal_nutrition_viewed', category: 'client-portal', label: 'Portál - Zobrazení stravy' },
  { name: 'client_portal_challenges_viewed', category: 'client-portal', label: 'Portál - Zobrazení výzev' },
  { name: 'client_portal_leaderboard_viewed', category: 'client-portal', label: 'Portál - Zobrazení žebříčku' },
  { name: 'client_portal_badges_viewed', category: 'client-portal', label: 'Portál - Zobrazení odznaků' },
  { name: 'client_portal_workout_diary_viewed', category: 'client-portal', label: 'Portál - Zobrazení deníku' },
  
  // ==============================
  // CLIENT PORTAL - Nutrition Actions
  // ==============================
  { name: 'portal_nutrition_add_food', category: 'client-portal', label: 'Portál - Přidání jídla' },
  { name: 'portal_nutrition_add_water', category: 'client-portal', label: 'Portál - Přidání vody' },
  { name: 'portal_nutrition_edit_entry', category: 'client-portal', label: 'Portál - Úprava záznamu stravy' },
  { name: 'portal_nutrition_delete_entry', category: 'client-portal', label: 'Portál - Smazání záznamu stravy' },
  { name: 'portal_nutrition_photo_upload', category: 'client-portal', label: 'Portál - Nahrání foto jídla' },
  
  // ==============================
  // CLIENT PORTAL - Challenge Actions
  // ==============================
  { name: 'portal_challenge_join', category: 'client-portal', label: 'Portál - Přihlášení do výzvy' },
  { name: 'portal_challenge_submit', category: 'client-portal', label: 'Portál - Odeslání výsledku výzvy' },
  { name: 'portal_challenge_view_detail', category: 'client-portal', label: 'Portál - Detail výzvy' },
  { name: 'portal_challenge_video_upload', category: 'client-portal', label: 'Portál - Nahrání videa výzvy' },
  
  // ==============================
  // CLIENT PORTAL - Workout Diary Actions
  // ==============================
  { name: 'portal_workout_log_create', category: 'client-portal', label: 'Portál - Vytvoření záznamu tréninku' },
  { name: 'portal_workout_log_edit', category: 'client-portal', label: 'Portál - Úprava záznamu tréninku' },
  { name: 'portal_workout_log_delete', category: 'client-portal', label: 'Portál - Smazání záznamu tréninku' },
  { name: 'portal_workout_confirm', category: 'client-portal', label: 'Portál - Potvrzení tréninku' },
  { name: 'portal_workout_exercise_add', category: 'client-portal', label: 'Portál - Přidání cviku' },
  { name: 'portal_workout_from_template', category: 'client-portal', label: 'Portál - Trénink ze šablony' },
  
  // ==============================
  // CLIENT PORTAL - Progress Actions
  // ==============================
  { name: 'portal_progress_add_measurement', category: 'client-portal', label: 'Portál - Přidání měření' },
  { name: 'portal_progress_view_chart', category: 'client-portal', label: 'Portál - Zobrazení grafu progresu' },
  { name: 'portal_progress_view_pr', category: 'client-portal', label: 'Portál - Zobrazení PR' },
  { name: 'portal_progress_photo_upload', category: 'client-portal', label: 'Portál - Nahrání foto progrese' },
  
  // ==============================
  // CLIENT PORTAL - Feedback Actions
  // ==============================
  { name: 'portal_feedback_submit', category: 'client-portal', label: 'Portál - Odeslání feedbacku' },
  { name: 'portal_feedback_skip', category: 'client-portal', label: 'Portál - Přeskočení feedbacku' },
  { name: 'portal_feedback_view_history', category: 'client-portal', label: 'Portál - Historie feedbacků' },
  
  // ==============================
  // CLIENT PORTAL - Settings Actions
  // ==============================
  { name: 'portal_settings_change_password', category: 'client-portal', label: 'Portál - Změna hesla' },
  { name: 'portal_settings_update_profile', category: 'client-portal', label: 'Portál - Aktualizace profilu' },
  { name: 'portal_settings_toggle_leaderboard', category: 'client-portal', label: 'Portál - Nastavení žebříčku' },
  { name: 'portal_settings_toggle_notifications', category: 'client-portal', label: 'Portál - Nastavení notifikací' },
  { name: 'portal_settings_unit_change', category: 'client-portal', label: 'Portál - Změna jednotek' },
  
  // ==============================
  // CLIENT PORTAL - Gamification
  // ==============================
  { name: 'portal_badge_earned', category: 'client-portal', label: 'Portál - Získání odznaku' },
  { name: 'portal_badge_viewed', category: 'client-portal', label: 'Portál - Zobrazení odznaku' },
  { name: 'portal_xp_earned', category: 'client-portal', label: 'Portál - Získání XP' },
  { name: 'portal_level_up', category: 'client-portal', label: 'Portál - Level up' },
  { name: 'portal_streak_achieved', category: 'client-portal', label: 'Portál - Streak dosažen' },
  { name: 'portal_achievement_unlocked', category: 'client-portal', label: 'Portál - Odemčení achievementu' },
  
  // ==============================
  // PRE-DIAGNOSTIC
  // ==============================
  { name: 'prediagnostic_form_open', category: 'pre-diagnostic', label: 'Pre-diagnostika - Otevření' },
  { name: 'prediagnostic_form_submit', category: 'pre-diagnostic', label: 'Pre-diagnostika - Odeslání' },
  { name: 'prediagnostic_form_submit_error', category: 'pre-diagnostic', label: 'Pre-diagnostika - Chyba odeslání' },
  { name: 'prediagnostic_link_create', category: 'pre-diagnostic', label: 'Pre-diagnostika - Vytvoření odkazu' },
  { name: 'prediagnostic_link_copy', category: 'pre-diagnostic', label: 'Pre-diagnostika - Kopírování odkazu' },
  { name: 'prediagnostic_assign_to_client', category: 'pre-diagnostic', label: 'Pre-diagnostika - Přiřazení ke klientovi' },
  
  // ==============================
  // CALENDAR IMPORT
  // ==============================
  { name: 'calendar_import_feed_add', category: 'calendar-import', label: 'Import kalendáře - Přidání feedu' },
  { name: 'calendar_import_feed_sync', category: 'calendar-import', label: 'Import kalendáře - Synchronizace' },
  { name: 'calendar_import_events_approve', category: 'calendar-import', label: 'Import kalendáře - Schválení událostí' },
  { name: 'calendar_import_events_skip', category: 'calendar-import', label: 'Import kalendáře - Přeskočení událostí' },
  { name: 'calendar_import_sessions_create', category: 'calendar-import', label: 'Import kalendáře - Vytvoření tréninků' },
  { name: 'calendar_import_client_assign', category: 'calendar-import', label: 'Import kalendáře - Přiřazení klienta' },
  
  // ==============================
  // SYSTEM
  // ==============================
  { name: 'app_install_prompt', category: 'system', label: 'Výzva k instalaci PWA' },
  { name: 'app_installed', category: 'system', label: 'Aplikace nainstalována' },
  { name: 'notification_permission_granted', category: 'system', label: 'Povolení notifikací' },
  { name: 'offline_mode_activated', category: 'system', label: 'Offline režim aktivován' },
  { name: 'error_boundary_triggered', category: 'system', label: 'Error boundary spuštěn' },
  
  // ==============================
  // PERFORMANCE
  // ==============================
  { name: 'performance_page_load', category: 'performance', label: 'Načtení stránky' },
  { name: 'performance_api_latency', category: 'performance', label: 'Latence API' },
  { name: 'performance_slow_render', category: 'performance', label: 'Pomalé vykreslení' },
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
  reminders: 'Připomínky',
  system: 'Systém',
  challenges: 'Výzvy',
  exercises: 'Cviky',
  gamification: 'Gamifikace',
  'client-portal': 'Klientská zóna',
  'pre-diagnostic': 'Pre-diagnostika',
  'calendar-import': 'Import z kalendáře',
  performance: 'Výkon',
  errors: 'Chyby',
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
  const { user } = useAuth();

  // Top features query - filtered by user_id
  const { data: topFeatures, isLoading: loadingTop } = useQuery({
    queryKey: ['feature-stats-top', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('feature_usage')
        .select('feature_name, feature_category')
        .eq('user_id', user.id);
      
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
    },
    enabled: !!user?.id,
  });

  // Category breakdown query - filtered by user_id
  const { data: categoryBreakdown, isLoading: loadingCategories } = useQuery({
    queryKey: ['feature-stats-categories', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('feature_usage')
        .select('feature_category')
        .eq('user_id', user.id);
      
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
    },
    enabled: !!user?.id,
  });

  // Trend data query - filtered by user_id
  const { data: trendData, isLoading: loadingTrend } = useQuery({
    queryKey: ['feature-stats-trend', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const start = startOfDay(subDays(new Date(), days));

      const { data, error } = await supabase
        .from('feature_usage')
        .select('created_at')
        .eq('user_id', user.id)
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
    },
    enabled: !!user?.id,
  });

  // Session statistics - filtered by user_id
  const { data: sessionStats, isLoading: loadingSessions } = useQuery({
    queryKey: ['session-stats', period, user?.id],
    queryFn: async (): Promise<SessionStats> => {
      if (!user?.id) return { totalSessions: 0, avgDuration: 0, deviceBreakdown: [], browserBreakdown: [], osBreakdown: [] };
      
      let query = supabase
        .from('user_sessions')
        .select('duration_seconds, device_type, browser, os')
        .eq('user_id', user.id);
      
      if (startDate) {
        query = query.gte('started_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const sessions = data || [];
      const totalSessions = sessions.length;
      
      const validDurations = sessions.filter(s => s.duration_seconds != null);
      const avgDuration = validDurations.length > 0
        ? Math.round(validDurations.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / validDurations.length)
        : 0;

      // Device breakdown
      const deviceCounts = new Map<string, number>();
      const browserCounts = new Map<string, number>();
      const osCounts = new Map<string, number>();

      for (const session of sessions) {
        if (session.device_type) {
          deviceCounts.set(session.device_type, (deviceCounts.get(session.device_type) || 0) + 1);
        }
        if (session.browser) {
          browserCounts.set(session.browser, (browserCounts.get(session.browser) || 0) + 1);
        }
        if (session.os) {
          osCounts.set(session.os, (osCounts.get(session.os) || 0) + 1);
        }
      }

      return {
        totalSessions,
        avgDuration,
        deviceBreakdown: Array.from(deviceCounts.entries()).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
        browserBreakdown: Array.from(browserCounts.entries()).map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count),
        osBreakdown: Array.from(osCounts.entries()).map(([os, count]) => ({ os, count })).sort((a, b) => b.count - a.count),
      };
    },
    enabled: !!user?.id,
  });

  // Daily Active Users
  const { data: dauData, isLoading: loadingDAU } = useQuery({
    queryKey: ['dau-stats', period],
    queryFn: async (): Promise<DailyActiveUsers[]> => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const start = startOfDay(subDays(new Date(), days));

      const { data, error } = await supabase
        .from('user_sessions')
        .select('user_id, started_at')
        .gte('started_at', start.toISOString());

      if (error) throw error;

      // Group by day, count unique users
      const dailyUsers = new Map<string, Set<string>>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyUsers.set(date, new Set());
      }

      for (const row of data || []) {
        const date = format(new Date(row.started_at), 'yyyy-MM-dd');
        if (dailyUsers.has(date)) {
          dailyUsers.get(date)!.add(row.user_id);
        }
      }

      const result: DailyActiveUsers[] = [];
      dailyUsers.forEach((users, date) => {
        result.push({ date, users: users.size });
      });

      return result;
    }
  });

  // Success rate - filtered by user_id
  const { data: successRate, isLoading: loadingSuccess } = useQuery({
    queryKey: ['success-rate', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return 100;
      
      let query = supabase
        .from('feature_usage')
        .select('success')
        .eq('user_id', user.id);
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data?.length || 0;
      const successful = data?.filter(r => r.success !== false).length || 0;
      
      return total > 0 ? Math.round((successful / total) * 100) : 100;
    },
    enabled: !!user?.id,
  });

  // Get globally available features (features that have been tracked at least once by anyone)
  const { data: globallyTrackedFeatures } = useQuery({
    queryKey: ['globally-tracked-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_usage')
        .select('feature_name')
        .limit(2000);
      
      if (error) throw error;
      
      // Get unique feature names that exist in DB
      const uniqueNames = new Set((data || []).map(d => d.feature_name));
      return Array.from(uniqueNames);
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Unused features - only show features that:
  // 1. Are in ALL_FEATURES list
  // 2. Have been tracked globally (someone used them, so tracking is implemented)
  // 3. But this user hasn't used them
  const unusedFeatures = ALL_FEATURES.filter(f => {
    const isTrackedGlobally = globallyTrackedFeatures?.includes(f.name) ?? false;
    const isUsedByThisUser = topFeatures?.some(tf => tf.feature_name === f.name) ?? false;
    
    // Only show as unused if it's tracked globally but not used by this user
    return isTrackedGlobally && !isUsedByThisUser;
  });

  // Total usage count
  const totalUsage = topFeatures?.reduce((sum, f) => sum + f.count, 0) || 0;

  return {
    topFeatures: topFeatures || [],
    categoryBreakdown: categoryBreakdown || [],
    trendData: trendData || [],
    unusedFeatures,
    totalUsage,
    sessionStats: sessionStats || { totalSessions: 0, avgDuration: 0, deviceBreakdown: [], browserBreakdown: [], osBreakdown: [] },
    dauData: dauData || [],
    successRate: successRate || 100,
    isLoading: loadingTop || loadingCategories || loadingTrend || loadingSessions || loadingDAU || loadingSuccess
  };
}

export function useClearFeatureStats() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async () => {
    if (!user?.id) return;

    // Clear app usage events
    const { error: featureError } = await supabase
      .from('feature_usage')
      .delete()
      .eq('user_id', user.id);
    if (featureError) throw featureError;

    // Clear client portal activity for this trainer's clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id);
    if (clientsError) throw clientsError;

    const clientIds = (clients || []).map((c) => c.id);
    if (clientIds.length > 0) {
      const { error: portalError } = await supabase
        .from('client_portal_activity')
        .delete()
        .in('client_id', clientIds);
      if (portalError) throw portalError;
    }

    // Clear form analytics
    const { error: formError } = await supabase
      .from('form_field_analytics')
      .delete()
      .eq('user_id', user.id);
    if (formError) throw formError;

    // Clear advanced analytics tables
    const advancedTables = [
      'interaction_events',
      'feature_sessions',
      'user_journeys',
      'scroll_analytics',
      'rage_clicks',
      'performance_metrics',
    ];
    
    for (const table of advancedTables) {
      await (supabase.from(table as any) as any).delete().eq('user_id', user.id);
    }

    // Refresh UI
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-top'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-categories'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-trend'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-session'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-dau'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-stats-success'] });
    await queryClient.invalidateQueries({ queryKey: ['client-portal-analytics-detailed'] });
    await queryClient.invalidateQueries({ queryKey: ['inactive-portal-clients'] });
    await queryClient.invalidateQueries({ queryKey: ['form-analytics-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['globally-tracked-features'] });
    await queryClient.invalidateQueries({ queryKey: ['click-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['rage-click-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['scroll-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['feature-time-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['journey-analytics'] });
    await queryClient.invalidateQueries({ queryKey: ['performance-analytics'] });
  };
}
