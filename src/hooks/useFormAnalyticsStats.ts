import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays } from 'date-fns';

export type FormStatsPeriod = '7d' | '30d' | '90d' | 'all';

interface FieldProblem {
  fieldName: string;
  avgTimeMs: number;
  validationErrors: number;
  skipRate: number; // percentage
  occurrences: number;
}

interface FormTypeStats {
  formType: string;
  totalForms: number;
  completedForms: number;
  abandonedForms: number;
  completionRate: number;
  avgTimeSeconds: number;
  avgFieldsCompleted: number;
  avgFieldsSkipped: number;
  avgValidationErrors: number;
  problemFields: FieldProblem[];
}

export interface FormAnalyticsData {
  totalForms: number;
  completedForms: number;
  abandonedForms: number;
  overallCompletionRate: number;
  avgCompletionTimeSeconds: number;
  byFormType: FormTypeStats[];
  topProblematicFields: FieldProblem[];
  byDevice: { device: string; count: number; completionRate: number }[];
  dailyTrend: { date: string; total: number; completed: number; abandoned: number }[];
}

export function useFormAnalyticsStats(period: FormStatsPeriod = '30d') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['form-analytics-stats', user?.id, period],
    queryFn: async (): Promise<FormAnalyticsData | null> => {
      if (!user?.id) return null;

      const startDate = period === 'all' 
        ? new Date('2020-01-01')
        : period === '7d'
          ? subDays(new Date(), 7)
          : period === '30d'
            ? subDays(new Date(), 30)
            : subDays(new Date(), 90);

      const { data, error } = await supabase
        .from('form_field_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching form analytics:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          totalForms: 0,
          completedForms: 0,
          abandonedForms: 0,
          overallCompletionRate: 0,
          avgCompletionTimeSeconds: 0,
          byFormType: [],
          topProblematicFields: [],
          byDevice: [],
          dailyTrend: [],
        };
      }

      // Calculate totals
      const totalForms = data.length;
      const completedForms = data.filter(f => f.form_completed_at).length;
      const abandonedForms = data.filter(f => f.form_abandoned_at && !f.form_completed_at).length;
      const overallCompletionRate = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

      // Average completion time (only for completed forms)
      const completedData = data.filter(f => f.form_completed_at && f.total_time_seconds);
      const avgCompletionTimeSeconds = completedData.length > 0
        ? Math.round(completedData.reduce((sum, f) => sum + (f.total_time_seconds || 0), 0) / completedData.length)
        : 0;

      // Group by form type
      const formTypeGroups: Record<string, typeof data> = {};
      data.forEach(form => {
        if (!formTypeGroups[form.form_type]) {
          formTypeGroups[form.form_type] = [];
        }
        formTypeGroups[form.form_type].push(form);
      });

      // Calculate stats by form type
      const byFormType: FormTypeStats[] = Object.entries(formTypeGroups).map(([formType, forms]) => {
        const total = forms.length;
        const completed = forms.filter(f => f.form_completed_at).length;
        const abandoned = forms.filter(f => f.form_abandoned_at && !f.form_completed_at).length;
        const completedForms = forms.filter(f => f.form_completed_at && f.total_time_seconds);
        const avgTime = completedForms.length > 0
          ? Math.round(completedForms.reduce((sum, f) => sum + (f.total_time_seconds || 0), 0) / completedForms.length)
          : 0;
        
        const avgFieldsCompleted = total > 0
          ? Math.round(forms.reduce((sum, f) => sum + (f.completed_fields || 0), 0) / total * 10) / 10
          : 0;
        const avgFieldsSkipped = total > 0
          ? Math.round(forms.reduce((sum, f) => sum + (f.skipped_fields || 0), 0) / total * 10) / 10
          : 0;
        const avgValidationErrors = total > 0
          ? Math.round(forms.reduce((sum, f) => sum + (f.validation_error_count || 0), 0) / total * 10) / 10
          : 0;

        // Analyze problematic fields
        const fieldStats: Record<string, { totalTime: number; errors: number; skips: number; count: number }> = {};
        forms.forEach(form => {
          const fieldsData = form.fields_data as { 
            field_name: string; 
            time_spent_ms: number; 
            validation_errors: number; 
            was_skipped: boolean 
          }[] || [];
          
          fieldsData.forEach(field => {
            if (!fieldStats[field.field_name]) {
              fieldStats[field.field_name] = { totalTime: 0, errors: 0, skips: 0, count: 0 };
            }
            fieldStats[field.field_name].totalTime += field.time_spent_ms || 0;
            fieldStats[field.field_name].errors += field.validation_errors || 0;
            fieldStats[field.field_name].skips += field.was_skipped ? 1 : 0;
            fieldStats[field.field_name].count++;
          });
        });

        const problemFields: FieldProblem[] = Object.entries(fieldStats)
          .map(([fieldName, stats]) => ({
            fieldName,
            avgTimeMs: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
            validationErrors: stats.errors,
            skipRate: stats.count > 0 ? Math.round((stats.skips / stats.count) * 100) : 0,
            occurrences: stats.count,
          }))
          .filter(f => f.validationErrors > 0 || f.skipRate > 20 || f.avgTimeMs > 30000)
          .sort((a, b) => (b.validationErrors + b.skipRate) - (a.validationErrors + a.skipRate))
          .slice(0, 5);

        return {
          formType,
          totalForms: total,
          completedForms: completed,
          abandonedForms: abandoned,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgTimeSeconds: avgTime,
          avgFieldsCompleted,
          avgFieldsSkipped,
          avgValidationErrors,
          problemFields,
        };
      }).sort((a, b) => b.totalForms - a.totalForms);

      // Global problematic fields across all form types
      const allFieldStats: Record<string, { totalTime: number; errors: number; skips: number; count: number }> = {};
      data.forEach(form => {
        const fieldsData = form.fields_data as { 
          field_name: string; 
          time_spent_ms: number; 
          validation_errors: number; 
          was_skipped: boolean 
        }[] || [];
        
        fieldsData.forEach(field => {
          if (!allFieldStats[field.field_name]) {
            allFieldStats[field.field_name] = { totalTime: 0, errors: 0, skips: 0, count: 0 };
          }
          allFieldStats[field.field_name].totalTime += field.time_spent_ms || 0;
          allFieldStats[field.field_name].errors += field.validation_errors || 0;
          allFieldStats[field.field_name].skips += field.was_skipped ? 1 : 0;
          allFieldStats[field.field_name].count++;
        });
      });

      const topProblematicFields: FieldProblem[] = Object.entries(allFieldStats)
        .map(([fieldName, stats]) => ({
          fieldName,
          avgTimeMs: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
          validationErrors: stats.errors,
          skipRate: stats.count > 0 ? Math.round((stats.skips / stats.count) * 100) : 0,
          occurrences: stats.count,
        }))
        .filter(f => f.validationErrors > 0 || f.skipRate > 20 || f.avgTimeMs > 30000)
        .sort((a, b) => (b.validationErrors * 2 + b.skipRate) - (a.validationErrors * 2 + a.skipRate))
        .slice(0, 10);

      // Device breakdown
      const deviceGroups: Record<string, { total: number; completed: number }> = {};
      data.forEach(form => {
        const device = form.device_type || 'unknown';
        if (!deviceGroups[device]) {
          deviceGroups[device] = { total: 0, completed: 0 };
        }
        deviceGroups[device].total++;
        if (form.form_completed_at) {
          deviceGroups[device].completed++;
        }
      });

      const byDevice = Object.entries(deviceGroups)
        .map(([device, stats]) => ({
          device,
          count: stats.total,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Daily trend
      const dailyGroups: Record<string, { total: number; completed: number; abandoned: number }> = {};
      data.forEach(form => {
        const date = form.created_at.substring(0, 10);
        if (!dailyGroups[date]) {
          dailyGroups[date] = { total: 0, completed: 0, abandoned: 0 };
        }
        dailyGroups[date].total++;
        if (form.form_completed_at) {
          dailyGroups[date].completed++;
        }
        if (form.form_abandoned_at && !form.form_completed_at) {
          dailyGroups[date].abandoned++;
        }
      });

      const dailyTrend = Object.entries(dailyGroups)
        .map(([date, stats]) => ({
          date,
          total: stats.total,
          completed: stats.completed,
          abandoned: stats.abandoned,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalForms,
        completedForms,
        abandonedForms,
        overallCompletionRate,
        avgCompletionTimeSeconds,
        byFormType,
        topProblematicFields,
        byDevice,
        dailyTrend,
      };
    },
    enabled: !!user?.id,
  });
}
