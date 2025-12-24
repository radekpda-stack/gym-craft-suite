import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Weight, TrendingUp } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface VolumeStatsCardProps {
  totalVolume: number;
  volumeTrend: number[];
  isLoading?: boolean;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}t`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return `${Math.round(volume)}`;
}

export function VolumeStatsCard({ totalVolume, volumeTrend, isLoading }: VolumeStatsCardProps) {
  const chartData = volumeTrend?.map((value, index) => ({ value, index })) || [];

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Weight className="w-4 h-4 text-primary" />
            Celkový objem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Weight className="w-4 h-4 text-primary" />
          Celkový objem
          <StatInfoTooltip 
            title="Celkový objem"
            description="Suma váha × opakování × série za posledních 30 dní"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-3xl font-bold text-primary">
              {formatVolume(totalVolume)}
            </p>
            <p className="text-xs text-muted-foreground">kg za 30 dní</p>
          </div>
          <div className="flex-1 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
