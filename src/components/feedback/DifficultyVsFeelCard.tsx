/**
 * Difficulty vs Feel Card - Shows correlation between training difficulty and body feel
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay } from 'date-fns';
import { Zap } from 'lucide-react';
import { safeAverage } from '@/lib/feedbackCalculations';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DifficultyVsFeelCardProps {
  days?: number;
}

export function DifficultyVsFeelCard({ days = 30 }: DifficultyVsFeelCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['difficulty-vs-feel', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('difficulty, body_feel, created_at')
        .gte('created_at', startOfDay(startDate).toISOString());
      
      if (!feedbacks || feedbacks.length === 0) {
        return null;
      }
      
      // Filter for paired data
      const pairedData = feedbacks.filter(f => 
        f.difficulty !== null && f.body_feel !== null
      );
      
      if (pairedData.length < 3) {
        return null;
      }
      
      const difficultyValues = pairedData.map(f => f.difficulty as number);
      const bodyFeelValues = pairedData.map(f => f.body_feel as number);
      
      const avgDifficulty = safeAverage(difficultyValues);
      const avgBodyFeel = safeAverage(bodyFeelValues);
      
      // Calculate correlation
      let correlation: number | null = null;
      
      if (pairedData.length >= 5) {
        const meanDiff = avgDifficulty ?? 0;
        const meanFeel = avgBodyFeel ?? 0;
        
        let numerator = 0;
        let denomDiff = 0;
        let denomFeel = 0;
        
        for (let i = 0; i < pairedData.length; i++) {
          const diffD = difficultyValues[i] - meanDiff;
          const diffF = bodyFeelValues[i] - meanFeel;
          numerator += diffD * diffF;
          denomDiff += diffD * diffD;
          denomFeel += diffF * diffF;
        }
        
        if (denomDiff > 0 && denomFeel > 0) {
          correlation = Math.round((numerator / Math.sqrt(denomDiff * denomFeel)) * 100) / 100;
        }
      }
      
      // Prepare scatter data
      const scatterData = pairedData.map(f => ({
        difficulty: f.difficulty as number,
        bodyFeel: f.body_feel as number,
      }));
      
      return {
        avgDifficulty: avgDifficulty !== null ? Math.round(avgDifficulty * 10) / 10 : null,
        avgBodyFeel: avgBodyFeel !== null ? Math.round(avgBodyFeel * 10) / 10 : null,
        correlation,
        scatterData,
        totalPairs: pairedData.length,
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
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Náročnost vs. Pocit
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
  
  const correlationLabel = data.correlation !== null
    ? Math.abs(data.correlation) < 0.3 
      ? 'slabá' 
      : Math.abs(data.correlation) < 0.6 
        ? 'střední' 
        : 'silná'
    : null;
  
  const correlationDirection = data.correlation !== null
    ? data.correlation < 0 
      ? 'negativní' 
      : 'pozitivní'
    : null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Náročnost vs. Pocit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="text-xs text-muted-foreground">Ø Náročnost</div>
            <div className="text-xl font-bold">{data.avgDifficulty}/10</div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="text-xs text-muted-foreground">Ø Pocit těla</div>
            <div className="text-xl font-bold">{data.avgBodyFeel}/10</div>
          </div>
        </div>
        
        {/* Scatter chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="difficulty" 
                name="Náročnost" 
                domain={[0, 10]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Náročnost', position: 'bottom', fontSize: 10, offset: 0 }}
              />
              <YAxis 
                dataKey="bodyFeel" 
                name="Pocit těla" 
                domain={[0, 10]}
                tick={{ fontSize: 10 }}
                width={25}
              />
              {data.avgDifficulty && (
                <ReferenceLine 
                  x={data.avgDifficulty} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              {data.avgBodyFeel && (
                <ReferenceLine 
                  y={data.avgBodyFeel} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              )}
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [value, name === 'difficulty' ? 'Náročnost' : 'Pocit těla']}
              />
              <Scatter 
                data={data.scatterData} 
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Correlation */}
        {data.correlation !== null && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Korelace: <span className="font-medium text-foreground">{data.correlation}</span>
              <span className="ml-1">({correlationLabel} {correlationDirection})</span>
            </div>
            {data.correlation < -0.3 && (
              <p className="text-xs text-muted-foreground mt-1">
                → Vyšší náročnost mírně snižuje pocit těla
              </p>
            )}
            {data.correlation > 0.3 && (
              <p className="text-xs text-muted-foreground mt-1">
                → Vyšší náročnost koreluje s lepším pocitem
              </p>
            )}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          {data.totalPairs} feedbacků
        </p>
      </CardContent>
    </Card>
  );
}
