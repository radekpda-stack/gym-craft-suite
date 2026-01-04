import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface TrainerMeasurementSummaryProps {
  clientId: string;
}

export function TrainerMeasurementSummary({ clientId }: TrainerMeasurementSummaryProps) {
  const { data: measurements, isLoading } = useQuery({
    queryKey: ['trainer-measurements-summary', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('measurements')
        .select('id, date, weight, body_fat_percentage')
        .eq('client_id', clientId)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-36" />;
  }

  const latestWeight = measurements?.length 
    ? measurements[measurements.length - 1]?.weight 
    : null;
  
  const latestBodyFat = measurements?.length 
    ? measurements[measurements.length - 1]?.body_fat_percentage 
    : null;

  // Calculate trend
  const previousWeight = measurements && measurements.length > 1 
    ? measurements[measurements.length - 2]?.weight 
    : null;
  
  const weightTrend = latestWeight && previousWeight 
    ? latestWeight - previousWeight 
    : 0;

  const chartData = measurements?.filter(m => m.weight).map(m => ({
    date: m.date,
    weight: m.weight,
  })) || [];

  const TrendIcon = weightTrend > 0 ? TrendingUp : weightTrend < 0 ? TrendingDown : Minus;
  const trendColor = weightTrend > 0 ? 'text-red-500' : weightTrend < 0 ? 'text-green-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Měření
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestWeight || latestBodyFat ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                {latestWeight && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{latestWeight.toFixed(1)} kg</span>
                    {weightTrend !== 0 && (
                      <div className={`flex items-center gap-0.5 ${trendColor}`}>
                        <TrendIcon className="w-4 h-4" />
                        <span className="text-xs">{Math.abs(weightTrend).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}
                {latestBodyFat && (
                  <span className="text-sm text-muted-foreground">
                    Tělesný tuk: {latestBodyFat.toFixed(1)}%
                  </span>
                )}
              </div>
              {chartData.length > 1 && (
                <div className="w-20 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Žádná měření za posledních 30 dní
          </p>
        )}
      </CardContent>
    </Card>
  );
}
