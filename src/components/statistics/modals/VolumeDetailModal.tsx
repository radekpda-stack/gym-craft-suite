import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVolumeStats } from '@/hooks/useVolumeStats';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Dumbbell, Calendar } from 'lucide-react';

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

interface VolumeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VolumeDetailModal({ open, onOpenChange }: VolumeDetailModalProps) {
  const { data, isLoading } = useVolumeStats(12); // 12 weeks for detail view

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tréninkový objem</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  const trendPositive = (data?.trend || 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Tréninkový objem - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Celkový objem</p>
              <p className="text-2xl font-bold">{formatVolume(data?.totalVolume || 0)} kg</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Ø týdně</p>
              <p className="text-2xl font-bold">{formatVolume(data?.avgWeeklyVolume || 0)} kg</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Trend</p>
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                {trendPositive ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <span className={trendPositive ? 'text-green-500' : 'text-red-500'}>
                  {trendPositive ? '+' : ''}{data?.trend || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vývoj objemu za posledních 12 týdnů
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weeklyData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="weekLabel" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => formatVolume(value)}
                    width={50}
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
                  <Bar
                    dataKey="volume"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-muted/30 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">Jak se počítá objem?</h4>
            <p className="text-muted-foreground">
              Tréninkový objem = součet všech (váha × opakování × série) pro každý cvik za dané období. 
              Trend porovnává posledních 6 týdnů s předchozími 6 týdny.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
