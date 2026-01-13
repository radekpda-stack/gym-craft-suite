import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVolumeStats } from '@/hooks/useVolumeStats';
import { TrendingUp, TrendingDown, Dumbbell, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { StatInfoTooltip } from './StatInfoTooltip';
import { VolumeDetailModal } from './modals/VolumeDetailModal';

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export function VolumeStatsCard() {
  const { data, isLoading } = useVolumeStats(8);
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-5">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!data || data.totalVolume === 0) {
    return (
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tréninkový objem</h3>
          <StatInfoTooltip
            title="Tréninkový objem"
            description="Celkový objem tréninku za zvolené období."
            calculation="Součet všech (váha × opakování × série) pro každý cvik."
          />
        </div>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Žádná data o objemu tréninku
        </div>
      </Card>
    );
  }

  const trendPositive = data.trend >= 0;

  return (
    <>
      <Card 
        className="p-4 sm:p-5 cursor-pointer hover:bg-accent/50 transition-colors group"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-semibold">Tréninkový objem</h3>
                <StatInfoTooltip
                  title="Tréninkový objem"
                  description="Celkový objem tréninku měřený v kilogramech."
                  calculation="Součet všech (váha × opakování × série) pro každý cvik. Trend porovnává posledních 4 týdny s předchozími 4 týdny."
                />
              </div>
              <p className="text-xs text-muted-foreground">Posledních 8 týdnů</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <div className="text-2xl font-bold">{formatVolume(data.totalVolume)} kg</div>
            <div className="flex items-center justify-end gap-1 text-xs">
                {trendPositive ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={trendPositive ? 'text-success' : 'text-destructive'}>
                  {trendPositive ? '+' : ''}{data.trend}%
                </span>
                <span className="text-muted-foreground ml-1">vs. předchozí</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>

        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="weekLabel" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval={1}
              />
              <YAxis 
                hide 
                domain={[0, 'dataMax']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${formatVolume(value)} kg`, 'Objem']}
                labelFormatter={(label) => `Týden od ${label}`}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Ø týdně: </span>
            <span className="font-medium">{formatVolume(data.avgWeeklyVolume)} kg</span>
          </div>
        </div>
      </Card>

      <VolumeDetailModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
