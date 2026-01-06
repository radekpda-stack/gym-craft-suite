import { useState, useMemo } from 'react';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Loader2, 
  Shield,
  CheckCircle2,
  Users,
  Activity,
  MousePointer,
  Timer,
  AlertTriangle,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { format, subDays, subMonths } from 'date-fns';

type PeriodOption = '30d' | '90d' | '1y' | 'custom';

interface ExportProgress {
  step: string;
  current: number;
  total: number;
}

interface ExportOptions {
  includeTrainerData: boolean;
  includeClientPortalData: boolean;
  includeInteractionEvents: boolean;
  includePerformanceMetrics: boolean;
  includeErrors: boolean;
  includeFormAnalytics: boolean;
  includeJourneys: boolean;
  includeGamification: boolean;
}

// Simple hash function for anonymization
function hashId(id: string, prefix = 'user'): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${prefix}_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

export function AdminAnalyticsExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [period, setPeriod] = useState<PeriodOption>('90d');
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  
  const [options, setOptions] = useState<ExportOptions>({
    includeTrainerData: true,
    includeClientPortalData: true,
    includeInteractionEvents: true,
    includePerformanceMetrics: true,
    includeErrors: true,
    includeFormAnalytics: true,
    includeJourneys: true,
    includeGamification: true,
  });

  const t = useMemo(() => ({
    title: language === 'cs' ? 'Kompletní analytický export' : 'Complete Analytics Export',
    description: language === 'cs' 
      ? 'Export všech anonymizovaných dat o používání aplikace pro vývoj a AI analýzu'
      : 'Export all anonymized app usage data for development and AI analysis',
    period: language === 'cs' ? 'Období' : 'Period',
    last30: language === 'cs' ? 'Posledních 30 dní' : 'Last 30 days',
    last90: language === 'cs' ? 'Posledních 90 dní' : 'Last 90 days',
    last1y: language === 'cs' ? 'Poslední rok' : 'Last year',
    custom: language === 'cs' ? 'Vlastní rozsah' : 'Custom range',
    from: language === 'cs' ? 'Od' : 'From',
    to: language === 'cs' ? 'Do' : 'To',
    export: language === 'cs' ? 'Exportovat kompletní analytiku' : 'Export complete analytics',
    exporting: language === 'cs' ? 'Exportuji...' : 'Exporting...',
    success: language === 'cs' ? 'Export dokončen' : 'Export completed',
    error: language === 'cs' ? 'Chyba při exportu' : 'Export error',
    processing: language === 'cs' ? 'Zpracovávám' : 'Processing',
    options: language === 'cs' ? 'Možnosti exportu' : 'Export options',
    trainerData: language === 'cs' ? 'Data trenérů (feature_usage, sessions)' : 'Trainer data (feature_usage, sessions)',
    clientPortal: language === 'cs' ? 'Klientský portál (aktivita, workouty)' : 'Client portal (activity, workouts)',
    interactions: language === 'cs' ? 'Interakce (kliky, scrollování)' : 'Interactions (clicks, scrolling)',
    performance: language === 'cs' ? 'Výkon (Core Web Vitals)' : 'Performance (Core Web Vitals)',
    errors: language === 'cs' ? 'Chyby a události' : 'Errors and events',
    forms: language === 'cs' ? 'Formulářová analytika' : 'Form analytics',
    journeys: language === 'cs' ? 'Uživatelské cesty' : 'User journeys',
    gamification: language === 'cs' ? 'Gamifikace (XP, odznaky)' : 'Gamification (XP, badges)',
  }), [language]);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case '1y':
        start = subDays(end, 365);
        break;
      case 'custom':
        start = new Date(customStart);
        return { start: customStart, end: customEnd };
      default:
        start = subDays(end, 90);
    }
    
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      }).map(v => `"${v}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);

    try {
      const { start, end } = getDateRange();
      const files: { name: string; content: string; category: string }[] = [];
      
      // Calculate total steps based on selected options
      let totalSteps = 3; // Base steps (summary, metadata, final)
      if (options.includeTrainerData) totalSteps += 2;
      if (options.includeClientPortalData) totalSteps += 3;
      if (options.includeInteractionEvents) totalSteps += 4;
      if (options.includePerformanceMetrics) totalSteps += 1;
      if (options.includeErrors) totalSteps += 2;
      if (options.includeFormAnalytics) totalSteps += 1;
      if (options.includeJourneys) totalSteps += 2;
      if (options.includeGamification) totalSteps += 2;
      
      let currentStep = 0;
      const nextStep = (name: string) => {
        currentStep++;
        setProgress({ step: `${t.processing} ${name}...`, current: currentStep, total: totalSteps });
      };

      // Track all unique users across all data sources
      const allUserIds = new Set<string>();
      const allClientIds = new Set<string>();

      // ========================================
      // SECTION 1: TRAINER DATA
      // ========================================
      if (options.includeTrainerData) {
        // 1.1 Feature Usage
        nextStep('feature_usage');
        const { data: usageData } = await supabase
          .from('feature_usage')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false });

        const anonymizedUsage = (usageData || []).map(row => {
          allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: hashId(row.user_id, 'trainer'),
            metadata: row.metadata ? JSON.parse(JSON.stringify(row.metadata).replace(/client_id|client_name/gi, 'REDACTED')) : {},
          };
        });

        files.push({
          name: '01_trainer_feature_usage.csv',
          content: convertToCSV(anonymizedUsage),
          category: 'trainer',
        });

        // 1.2 User Sessions
        nextStep('user_sessions');
        const { data: sessionData } = await supabase
          .from('user_sessions')
          .select('*')
          .gte('started_at', start)
          .lte('started_at', end)
          .order('started_at', { ascending: false });

        const anonymizedSessions = (sessionData || []).map(row => {
          allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: hashId(row.user_id, 'trainer'),
          };
        });

        files.push({
          name: '01_trainer_sessions.csv',
          content: convertToCSV(anonymizedSessions),
          category: 'trainer',
        });
      }

      // ========================================
      // SECTION 2: CLIENT PORTAL DATA
      // ========================================
      if (options.includeClientPortalData) {
        // 2.1 Portal Activity
        nextStep('client_portal_activity');
        const { data: portalActivity } = await supabase
          .from('client_portal_activity')
          .select('*')
          .gte('activity_date', start)
          .lte('activity_date', end)
          .order('created_at', { ascending: false });

        const anonymizedPortalActivity = (portalActivity || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
          };
        });

        files.push({
          name: '02_portal_activity.csv',
          content: convertToCSV(anonymizedPortalActivity),
          category: 'client_portal',
        });

        // 2.2 Client Workout Logs
        nextStep('client_workout_logs');
        const { data: workoutLogs } = await supabase
          .from('client_workout_logs')
          .select('id, client_id, trainer_id, date, status, source, duration_minutes, rpe, energy_before, energy_after, workout_type, created_at')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false });

        const anonymizedWorkoutLogs = (workoutLogs || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
            trainer_id: hashId(row.trainer_id, 'trainer'),
          };
        });

        files.push({
          name: '02_portal_workout_logs.csv',
          content: convertToCSV(anonymizedWorkoutLogs),
          category: 'client_portal',
        });

        // 2.3 Confirmed Workouts
        nextStep('client_confirmed_workouts');
        const { data: confirmedWorkouts } = await supabase
          .from('client_confirmed_workouts')
          .select('id, client_id, performed_date, workout_type, xp, confirmed_by, created_at')
          .gte('performed_date', start)
          .lte('performed_date', end)
          .order('performed_date', { ascending: false });

        const anonymizedConfirmed = (confirmedWorkouts || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
          };
        });

        files.push({
          name: '02_portal_confirmed_workouts.csv',
          content: convertToCSV(anonymizedConfirmed),
          category: 'client_portal',
        });
      }

      // ========================================
      // SECTION 3: INTERACTION EVENTS
      // ========================================
      if (options.includeInteractionEvents) {
        // 3.1 Interaction Events
        nextStep('interaction_events');
        const { data: interactionEvents } = await supabase
          .from('interaction_events')
          .select('*')
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: false })
          .limit(10000);

        const anonymizedInteractions = (interactionEvents || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '03_interaction_events.csv',
          content: convertToCSV(anonymizedInteractions),
          category: 'interactions',
        });

        // 3.2 Feature Sessions
        nextStep('feature_sessions');
        const { data: featureSessions } = await supabase
          .from('feature_sessions')
          .select('*')
          .gte('started_at', start)
          .lte('started_at', end)
          .order('started_at', { ascending: false })
          .limit(5000);

        const anonymizedFeatureSessions = (featureSessions || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '03_feature_sessions.csv',
          content: convertToCSV(anonymizedFeatureSessions),
          category: 'interactions',
        });

        // 3.3 Scroll Analytics
        nextStep('scroll_analytics');
        const { data: scrollData } = await supabase
          .from('scroll_analytics')
          .select('*')
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: false })
          .limit(5000);

        const anonymizedScroll = (scrollData || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '03_scroll_analytics.csv',
          content: convertToCSV(anonymizedScroll),
          category: 'interactions',
        });

        // 3.4 Rage Clicks
        nextStep('rage_clicks');
        const { data: rageClicks } = await supabase
          .from('rage_clicks')
          .select('*')
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: false })
          .limit(1000);

        const anonymizedRageClicks = (rageClicks || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '03_rage_clicks.csv',
          content: convertToCSV(anonymizedRageClicks),
          category: 'interactions',
        });
      }

      // ========================================
      // SECTION 4: PERFORMANCE METRICS
      // ========================================
      if (options.includePerformanceMetrics) {
        nextStep('performance_metrics');
        const { data: perfMetrics } = await supabase
          .from('performance_metrics')
          .select('*')
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: false })
          .limit(5000);

        const anonymizedPerf = (perfMetrics || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '04_performance_metrics.csv',
          content: convertToCSV(anonymizedPerf),
          category: 'performance',
        });
      }

      // ========================================
      // SECTION 5: ERRORS AND EVENTS
      // ========================================
      if (options.includeErrors) {
        // 5.1 App Errors
        nextStep('app_errors');
        const { data: appErrors } = await supabase
          .from('app_errors')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
          .limit(2000);

        const anonymizedErrors = (appErrors || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
            // Redact potentially sensitive info from stack traces
            stack: row.stack ? row.stack.substring(0, 500) : null,
          };
        });

        files.push({
          name: '05_app_errors.csv',
          content: convertToCSV(anonymizedErrors),
          category: 'errors',
        });

        // 5.2 App Events
        nextStep('app_events');
        const { data: appEvents } = await supabase
          .from('app_events')
          .select('*')
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: false })
          .limit(5000);

        const anonymizedAppEvents = (appEvents || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '05_app_events.csv',
          content: convertToCSV(anonymizedAppEvents),
          category: 'errors',
        });
      }

      // ========================================
      // SECTION 6: FORM ANALYTICS
      // ========================================
      if (options.includeFormAnalytics) {
        nextStep('form_field_analytics');
        const { data: formAnalytics } = await supabase
          .from('form_field_analytics')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
          .limit(5000);

        const anonymizedFormAnalytics = (formAnalytics || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '06_form_analytics.csv',
          content: convertToCSV(anonymizedFormAnalytics),
          category: 'forms',
        });
      }

      // ========================================
      // SECTION 7: USER JOURNEYS
      // ========================================
      if (options.includeJourneys) {
        // 7.1 User Journeys
        nextStep('user_journeys');
        const { data: journeys } = await supabase
          .from('user_journeys')
          .select('*')
          .gte('started_at', start)
          .lte('started_at', end)
          .order('started_at', { ascending: false })
          .limit(2000);

        const anonymizedJourneys = (journeys || []).map(row => {
          if (row.user_id) allUserIds.add(row.user_id);
          return {
            ...row,
            user_id: row.user_id ? hashId(row.user_id, 'user') : null,
          };
        });

        files.push({
          name: '07_user_journeys.csv',
          content: convertToCSV(anonymizedJourneys),
          category: 'journeys',
        });

        // 7.2 Client Section Usage
        nextStep('client_section_usage');
        const { data: sectionUsage } = await supabase
          .from('client_section_usage')
          .select('*')
          .gte('last_opened', start)
          .lte('last_opened', end)
          .order('last_opened', { ascending: false })
          .limit(5000);

        const anonymizedSectionUsage = (sectionUsage || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
            user_id: hashId(row.user_id, 'trainer'),
          };
        });

        files.push({
          name: '07_client_section_usage.csv',
          content: convertToCSV(anonymizedSectionUsage),
          category: 'journeys',
        });
      }

      // ========================================
      // SECTION 8: GAMIFICATION
      // ========================================
      if (options.includeGamification) {
        // 8.1 Client XP (from loyalty_ledger)
        nextStep('client_xp');
        const { data: clientXp } = await supabase
          .from('loyalty_ledger')
          .select('id, client_id, source_type, source_id, points, meta, created_at')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
          .limit(5000);

        const anonymizedXp = (clientXp || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
            source_id: row.source_id ? hashId(row.source_id, 'src') : null,
            meta: row.meta ? JSON.parse(JSON.stringify(row.meta).replace(/[A-Za-z]+\s[A-Za-z]+/g, 'REDACTED')) : null,
          };
        });

        files.push({
          name: '08_client_xp_ledger.csv',
          content: convertToCSV(anonymizedXp),
          category: 'gamification',
        });

        // 8.2 Client Badges
        nextStep('client_badges');
        const { data: clientBadges } = await supabase
          .from('client_badges')
          .select('id, client_id, badge_id, earned_at, progress_current, progress_target, created_at')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false });

        const anonymizedBadges = (clientBadges || []).map(row => {
          allClientIds.add(row.client_id);
          return {
            ...row,
            client_id: hashId(row.client_id, 'client'),
          };
        });

        files.push({
          name: '08_client_badges.csv',
          content: convertToCSV(anonymizedBadges),
          category: 'gamification',
        });
      }

      // ========================================
      // SUMMARY AND METADATA
      // ========================================
      nextStep('generating_summary');

      // Calculate comprehensive summary
      const summary = {
        export_info: {
          generated_at: new Date().toISOString(),
          period: { start, end },
          options_selected: options,
        },
        user_stats: {
          unique_trainers: allUserIds.size,
          unique_clients: allClientIds.size,
          total_unique_users: allUserIds.size + allClientIds.size,
        },
        data_breakdown: {} as Record<string, any>,
        files_included: files.map(f => ({
          name: f.name,
          category: f.category,
          rows: f.content.split('\n').length - 1, // Subtract header
        })),
      };

      // Add category-specific summaries
      const categoryFiles = files.reduce((acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push(f);
        return acc;
      }, {} as Record<string, typeof files>);

      for (const [category, catFiles] of Object.entries(categoryFiles)) {
        summary.data_breakdown[category] = {
          files: catFiles.length,
          total_rows: catFiles.reduce((sum, f) => sum + f.content.split('\n').length - 1, 0),
        };
      }

      files.push({
        name: '00_export_summary.json',
        content: JSON.stringify(summary, null, 2),
        category: 'meta',
      });

      // ========================================
      // CREATE COMBINED EXPORT FILE
      // ========================================
      nextStep('creating_export_file');

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      let combinedContent = `# Complete App Analytics Export - ${dateStr}\n`;
      combinedContent += `# Period: ${start} to ${end}\n`;
      combinedContent += `# Total files: ${files.length}\n`;
      combinedContent += `# Total trainers: ${allUserIds.size}\n`;
      combinedContent += `# Total clients: ${allClientIds.size}\n`;
      combinedContent += `# ANONYMIZED - All IDs are hashed\n\n`;
      combinedContent += `# Categories exported:\n`;
      for (const [cat, data] of Object.entries(summary.data_breakdown)) {
        combinedContent += `#   - ${cat}: ${data.files} files, ${data.total_rows} rows\n`;
      }
      combinedContent += '\n';
      
      // Sort files by name for consistent ordering
      files.sort((a, b) => a.name.localeCompare(b.name));

      for (const file of files) {
        combinedContent += `\n${'='.repeat(80)}\n`;
        combinedContent += `# FILE: ${file.name} (${file.category})\n`;
        combinedContent += `${'='.repeat(80)}\n\n`;
        combinedContent += file.content;
        combinedContent += '\n';
      }

      const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete_analytics_export_${dateStr}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: t.success,
        description: language === 'cs' 
          ? `Exportováno ${files.length} souborů, ${allUserIds.size} trenérů, ${allClientIds.size} klientů`
          : `Exported ${files.length} files, ${allUserIds.size} trainers, ${allClientIds.size} clients`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t.error,
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">{t.title}</p>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
      </div>

      {/* Period selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.period}</Label>
        <RadioGroup value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="30d" id="p30" />
              <Label htmlFor="p30" className="cursor-pointer text-sm">{t.last30}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="90d" id="p90" />
              <Label htmlFor="p90" className="cursor-pointer text-sm">{t.last90}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="1y" id="p1y" />
              <Label htmlFor="p1y" className="cursor-pointer text-sm">{t.last1y}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="custom" id="pcustom" />
              <Label htmlFor="pcustom" className="cursor-pointer text-sm">{t.custom}</Label>
            </div>
          </div>
        </RadioGroup>
        
        {period === 'custom' && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.from}</Label>
              <Input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.to}</Label>
              <Input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Export options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.options}</Label>
        <div className="grid gap-2">
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-trainer" 
              checked={options.includeTrainerData}
              onCheckedChange={() => toggleOption('includeTrainerData')}
            />
            <Label htmlFor="opt-trainer" className="flex items-center gap-2 cursor-pointer text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              {t.trainerData}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-portal" 
              checked={options.includeClientPortalData}
              onCheckedChange={() => toggleOption('includeClientPortalData')}
            />
            <Label htmlFor="opt-portal" className="flex items-center gap-2 cursor-pointer text-sm">
              <Activity className="w-4 h-4 text-muted-foreground" />
              {t.clientPortal}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-interactions" 
              checked={options.includeInteractionEvents}
              onCheckedChange={() => toggleOption('includeInteractionEvents')}
            />
            <Label htmlFor="opt-interactions" className="flex items-center gap-2 cursor-pointer text-sm">
              <MousePointer className="w-4 h-4 text-muted-foreground" />
              {t.interactions}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-performance" 
              checked={options.includePerformanceMetrics}
              onCheckedChange={() => toggleOption('includePerformanceMetrics')}
            />
            <Label htmlFor="opt-performance" className="flex items-center gap-2 cursor-pointer text-sm">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              {t.performance}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-errors" 
              checked={options.includeErrors}
              onCheckedChange={() => toggleOption('includeErrors')}
            />
            <Label htmlFor="opt-errors" className="flex items-center gap-2 cursor-pointer text-sm">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              {t.errors}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-forms" 
              checked={options.includeFormAnalytics}
              onCheckedChange={() => toggleOption('includeFormAnalytics')}
            />
            <Label htmlFor="opt-forms" className="flex items-center gap-2 cursor-pointer text-sm">
              <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
              {t.forms}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-journeys" 
              checked={options.includeJourneys}
              onCheckedChange={() => toggleOption('includeJourneys')}
            />
            <Label htmlFor="opt-journeys" className="flex items-center gap-2 cursor-pointer text-sm">
              <Timer className="w-4 h-4 text-muted-foreground" />
              {t.journeys}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox 
              id="opt-gamification" 
              checked={options.includeGamification}
              onCheckedChange={() => toggleOption('includeGamification')}
            />
            <Label htmlFor="opt-gamification" className="flex items-center gap-2 cursor-pointer text-sm">
              <FileJson className="w-4 h-4 text-muted-foreground" />
              {t.gamification}
            </Label>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {progress && (
        <div className="p-3 rounded-lg bg-secondary/50 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="truncate">{progress.step}</span>
            <span className="ml-auto text-muted-foreground shrink-0">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Export button */}
      <Button 
        onClick={handleExport} 
        disabled={isExporting}
        className="w-full"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t.exporting}
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            {t.export}
          </>
        )}
      </Button>

      {/* Export contents info */}
      <div className="text-xs text-muted-foreground space-y-1.5 pt-2">
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {language === 'cs' ? 'Všechna ID jsou anonymizována (hash)' : 'All IDs are anonymized (hashed)'}
        </p>
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {language === 'cs' ? 'Export obsahuje data všech uživatelů' : 'Export contains data from all users'}
        </p>
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {language === 'cs' ? 'Připraveno pro AI analýzu a vývoj' : 'Ready for AI analysis and development'}
        </p>
      </div>
    </div>
  );
}
