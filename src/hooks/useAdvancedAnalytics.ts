/**
 * useAdvancedAnalytics - Hook for fetching advanced analytics data
 * 
 * Provides:
 * - Click heatmap data
 * - Rage click detection
 * - Scroll depth analytics
 * - Feature time tracking
 * - User journey funnels
 * - Performance metrics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export type AdvancedStatsPeriod = '7d' | '30d' | '90d' | 'all';

function getDateRange(period: AdvancedStatsPeriod) {
  const now = new Date();
  switch (period) {
    case '7d':
      return startOfDay(subDays(now, 7));
    case '30d':
      return startOfDay(subDays(now, 30));
    case '90d':
      return startOfDay(subDays(now, 90));
    default:
      return null;
  }
}

// Click analytics - most clicked elements
export function useClickAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['click-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('interaction_events')
        .select('element_type, element_id, element_text, route, x_position, y_position')
        .eq('user_id', user.id)
        .eq('event_type', 'click');

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;

      // Group by element
      const elementCounts = new Map<string, { 
        count: number; 
        element_type: string; 
        element_text: string;
        route: string;
        positions: { x: number; y: number }[];
      }>();

      (data || []).forEach(click => {
        const key = click.element_id || `${click.element_type}-${click.element_text?.slice(0, 30)}`;
        const existing = elementCounts.get(key);
        if (existing) {
          existing.count++;
          if (click.x_position && click.y_position) {
            existing.positions.push({ x: click.x_position, y: click.y_position });
          }
        } else {
          elementCounts.set(key, {
            count: 1,
            element_type: click.element_type || 'unknown',
            element_text: click.element_text || '',
            route: click.route,
            positions: click.x_position && click.y_position 
              ? [{ x: click.x_position, y: click.y_position }] 
              : [],
          });
        }
      });

      // Convert to array and sort
      const topClicks = Array.from(elementCounts.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Group by route
      const routeCounts = (data || []).reduce((acc, click) => {
        acc[click.route] = (acc[click.route] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topRoutes = Object.entries(routeCounts)
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        topClicks,
        topRoutes,
        totalClicks: data?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

// Rage click analytics
export function useRageClickAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['rage-click-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('rage_clicks')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Group by route
      const routeStats = (data || []).reduce((acc, rc) => {
        if (!acc[rc.route]) {
          acc[rc.route] = { count: 0, elements: new Set<string>() };
        }
        acc[rc.route].count++;
        if (rc.element_text) {
          acc[rc.route].elements.add(rc.element_text.slice(0, 50));
        }
        return acc;
      }, {} as Record<string, { count: number; elements: Set<string> }>);

      const problemRoutes = Object.entries(routeStats)
        .map(([route, stats]) => ({
          route,
          count: stats.count,
          elements: Array.from(stats.elements).slice(0, 3),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        total: data?.length || 0,
        problemRoutes,
        recentRageClicks: data?.slice(0, 10) || [],
      };
    },
    enabled: !!user?.id,
  });
}

// Scroll depth analytics
export function useScrollAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['scroll-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('scroll_analytics')
        .select('route, max_scroll_percent, scroll_count, scroll_up_count')
        .eq('user_id', user.id);

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      // Average scroll depth by route
      const routeScrolls = (data || []).reduce((acc, s) => {
        if (!acc[s.route]) {
          acc[s.route] = { 
            depths: [], 
            scrollCounts: [], 
            scrollUpCounts: [] 
          };
        }
        acc[s.route].depths.push(s.max_scroll_percent || 0);
        acc[s.route].scrollCounts.push(s.scroll_count || 0);
        acc[s.route].scrollUpCounts.push(s.scroll_up_count || 0);
        return acc;
      }, {} as Record<string, { depths: number[]; scrollCounts: number[]; scrollUpCounts: number[] }>);

      const routeStats = Object.entries(routeScrolls)
        .map(([route, stats]) => ({
          route,
          avgDepth: Math.round(stats.depths.reduce((a, b) => a + b, 0) / stats.depths.length),
          avgScrolls: Math.round(stats.scrollCounts.reduce((a, b) => a + b, 0) / stats.scrollCounts.length),
          scrollBackRate: Math.round(
            (stats.scrollUpCounts.reduce((a, b) => a + b, 0) / stats.scrollCounts.reduce((a, b) => a + b, 0)) * 100
          ) || 0,
          visits: stats.depths.length,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 15);

      // Overall stats
      const allDepths = (data || []).map(s => s.max_scroll_percent || 0);
      const avgOverallDepth = allDepths.length > 0
        ? Math.round(allDepths.reduce((a, b) => a + b, 0) / allDepths.length)
        : 0;

      // Pages with low scroll (< 25%)
      const lowScrollPages = routeStats.filter(r => r.avgDepth < 25);

      return {
        routeStats,
        avgOverallDepth,
        lowScrollPages,
        totalRecords: data?.length || 0,
      };
    },
    enabled: !!user?.id,
  });
}

// Feature time analytics
export function useFeatureTimeAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['feature-time-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('feature_sessions')
        .select('feature_name, feature_category, duration_ms, active_duration_ms, click_count, scroll_depth_percent, exit_type')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null);

      if (startDate) {
        query = query.gte('started_at', startDate.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      // Group by feature
      const featureStats = (data || []).reduce((acc, session) => {
        const key = session.feature_name;
        if (!acc[key]) {
          acc[key] = {
            category: session.feature_category,
            totalTime: 0,
            activeTime: 0,
            clicks: 0,
            scrollDepths: [],
            sessions: 0,
            exitTypes: {} as Record<string, number>,
          };
        }
        acc[key].totalTime += session.duration_ms || 0;
        acc[key].activeTime += session.active_duration_ms || 0;
        acc[key].clicks += session.click_count || 0;
        acc[key].scrollDepths.push(session.scroll_depth_percent || 0);
        acc[key].sessions++;
        if (session.exit_type) {
          acc[key].exitTypes[session.exit_type] = (acc[key].exitTypes[session.exit_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, {
        category: string;
        totalTime: number;
        activeTime: number;
        clicks: number;
        scrollDepths: number[];
        sessions: number;
        exitTypes: Record<string, number>;
      }>);

      // Convert to array
      const features = Object.entries(featureStats)
        .map(([name, stats]) => ({
          name,
          category: stats.category,
          avgTimeMinutes: Math.round((stats.totalTime / stats.sessions) / 60000 * 10) / 10,
          avgActiveTimeMinutes: Math.round((stats.activeTime / stats.sessions) / 60000 * 10) / 10,
          avgClicks: Math.round(stats.clicks / stats.sessions),
          avgScrollDepth: Math.round(stats.scrollDepths.reduce((a, b) => a + b, 0) / stats.scrollDepths.length),
          sessions: stats.sessions,
          totalTimeMinutes: Math.round(stats.totalTime / 60000),
          inactivePercent: stats.totalTime > 0 
            ? Math.round((1 - stats.activeTime / stats.totalTime) * 100) 
            : 0,
          topExitType: Object.entries(stats.exitTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown',
        }))
        .sort((a, b) => b.totalTimeMinutes - a.totalTimeMinutes);

      // Category breakdown
      const categoryTime = features.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + f.totalTimeMinutes;
        return acc;
      }, {} as Record<string, number>);

      return {
        features,
        categoryTime: Object.entries(categoryTime)
          .map(([category, minutes]) => ({ category, minutes }))
          .sort((a, b) => b.minutes - a.minutes),
        totalFeatures: features.length,
        totalTimeMinutes: features.reduce((a, f) => a + f.totalTimeMinutes, 0),
      };
    },
    enabled: !!user?.id,
  });
}

// User journey analytics
export function useJourneyAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['journey-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('user_journeys')
        .select('journey_type, journey_name, total_steps, completed_steps, success, started_at, completed_at, abandoned_at')
        .eq('user_id', user.id);

      if (startDate) {
        query = query.gte('started_at', startDate.toISOString());
      }

      const { data, error } = await query.order('started_at', { ascending: false }).limit(200);
      if (error) throw error;

      // Group by journey type
      const journeyStats = (data || []).reduce((acc, journey) => {
        const type = journey.journey_type || 'unknown';
        if (!acc[type]) {
          acc[type] = {
            started: 0,
            completed: 0,
            abandoned: 0,
            totalSteps: 0,
            completedSteps: 0,
          };
        }
        acc[type].started++;
        if (journey.success) acc[type].completed++;
        if (journey.abandoned_at) acc[type].abandoned++;
        acc[type].totalSteps += journey.total_steps || 0;
        acc[type].completedSteps += journey.completed_steps || 0;
        return acc;
      }, {} as Record<string, {
        started: number;
        completed: number;
        abandoned: number;
        totalSteps: number;
        completedSteps: number;
      }>);

      const journeys = Object.entries(journeyStats)
        .map(([type, stats]) => ({
          type,
          started: stats.started,
          completed: stats.completed,
          abandoned: stats.abandoned,
          completionRate: stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : 0,
          avgStepsCompleted: stats.started > 0 
            ? Math.round((stats.completedSteps / stats.started) * 10) / 10 
            : 0,
          dropOffRate: stats.started > 0 ? Math.round((stats.abandoned / stats.started) * 100) : 0,
        }))
        .sort((a, b) => b.started - a.started);

      const totalStarted = journeys.reduce((a, j) => a + j.started, 0);
      const totalCompleted = journeys.reduce((a, j) => a + j.completed, 0);

      return {
        journeys,
        totalStarted,
        totalCompleted,
        overallCompletionRate: totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0,
      };
    },
    enabled: !!user?.id,
  });
}

// Performance analytics
export function usePerformanceAnalytics(period: AdvancedStatsPeriod) {
  const { user } = useAuth();
  const startDate = getDateRange(period);

  return useQuery({
    queryKey: ['performance-analytics', period, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('performance_metrics')
        .select('route, lcp_ms, fcp_ms, ttfb_ms, page_load_ms, device_type, connection_type')
        .eq('user_id', user.id);

      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      // Average metrics
      const validData = (data || []).filter(d => d.page_load_ms);
      const avgMetrics = {
        lcp: validData.filter(d => d.lcp_ms).length > 0
          ? Math.round(validData.filter(d => d.lcp_ms).reduce((a, d) => a + (d.lcp_ms || 0), 0) / validData.filter(d => d.lcp_ms).length)
          : null,
        fcp: validData.filter(d => d.fcp_ms).length > 0
          ? Math.round(validData.filter(d => d.fcp_ms).reduce((a, d) => a + (d.fcp_ms || 0), 0) / validData.filter(d => d.fcp_ms).length)
          : null,
        ttfb: validData.filter(d => d.ttfb_ms).length > 0
          ? Math.round(validData.filter(d => d.ttfb_ms).reduce((a, d) => a + (d.ttfb_ms || 0), 0) / validData.filter(d => d.ttfb_ms).length)
          : null,
        pageLoad: validData.length > 0
          ? Math.round(validData.reduce((a, d) => a + (d.page_load_ms || 0), 0) / validData.length)
          : null,
      };

      // Slow pages
      const routeMetrics = validData.reduce((acc, m) => {
        if (!acc[m.route]) acc[m.route] = [];
        acc[m.route].push(m.page_load_ms || 0);
        return acc;
      }, {} as Record<string, number[]>);

      const slowPages = Object.entries(routeMetrics)
        .map(([route, loads]) => ({
          route,
          avgLoadMs: Math.round(loads.reduce((a, b) => a + b, 0) / loads.length),
          samples: loads.length,
        }))
        .filter(p => p.avgLoadMs > 1000)
        .sort((a, b) => b.avgLoadMs - a.avgLoadMs)
        .slice(0, 10);

      // Device breakdown
      const deviceCounts = validData.reduce((acc, m) => {
        const device = m.device_type || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        avgMetrics,
        slowPages,
        deviceBreakdown: Object.entries(deviceCounts)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
        totalSamples: validData.length,
      };
    },
    enabled: !!user?.id,
  });
}

// Clear all advanced analytics
export function useClearAdvancedAnalytics() {
  const { user } = useAuth();

  return async () => {
    if (!user?.id) return;

    const tables = [
      'interaction_events',
      'feature_sessions',
      'user_journeys',
      'scroll_analytics',
      'rage_clicks',
      'performance_metrics',
    ];

    for (const table of tables) {
      await (supabase.from(table as any) as any).delete().eq('user_id', user.id);
    }
  };
}
