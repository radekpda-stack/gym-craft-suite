import { useState, useMemo } from 'react';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Loader2, 
  Calendar, 
  Shield,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { format, subDays, subMonths } from 'date-fns';

type PeriodOption = '30d' | '90d' | 'custom';

interface ExportProgress {
  step: string;
  current: number;
  total: number;
}

// Simple hash function for anonymization
function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

export function AdminAnalyticsExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const t = useMemo(() => ({
    title: language === 'cs' ? 'Analytický export' : 'Analytics Export',
    description: language === 'cs' 
      ? 'Export anonymizovaných dat o používání aplikace pro AI analýzu'
      : 'Export anonymized app usage data for AI analysis',
    period: language === 'cs' ? 'Období' : 'Period',
    last30: language === 'cs' ? 'Posledních 30 dní' : 'Last 30 days',
    last90: language === 'cs' ? 'Posledních 90 dní' : 'Last 90 days',
    custom: language === 'cs' ? 'Vlastní rozsah' : 'Custom range',
    from: language === 'cs' ? 'Od' : 'From',
    to: language === 'cs' ? 'Do' : 'To',
    export: language === 'cs' ? 'Exportovat analytiku' : 'Export analytics',
    exporting: language === 'cs' ? 'Exportuji...' : 'Exporting...',
    success: language === 'cs' ? 'Export dokončen' : 'Export completed',
    error: language === 'cs' ? 'Chyba při exportu' : 'Export error',
    processing: language === 'cs' ? 'Zpracovávám' : 'Processing',
    noClientData: language === 'cs' 
      ? 'Export neobsahuje žádná klientská data'
      : 'Export contains no client data',
    anonymized: language === 'cs'
      ? 'User ID jsou anonymizovány (hash)'
      : 'User IDs are anonymized (hashed)',
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
      case 'custom':
        start = new Date(customStart);
        return { start: customStart, end: customEnd };
      default:
        start = subDays(end, 30);
    }
    
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const files: { name: string; content: string }[] = [];
      const totalSteps = 9; // Increased for client portal data

      // 1. Fetch feature_usage data
      setProgress({ step: `${t.processing} feature_usage...`, current: 1, total: totalSteps });
      
      const { data: usageData, error: usageError } = await supabase
        .from('feature_usage')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (usageError) throw usageError;

      // Anonymize user_ids
      const anonymizedUsage = (usageData || []).map(row => ({
        ...row,
        user_id: hashUserId(row.user_id),
        // Remove any potential client references from metadata
        metadata: row.metadata ? JSON.parse(JSON.stringify(row.metadata).replace(/client_id|client_name/gi, 'REDACTED')) : {},
      }));

      files.push({
        name: 'app_usage_events.csv',
        content: convertToCSV(anonymizedUsage),
      });

      // 2. Fetch session data
      setProgress({ step: `${t.processing} user_sessions...`, current: 2, total: totalSteps });
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('started_at', start)
        .lte('started_at', end)
        .order('started_at', { ascending: false });

      if (sessionError) throw sessionError;

      const anonymizedSessions = (sessionData || []).map(row => ({
        ...row,
        user_id: hashUserId(row.user_id),
      }));

      files.push({
        name: 'user_sessions.csv',
        content: convertToCSV(anonymizedSessions),
      });

      // 3. Create usage summary with session stats
      setProgress({ step: `${t.processing} usage_summary...`, current: 3, total: totalSteps });
      
      const uniqueUsers = new Set(usageData?.map(r => r.user_id) || []);
      const categoryCount: Record<string, number> = {};
      const featureCount: Record<string, number> = {};
      const dailyUsage: Record<string, number> = {};
      
      (usageData || []).forEach(row => {
        categoryCount[row.feature_category] = (categoryCount[row.feature_category] || 0) + 1;
        featureCount[row.feature_name] = (featureCount[row.feature_name] || 0) + 1;
        const day = row.created_at.substring(0, 10);
        dailyUsage[day] = (dailyUsage[day] || 0) + 1;
      });

      const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
      const sortedFeatures = Object.entries(featureCount).sort((a, b) => b[1] - a[1]);
      const days = Object.keys(dailyUsage).length || 1;

      // Calculate session stats
      const validSessions = sessionData?.filter(s => s.duration_seconds != null) || [];
      const avgSessionDuration = validSessions.length > 0
        ? Math.round(validSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / validSessions.length)
        : 0;
      
      const deviceBreakdown: Record<string, number> = {};
      const browserBreakdown: Record<string, number> = {};
      sessionData?.forEach(s => {
        if (s.device_type) deviceBreakdown[s.device_type] = (deviceBreakdown[s.device_type] || 0) + 1;
        if (s.browser) browserBreakdown[s.browser] = (browserBreakdown[s.browser] || 0) + 1;
      });

      // Calculate DAU (Daily Active Users)
      const dauMap: Record<string, Set<string>> = {};
      sessionData?.forEach(s => {
        const day = s.started_at.substring(0, 10);
        if (!dauMap[day]) dauMap[day] = new Set();
        dauMap[day].add(s.user_id);
      });
      const dauData = Object.entries(dauMap).map(([date, users]) => ({ date, unique_users: users.size }));

      // Calculate success rate
      const totalEvents = usageData?.length || 0;
      const successfulEvents = usageData?.filter(r => r.success !== false).length || 0;
      const successRate = totalEvents > 0 ? Math.round((successfulEvents / totalEvents) * 100) : 100;

      const usageSummary = {
        active_trainers: uniqueUsers.size,
        total_events: usageData?.length || 0,
        average_daily_events: Math.round((usageData?.length || 0) / days),
        most_used_sections: sortedCategories.slice(0, 5).map(([name, count]) => ({ name, count })),
        least_used_sections: sortedCategories.slice(-5).reverse().map(([name, count]) => ({ name, count })),
        top_features: sortedFeatures.slice(0, 10).map(([name, count]) => ({ name, count })),
        date_range: { start, end },
        // Session stats
        session_stats: {
          total_sessions: sessionData?.length || 0,
          avg_duration_seconds: avgSessionDuration,
          device_breakdown: Object.entries(deviceBreakdown).map(([device, count]) => ({ device, count })),
          browser_breakdown: Object.entries(browserBreakdown).map(([browser, count]) => ({ browser, count })),
        },
        // DAU stats
        daily_active_users: dauData,
        avg_dau: dauData.length > 0 ? Math.round(dauData.reduce((sum, d) => sum + d.unique_users, 0) / dauData.length) : 0,
        // Success rate
        success_rate_percent: successRate,
        failed_events: totalEvents - successfulEvents,
      };

      files.push({
        name: 'usage_summary.json',
        content: JSON.stringify(usageSummary, null, 2),
      });

      // 4. Feature usage breakdown
      setProgress({ step: `${t.processing} feature_usage...`, current: 4, total: totalSteps });
      
      const featureUsageByUser: Record<string, Set<string>> = {};
      (usageData || []).forEach(row => {
        if (!featureUsageByUser[row.feature_name]) {
          featureUsageByUser[row.feature_name] = new Set();
        }
        featureUsageByUser[row.feature_name].add(row.user_id);
      });

      // Calculate trend (compare first half vs second half of period)
      const midPoint = new Date((new Date(start).getTime() + new Date(end).getTime()) / 2);
      const featureTrend: Record<string, { first: number; second: number }> = {};
      
      (usageData || []).forEach(row => {
        const date = new Date(row.created_at);
        const half = date < midPoint ? 'first' : 'second';
        if (!featureTrend[row.feature_name]) {
          featureTrend[row.feature_name] = { first: 0, second: 0 };
        }
        featureTrend[row.feature_name][half]++;
      });

      const featureUsageData = sortedFeatures.map(([name, count]) => ({
        feature_name: name,
        usage_count: count,
        unique_users: featureUsageByUser[name]?.size || 0,
        trend: featureTrend[name]?.second > featureTrend[name]?.first ? 'growing' : 
               featureTrend[name]?.second < featureTrend[name]?.first ? 'declining' : 'stable',
      }));

      files.push({
        name: 'feature_usage.csv',
        content: convertToCSV(featureUsageData),
      });

      // 5. Friction points analysis
      setProgress({ step: `${t.processing} friction_points...`, current: 5, total: totalSteps });
      
      const frictionIndicators = [
        'cancel', 'delete', 'error', 'undo', 'back', 'close', 'abandon', 'fail'
      ];

      const frictionEvents = (usageData || []).filter(row => 
        frictionIndicators.some(indicator => 
          row.feature_name.toLowerCase().includes(indicator) ||
          row.success === false
        )
      );

      const frictionByFeature: Record<string, { count: number; type: string }> = {};
      frictionEvents.forEach(row => {
        const type = row.success === false ? 'error' : 
                    row.feature_name.includes('cancel') ? 'cancellation' :
                    row.feature_name.includes('delete') ? 'deletion' : 'abandonment';
        
        if (!frictionByFeature[row.feature_name]) {
          frictionByFeature[row.feature_name] = { count: 0, type };
        }
        frictionByFeature[row.feature_name].count++;
      });

      const frictionData = Object.entries(frictionByFeature)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({
          event_name: name,
          occurrence_count: data.count,
          problem_type: data.type,
          ux_friction_estimate: data.count > 50 ? 'high' : data.count > 20 ? 'medium' : 'low',
        }));

      files.push({
        name: 'friction_points.csv',
        content: convertToCSV(frictionData),
      });

      // 6. Client Portal Activity Data
      setProgress({ step: `${t.processing} client_portal_activity...`, current: 6, total: totalSteps });
      
      const { data: portalActivityData, error: portalError } = await supabase
        .from('client_portal_activity')
        .select(`
          id,
          client_id,
          activity_type,
          activity_date,
          metadata,
          created_at
        `)
        .gte('activity_date', start)
        .lte('activity_date', end)
        .order('created_at', { ascending: false });

      if (portalError) throw portalError;

      // Anonymize client IDs
      const anonymizedPortalActivity = (portalActivityData || []).map(row => ({
        ...row,
        client_id: hashUserId(row.client_id),
        metadata: row.metadata ? JSON.parse(JSON.stringify(row.metadata)) : {},
      }));

      files.push({
        name: 'client_portal_activity.csv',
        content: convertToCSV(anonymizedPortalActivity),
      });

      // 7. Client Portal Summary
      setProgress({ step: `${t.processing} portal_summary...`, current: 7, total: totalSteps });
      
      const uniqueClients = new Set(portalActivityData?.map(r => r.client_id) || []);
      const activityTypeCount: Record<string, number> = {};
      const dailyPortalUsage: Record<string, number> = {};
      const clientActivityCount: Record<string, number> = {};
      
      (portalActivityData || []).forEach(row => {
        activityTypeCount[row.activity_type] = (activityTypeCount[row.activity_type] || 0) + 1;
        dailyPortalUsage[row.activity_date] = (dailyPortalUsage[row.activity_date] || 0) + 1;
        clientActivityCount[row.client_id] = (clientActivityCount[row.client_id] || 0) + 1;
      });

      const sortedActivityTypes = Object.entries(activityTypeCount).sort((a, b) => b[1] - a[1]);
      const portalDays = Object.keys(dailyPortalUsage).length || 1;
      
      // Calculate most active clients (anonymized)
      const sortedClients = Object.entries(clientActivityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([clientId, count]) => ({
          client_hash: hashUserId(clientId),
          activity_count: count,
        }));

      // Calculate page views vs actions
      const pageViews = (portalActivityData || []).filter(r => r.activity_type.includes('page_view')).length;
      const actions = (portalActivityData || []).filter(r => !r.activity_type.includes('page_view')).length;

      const portalSummary = {
        active_clients: uniqueClients.size,
        total_portal_events: portalActivityData?.length || 0,
        average_daily_events: Math.round((portalActivityData?.length || 0) / portalDays),
        page_views: pageViews,
        actions: actions,
        engagement_ratio: pageViews > 0 ? Math.round((actions / pageViews) * 100) / 100 : 0,
        most_used_features: sortedActivityTypes.slice(0, 15).map(([name, count]) => ({ 
          activity_type: name, 
          count,
          percentage: Math.round((count / (portalActivityData?.length || 1)) * 100)
        })),
        least_used_features: sortedActivityTypes.slice(-10).reverse().map(([name, count]) => ({ 
          activity_type: name, 
          count 
        })),
        most_active_clients: sortedClients,
        daily_usage_trend: Object.entries(dailyPortalUsage)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, count]) => ({ date, count })),
        date_range: { start, end },
      };

      files.push({
        name: 'client_portal_summary.json',
        content: JSON.stringify(portalSummary, null, 2),
      });

      // 8. Metadata
      setProgress({ step: `${t.processing} metadata...`, current: 8, total: totalSteps });
      
      const metadata = {
        app_version: '1.0.0',
        export_date: new Date().toISOString(),
        export_range: { from: start, to: end },
        total_users: uniqueUsers.size,
        total_events: usageData?.length || 0,
        anonymization: true,
        client_data_included: false,
        files_included: files.map(f => f.name),
        generated_by: 'admin_analytics_export',
      };

      files.push({
        name: 'metadata.json',
        content: JSON.stringify(metadata, null, 2),
      });

      // Create combined export file
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      let combinedContent = `# App Usage Analytics Export - ${dateStr}\n`;
      combinedContent += `# Period: ${start} to ${end}\n`;
      combinedContent += `# Total files: ${files.length}\n`;
      combinedContent += `# ANONYMIZED - No client data included\n\n`;
      
      for (const file of files) {
        combinedContent += `\n${'='.repeat(60)}\n`;
        combinedContent += `# FILE: ${file.name}\n`;
        combinedContent += `${'='.repeat(60)}\n\n`;
        combinedContent += file.content;
        combinedContent += '\n';
      }

      const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `app_usage_export_${dateStr}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: t.success,
        description: language === 'cs' 
          ? `Exportováno ${usageData?.length || 0} událostí od ${uniqueUsers.size} uživatelů`
          : `Exported ${usageData?.length || 0} events from ${uniqueUsers.size} users`,
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

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {language === 'cs' ? 'Admin-only export' : 'Admin-only export'}
          </p>
          <p className="text-muted-foreground mt-1">
            {t.description}
          </p>
        </div>
      </div>

      {/* Period selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.period}</Label>
        <RadioGroup value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="30d" id="p30" />
            <Label htmlFor="p30" className="cursor-pointer">{t.last30}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="90d" id="p90" />
            <Label htmlFor="p90" className="cursor-pointer">{t.last90}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="custom" id="pcustom" />
            <Label htmlFor="pcustom" className="cursor-pointer">{t.custom}</Label>
          </div>
        </RadioGroup>
        
        {period === 'custom' && (
          <div className="flex gap-3 mt-3 pl-6">
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

      {/* Progress indicator */}
      {progress && (
        <div className="p-3 rounded-lg bg-secondary/50 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progress.step}</span>
            <span className="ml-auto text-muted-foreground">
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
          {t.noClientData}
        </p>
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {t.anonymized}
        </p>
        <p className="flex items-center gap-1.5 mt-3">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          app_usage_events.csv, feature_usage.csv, friction_points.csv
        </p>
        <p className="flex items-center gap-1.5">
          <FileJson className="w-3.5 h-3.5" />
          usage_summary.json, metadata.json
        </p>
      </div>
    </div>
  );
}
