import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, format, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface FeedbackAnalyticsData {
  // Response rate
  responseRate: number;
  totalSent: number;
  totalCompleted: number;
  
  // Time series data for charts
  dailyData: Array<{
    date: string;
    label: string;
    sent: number;
    completed: number;
    avgBodyFeel: number | null;
    avgSoreness: number | null;
    redFlags: number;
  }>;
  
  // Metric averages and trends
  metrics: {
    bodyFeel: { current: number | null; previous: number | null; trend: 'up' | 'down' | 'same' | null };
    soreness: { current: number | null; previous: number | null; trend: 'up' | 'down' | 'same' | null };
    energy: { current: number | null; previous: number | null; trend: 'up' | 'down' | 'same' | null };
    pain: { current: number | null; previous: number | null; trend: 'up' | 'down' | 'same' | null };
    fun: { current: number | null; previous: number | null; trend: 'up' | 'down' | 'same' | null };
  };
  
  // Red flags count
  redFlagsCount: number;
  redFlagsTrend: 'up' | 'down' | 'same' | null;
  
  // Top pain areas
  topPainAreas: Array<{ area: string; count: number }>;
  
  // Response time stats
  avgResponseTimeHours: number | null;
}

export function useFeedbackAnalytics(days: number = 30) {
  return useQuery({
    queryKey: ['feedback-analytics', days],
    queryFn: async (): Promise<FeedbackAnalyticsData> => {
      const now = new Date();
      const startDate = subDays(now, days);
      const midDate = subDays(now, Math.floor(days / 2));
      
      // Get feedback requests in period
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, status, created_at, completed_at, sent_at')
        .gte('created_at', startOfDay(startDate).toISOString())
        .order('created_at', { ascending: true });

      const completedRequestIds = (requests || [])
        .filter(r => r.status === 'completed')
        .map(r => r.id);

      // Get feedback details
      let feedbacks: any[] = [];
      if (completedRequestIds.length > 0) {
        const { data } = await supabase
          .from('training_feedback')
          .select('*')
          .in('feedback_request_id', completedRequestIds);
        feedbacks = data || [];
      }

      // Calculate response rate
      const totalSent = (requests || []).filter(r => r.sent_at).length;
      const totalCompleted = completedRequestIds.length;
      const responseRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;

      // Build daily/weekly data based on period length
      const useWeekly = days > 30;
      const intervals = useWeekly 
        ? eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 })
        : eachDayOfInterval({ start: startDate, end: now });

      const dailyData = intervals.map(date => {
        const intervalStart = useWeekly ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date);
        const intervalEnd = useWeekly ? endOfWeek(date, { weekStartsOn: 1 }) : new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const intervalRequests = (requests || []).filter(r => {
          const created = new Date(r.created_at);
          return created >= intervalStart && created <= intervalEnd;
        });
        
        const intervalFeedbacks = feedbacks.filter(f => {
          const created = new Date(f.created_at);
          return created >= intervalStart && created <= intervalEnd;
        });

        const bodyFeelValues = intervalFeedbacks.filter(f => f.body_feel !== null).map(f => f.body_feel);
        const sorenessValues = intervalFeedbacks.filter(f => f.soreness !== null).map(f => f.soreness);
        const redFlags = intervalFeedbacks.filter(f => f.is_red_flag).length;

        return {
          date: format(date, 'yyyy-MM-dd'),
          label: useWeekly 
            ? `${format(intervalStart, 'd.M.', { locale: cs })} - ${format(intervalEnd, 'd.M.', { locale: cs })}`
            : format(date, 'd.M.', { locale: cs }),
          sent: intervalRequests.filter(r => r.sent_at).length,
          completed: intervalRequests.filter(r => r.status === 'completed').length,
          avgBodyFeel: bodyFeelValues.length > 0 
            ? Math.round(bodyFeelValues.reduce((a: number, b: number) => a + b, 0) / bodyFeelValues.length * 10) / 10 
            : null,
          avgSoreness: sorenessValues.length > 0 
            ? Math.round(sorenessValues.reduce((a: number, b: number) => a + b, 0) / sorenessValues.length * 10) / 10 
            : null,
          redFlags,
        };
      });

      // Calculate metric trends (current half vs previous half)
      const recentFeedbacks = feedbacks.filter(f => new Date(f.created_at) >= midDate);
      const olderFeedbacks = feedbacks.filter(f => new Date(f.created_at) < midDate);

      const calcTrend = (current: number | null, previous: number | null): 'up' | 'down' | 'same' | null => {
        if (current === null || previous === null) return null;
        if (current > previous + 0.3) return 'up';
        if (current < previous - 0.3) return 'down';
        return 'same';
      };

      const calcAvg = (arr: any[], key: string): number | null => {
        const values = arr.filter(f => f[key] !== null).map(f => f[key]);
        if (values.length === 0) return null;
        return Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length * 10) / 10;
      };

      const metrics = {
        bodyFeel: {
          current: calcAvg(recentFeedbacks, 'body_feel'),
          previous: calcAvg(olderFeedbacks, 'body_feel'),
          trend: calcTrend(calcAvg(recentFeedbacks, 'body_feel'), calcAvg(olderFeedbacks, 'body_feel')),
        },
        soreness: {
          current: calcAvg(recentFeedbacks, 'soreness'),
          previous: calcAvg(olderFeedbacks, 'soreness'),
          trend: calcTrend(calcAvg(olderFeedbacks, 'soreness'), calcAvg(recentFeedbacks, 'soreness')), // Inverted
        },
        energy: {
          current: calcAvg(recentFeedbacks, 'energy'),
          previous: calcAvg(olderFeedbacks, 'energy'),
          trend: calcTrend(calcAvg(recentFeedbacks, 'energy'), calcAvg(olderFeedbacks, 'energy')),
        },
        pain: {
          current: calcAvg(recentFeedbacks, 'pain'),
          previous: calcAvg(olderFeedbacks, 'pain'),
          trend: calcTrend(calcAvg(olderFeedbacks, 'pain'), calcAvg(recentFeedbacks, 'pain')), // Inverted
        },
        fun: {
          current: calcAvg(recentFeedbacks, 'fun'),
          previous: calcAvg(olderFeedbacks, 'fun'),
          trend: calcTrend(calcAvg(recentFeedbacks, 'fun'), calcAvg(olderFeedbacks, 'fun')),
        },
      };

      // Red flags trend
      const recentRedFlags = recentFeedbacks.filter(f => f.is_red_flag).length;
      const olderRedFlags = olderFeedbacks.filter(f => f.is_red_flag).length;
      const redFlagsTrend = recentRedFlags < olderRedFlags ? 'down' : recentRedFlags > olderRedFlags ? 'up' : 'same';

      // Top pain areas
      const painAreaCounts: Record<string, number> = {};
      feedbacks.forEach(f => {
        if (f.pain_areas && Array.isArray(f.pain_areas)) {
          f.pain_areas.forEach((area: any) => {
            const areaName = typeof area === 'string' ? area : area.area || area.name;
            if (areaName) {
              painAreaCounts[areaName] = (painAreaCounts[areaName] || 0) + 1;
            }
          });
        }
      });
      const topPainAreas = Object.entries(painAreaCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Average response time
      const responseTimes = (requests || [])
        .filter(r => r.sent_at && r.completed_at)
        .map(r => {
          const sent = new Date(r.sent_at!);
          const completed = new Date(r.completed_at!);
          return (completed.getTime() - sent.getTime()) / (1000 * 60 * 60);
        });
      const avgResponseTimeHours = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
        : null;

      return {
        responseRate,
        totalSent,
        totalCompleted,
        dailyData,
        metrics,
        redFlagsCount: recentRedFlags + olderRedFlags,
        redFlagsTrend,
        topPainAreas,
        avgResponseTimeHours,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
