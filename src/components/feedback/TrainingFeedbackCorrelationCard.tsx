/**
 * TrainingFeedbackCorrelationCard - Visualizes correlation between training metrics and feedback
 * Shows scatter chart and correlation statistics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from 'recharts';
import { Activity, TrendingUp, BarChart3, Info } from 'lucide-react';
import { useTrainingFeedbackCorrelation } from '@/hooks/useTrainingFeedbackCorrelation';
import { cn } from '@/lib/utils';

interface TrainingFeedbackCorrelationCardProps {
  clientId?: string;
  days?: number;
  className?: string;
}

const CorrelationBadge = ({ value }: { value: number | null }) => {
  if (value === null) return <Badge variant="outline">Nedostatek dat</Badge>;
  
  const absValue = Math.abs(value);
  let label: string;
  let description: string;
  
  if (absValue >= 0.7) {
    label = 'Silná';
    description = value > 0 ? 'pozitivní' : 'negativní';
  } else if (absValue >= 0.4) {
    label = 'Střední';
    description = value > 0 ? 'pozitivní' : 'negativní';
  } else if (absValue >= 0.2) {
    label = 'Slabá';
    description = value > 0 ? 'pozitivní' : 'negativní';
  } else {
    label = 'Zanedbatelná';
    description = '';
  }
  
  return (
    <Badge variant="secondary" className="font-normal">
      {value.toFixed(2)} • {label} {description}
    </Badge>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium">{data.clientName}</p>
      <p className="text-muted-foreground text-xs mb-2">{data.trainingDate}</p>
      <div className="space-y-1">
        <p>Objem: <span className="font-medium">{data.sessionVolume?.toLocaleString() || '—'} kg</span></p>
        <p>Svalovka: <span className="font-medium">{data.soreness ?? '—'}/10</span></p>
        <p>Pocit těla: <span className="font-medium">{data.bodyFeel ?? '—'}/10</span></p>
        <p>RPE: <span className="font-medium">{data.rpe ?? '—'}/10</span></p>
      </div>
    </div>
  );
};

export function TrainingFeedbackCorrelationCard({ 
  clientId, 
  days = 90,
  className 
}: TrainingFeedbackCorrelationCardProps) {
  const { data, isLoading } = useTrainingFeedbackCorrelation(clientId, days);
  
  if (isLoading) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Trénink → Reakce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.dataPoints.length === 0) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Trénink → Reakce
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím žádná data pro analýzu</p>
          <p className="text-xs text-muted-foreground mt-1">
            Data se zobrazí po vyplnění feedbacků k tréninkům.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Prepare scatter data
  const volumeVsSorenessData = data.dataPoints
    .filter(dp => dp.sessionVolume !== null && dp.soreness !== null)
    .map(dp => ({
      ...dp,
      x: dp.sessionVolume,
      y: dp.soreness,
    }));
  
  const rpeVsBodyFeelData = data.dataPoints
    .filter(dp => dp.rpe !== null && dp.bodyFeel !== null)
    .map(dp => ({
      ...dp,
      x: dp.rpe,
      y: dp.bodyFeel,
    }));
  
  return (
    <Card className={cn("glass", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Trénink → Reakce
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {data.trainingsWithFeedback} tréninků
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correlation Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              Objem × Svalovka
            </div>
            <CorrelationBadge value={data.correlations.volumeVsSoreness} />
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              RPE × Pocit těla
            </div>
            <CorrelationBadge value={data.correlations.rpeVsBodyFeel} />
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3.5 h-3.5" />
              Délka × Energie
            </div>
            <CorrelationBadge value={data.correlations.durationVsEnergy} />
          </div>
        </div>
        
        {/* Info note */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Korelace ukazuje sílu vztahu mezi metrikami. Hodnota blízká 1 nebo -1 značí silný vztah.
          </span>
        </div>
        
        {/* Scatter Charts */}
        <Tabs defaultValue="volume-soreness" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="volume-soreness" className="text-xs">
              Objem × Svalovka
            </TabsTrigger>
            <TabsTrigger value="rpe-bodyfeel" className="text-xs">
              RPE × Pocit těla
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="volume-soreness">
            {volumeVsSorenessData.length >= 3 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Objem"
                      unit=" kg"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Svalovka"
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <ZAxis range={[50, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter 
                      name="Tréninky" 
                      data={volumeVsSorenessData} 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nedostatek dat pro zobrazení (min. 3 tréninky)
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="rpe-bodyfeel">
            {rpeVsBodyFeelData.length >= 3 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="RPE"
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Pocit těla"
                      domain={[0, 10]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <ZAxis range={[50, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter 
                      name="Tréninky" 
                      data={rpeVsBodyFeelData} 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Nedostatek dat pro zobrazení (min. 3 tréninky)
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
