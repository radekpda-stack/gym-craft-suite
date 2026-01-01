import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Battery, TrendingUp, BarChart2 } from 'lucide-react';
import { useTrainingIntensityStats } from '@/hooks/useTrainingIntensityStats';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';

export function IntensityStatsCard() {
  const { data, isLoading } = useTrainingIntensityStats();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (!data || data.totalWithIntensity === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4 text-muted-foreground" />
            Intenzita tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná RPE/RIR data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Color for RPE ranges
  const getBarColor = (range: string) => {
    switch (range) {
      case '1-3': return 'hsl(var(--chart-4))'; // light
      case '4-5': return 'hsl(var(--chart-3))';
      case '6-7': return 'hsl(var(--chart-2))';
      case '8-9': return 'hsl(var(--chart-1))';
      case '10': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Flame className="h-4 w-4 text-orange-500" />
          Intenzita tréninků (RPE/RIR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4 text-center pb-2 border-b">
          <div>
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{data.avgRPE.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">průměrné RPE</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Battery className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{data.avgRIR.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">průměrné RIR</p>
          </div>
        </div>

        {/* RPE Distribution Chart */}
        {data.rpeDistribution.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Rozložení RPE</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.rpeDistribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value} tréninků`, 'Počet']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.rpeDistribution.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.range)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* High/Low intensity counts */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">Vysoká (8+):</span>
            <span className="font-medium">{data.highIntensityCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart2 className="h-3 w-3 text-blue-500" />
            <span className="text-muted-foreground">Nízká (≤5):</span>
            <span className="font-medium">{data.lowIntensityCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
