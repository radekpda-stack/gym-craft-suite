/**
 * Sleep Recovery Stats Card - Shows sleep quality and recovery patterns
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { safeAverage } from '@/lib/feedbackCalculations';

interface SleepRecoveryStatsCardProps {
  days?: number;
}

export function SleepRecoveryStatsCard({ days = 30 }: SleepRecoveryStatsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['sleep-recovery-stats', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      const midDate = subDays(new Date(), Math.floor(days / 2));
      
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('sleep_hours, sleep_after, energy_rating, created_at')
        .gte('created_at', startOfDay(startDate).toISOString());
      
      if (!feedbacks || feedbacks.length === 0) {
        return null;
      }
      
      // Sleep hours analysis
      const sleepHoursValues = feedbacks
        .filter(f => f.sleep_hours !== null)
        .map(f => f.sleep_hours as number);
      
      const avgSleepHours = sleepHoursValues.length > 0 
        ? safeAverage(sleepHoursValues) 
        : null;
      
      // Sleep quality distribution
      const sleepQualityData = feedbacks.filter(f => f.sleep_after !== null);
      const goodSleep = sleepQualityData.filter(f => f.sleep_after === 'good').length;
      const averageSleep = sleepQualityData.filter(f => f.sleep_after === 'average').length;
      const poorSleep = sleepQualityData.filter(f => f.sleep_after === 'poor').length;
      const totalSleepQuality = sleepQualityData.length;
      
      // Trend for sleep hours
      const recentFeedbacks = feedbacks.filter(f => new Date(f.created_at) >= midDate);
      const olderFeedbacks = feedbacks.filter(f => new Date(f.created_at) < midDate);
      
      const recentSleepHours = safeAverage(
        recentFeedbacks.filter(f => f.sleep_hours !== null).map(f => f.sleep_hours as number)
      );
      const olderSleepHours = safeAverage(
        olderFeedbacks.filter(f => f.sleep_hours !== null).map(f => f.sleep_hours as number)
      );
      
      let trend: 'up' | 'down' | 'same' | null = null;
      if (recentSleepHours !== null && olderSleepHours !== null) {
        const diff = recentSleepHours - olderSleepHours;
        if (diff > 0.3) trend = 'up';
        else if (diff < -0.3) trend = 'down';
        else trend = 'same';
      }
      
      // Correlation between sleep quality and next day energy
      const pairedData = feedbacks.filter(f => f.sleep_after !== null && f.energy_rating !== null);
      let correlation: number | null = null;
      
      if (pairedData.length >= 5) {
        // Convert sleep_after to numeric: good=3, average=2, poor=1
        const sleepNumeric = pairedData.map(f => 
          f.sleep_after === 'good' ? 3 : f.sleep_after === 'average' ? 2 : 1
        );
        const energyValues = pairedData.map(f => f.energy_rating as number);
        
        const meanSleep = safeAverage(sleepNumeric) ?? 0;
        const meanEnergy = safeAverage(energyValues) ?? 0;
        
        let numerator = 0;
        let denomSleep = 0;
        let denomEnergy = 0;
        
        for (let i = 0; i < pairedData.length; i++) {
          const diffSleep = sleepNumeric[i] - meanSleep;
          const diffEnergy = energyValues[i] - meanEnergy;
          numerator += diffSleep * diffEnergy;
          denomSleep += diffSleep * diffSleep;
          denomEnergy += diffEnergy * diffEnergy;
        }
        
        if (denomSleep > 0 && denomEnergy > 0) {
          correlation = Math.round((numerator / Math.sqrt(denomSleep * denomEnergy)) * 100) / 100;
        }
      }
      
      return {
        avgSleepHours: avgSleepHours !== null ? Math.round(avgSleepHours * 10) / 10 : null,
        trend,
        sleepQuality: totalSleepQuality > 0 ? {
          good: Math.round((goodSleep / totalSleepQuality) * 100),
          average: Math.round((averageSleep / totalSleepQuality) * 100),
          poor: Math.round((poorSleep / totalSleepQuality) * 100),
          total: totalSleepQuality,
        } : null,
        correlation,
        totalRecords: feedbacks.length,
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
  
  if (!data || (data.avgSleepHours === null && data.sleepQuality === null)) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Spánek a regenerace
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
          <Moon className="h-4 w-4" />
          Spánek a regenerace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average sleep hours */}
        {data.avgSleepHours !== null && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{data.avgSleepHours}h</div>
              <div className="text-sm text-muted-foreground">průměr hodin</div>
            </div>
            {data.trend && (
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {data.trend === 'up' ? 'Více' : data.trend === 'down' ? 'Méně' : 'Stejně'}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Sleep quality distribution */}
        {data.sleepQuality && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Kvalita spánku po tréninku
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dobrý</span>
              <span className="font-medium">{data.sleepQuality.good}%</span>
            </div>
            <Progress value={data.sleepQuality.good} className="h-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Průměrný</span>
              <span className="font-medium">{data.sleepQuality.average}%</span>
            </div>
            <Progress value={data.sleepQuality.average} className="h-2 [&>div]:bg-amber-500" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Špatný</span>
              <span className="font-medium">{data.sleepQuality.poor}%</span>
            </div>
            <Progress value={data.sleepQuality.poor} className="h-2 [&>div]:bg-destructive" />
          </div>
        )}
        
        {/* Correlation */}
        {data.correlation !== null && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Korelace spánek × energie: <span className="font-medium text-foreground">{data.correlation}</span>
              <span className="ml-1">
                ({Math.abs(data.correlation) < 0.3 ? 'slabá' : Math.abs(data.correlation) < 0.6 ? 'střední' : 'silná'})
              </span>
            </div>
            {data.correlation > 0.3 && (
              <p className="text-xs text-muted-foreground mt-1">
                → Lepší spánek = vyšší energie
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
