/**
 * Session Fit Stats Card - Shows how well trainings fit clients
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { safeAverage } from '@/lib/feedbackCalculations';

interface SessionFitStatsCardProps {
  days?: number;
}

export function SessionFitStatsCard({ days = 30 }: SessionFitStatsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['session-fit-stats', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      const midDate = subDays(new Date(), Math.floor(days / 2));
      
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('session_fit, rpe_rating, created_at')
        .gte('created_at', startOfDay(startDate).toISOString());
      
      if (!feedbacks || feedbacks.length === 0) {
        return null;
      }
      
      const sessionFitValues = feedbacks
        .filter(f => f.session_fit !== null)
        .map(f => f.session_fit as number);
      
      if (sessionFitValues.length === 0) {
        return null;
      }
      
      const avg = safeAverage(sessionFitValues) ?? 0;
      
      // Calculate trend
      const recentFeedbacks = feedbacks.filter(f => new Date(f.created_at) >= midDate);
      const olderFeedbacks = feedbacks.filter(f => new Date(f.created_at) < midDate);
      
      const recentAvg = safeAverage(recentFeedbacks.filter(f => f.session_fit !== null).map(f => f.session_fit as number));
      const olderAvg = safeAverage(olderFeedbacks.filter(f => f.session_fit !== null).map(f => f.session_fit as number));
      
      let trend: 'up' | 'down' | 'same' | null = null;
      let trendValue: number | null = null;
      if (recentAvg !== null && olderAvg !== null) {
        trendValue = Math.round((recentAvg - olderAvg) * 10) / 10;
        if (trendValue > 0.3) trend = 'up';
        else if (trendValue < -0.3) trend = 'down';
        else trend = 'same';
      }
      
      // Distribution
      const excellent = sessionFitValues.filter(v => v >= 8).length;
      const good = sessionFitValues.filter(v => v >= 5 && v < 8).length;
      const poor = sessionFitValues.filter(v => v < 5).length;
      const total = sessionFitValues.length;
      
      // Calculate correlation with RPE
      const pairedData = feedbacks.filter(f => f.session_fit !== null && f.rpe_rating !== null);
      let correlation: number | null = null;
      if (pairedData.length >= 5) {
        const sessionFits = pairedData.map(f => f.session_fit as number);
        const rpes = pairedData.map(f => f.rpe_rating as number);
        
        const meanSF = safeAverage(sessionFits) ?? 0;
        const meanRPE = safeAverage(rpes) ?? 0;
        
        let numerator = 0;
        let denomSF = 0;
        let denomRPE = 0;
        
        for (let i = 0; i < pairedData.length; i++) {
          const diffSF = sessionFits[i] - meanSF;
          const diffRPE = rpes[i] - meanRPE;
          numerator += diffSF * diffRPE;
          denomSF += diffSF * diffSF;
          denomRPE += diffRPE * diffRPE;
        }
        
        if (denomSF > 0 && denomRPE > 0) {
          correlation = Math.round((numerator / Math.sqrt(denomSF * denomRPE)) * 100) / 100;
        }
      }
      
      return {
        avg: Math.round(avg * 10) / 10,
        trend,
        trendValue,
        distribution: {
          excellent: Math.round((excellent / total) * 100),
          good: Math.round((good / total) * 100),
          poor: Math.round((poor / total) * 100),
        },
        correlation,
        total,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Jak sedí tréninky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nedostatek dat za období
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data.trend === 'up' ? 'text-success' : data.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Jak sedí tréninky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stat */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{data.avg}</div>
            <div className="text-sm text-muted-foreground">/10 průměr</div>
          </div>
          {data.trend && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {data.trendValue !== null && data.trendValue > 0 ? '+' : ''}
                {data.trendValue}
              </span>
            </div>
          )}
        </div>
        
        {/* Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">8-10: Výborně</span>
            <span className="font-medium">{data.distribution.excellent}%</span>
          </div>
          <Progress value={data.distribution.excellent} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">5-7: Dobře</span>
            <span className="font-medium">{data.distribution.good}%</span>
          </div>
          <Progress value={data.distribution.good} className="h-2 [&>div]:bg-amber-500" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1-4: Nesedí</span>
            <span className="font-medium">{data.distribution.poor}%</span>
          </div>
          <Progress value={data.distribution.poor} className="h-2 [&>div]:bg-destructive" />
        </div>
        
        {/* Correlation */}
        {data.correlation !== null && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Korelace s RPE: <span className="font-medium text-foreground">{data.correlation}</span>
              <span className="ml-1">
                ({Math.abs(data.correlation) < 0.3 ? 'slabá' : Math.abs(data.correlation) < 0.6 ? 'střední' : 'silná'})
              </span>
            </div>
            {data.correlation < -0.3 && (
              <p className="text-xs text-muted-foreground mt-1">
                → Vyšší RPE = horší session fit
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
