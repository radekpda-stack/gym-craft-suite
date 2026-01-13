import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTrainingIntensityStats } from '@/hooks/useTrainingIntensityStats';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface IntensityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntensityDetailModal({ open, onOpenChange }: IntensityDetailModalProps) {
  const { data, isLoading } = useTrainingIntensityStats();

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Intenzita tréninků</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  const avgRPE = data?.avgRPE || 0;
  const monthlyTrend = data?.monthlyTrend || [];

  const getIntensityLabel = (rpe: number) => {
    if (rpe >= 8) return { label: 'Vysoká', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (rpe >= 6) return { label: 'Střední', color: 'text-warning', bg: 'bg-warning/10' };
    if (rpe >= 4) return { label: 'Nízká', color: 'text-success', bg: 'bg-success/10' };
    return { label: 'Velmi nízká', color: 'text-accent', bg: 'bg-accent/10' };
  };

  const intensityInfo = getIntensityLabel(avgRPE);

  // Calculate trend from monthly data
  const recentMonths = monthlyTrend.slice(-3);
  const olderMonths = monthlyTrend.slice(-6, -3);
  const recentAvg = recentMonths.length > 0 
    ? recentMonths.reduce((sum, m) => sum + (m.avgRPE || 0), 0) / recentMonths.length 
    : 0;
  const olderAvg = olderMonths.length > 0 
    ? olderMonths.reduce((sum, m) => sum + (m.avgRPE || 0), 0) / olderMonths.length 
    : 0;
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Intenzita tréninků - detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`rounded-lg p-4 text-center ${intensityInfo.bg}`}>
              <p className="text-sm text-muted-foreground">Ø Intenzita</p>
              <p className={`text-3xl font-bold ${intensityInfo.color}`}>{avgRPE.toFixed(1)}</p>
              <p className={`text-xs ${intensityInfo.color}`}>{intensityInfo.label}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Trend</p>
              <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                {trend > 1 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : trend < -1 ? (
                  <TrendingDown className="h-5 w-5 text-success" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={trend > 1 ? 'text-destructive' : trend < -1 ? 'text-success' : 'text-muted-foreground'}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Tréninků s RPE</p>
              <p className="text-2xl font-bold">{data?.totalWithIntensity || 0}</p>
            </div>
          </div>

          {/* Monthly RPE Chart */}
          {monthlyTrend.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Vývoj intenzity po měsících
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      width={30}
                    />
                    <ReferenceLine y={6} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [value.toFixed(1), 'Ø RPE']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRPE"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* RPE Scale explanation */}
          <div className="bg-muted/30 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-3">Škála RPE (Rate of Perceived Exertion)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-success/20 text-success flex items-center justify-center font-medium">1-4</span>
                <span className="text-muted-foreground">Lehké – zotavovací trénink</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-warning/20 text-warning flex items-center justify-center font-medium">5-6</span>
                <span className="text-muted-foreground">Střední – běžný trénink</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-warning/20 text-warning flex items-center justify-center font-medium">7-8</span>
                <span className="text-muted-foreground">Těžké – intenzivní trénink</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-destructive/20 text-destructive flex items-center justify-center font-medium">9-10</span>
                <span className="text-muted-foreground">Maximum – testování limitů</span>
              </div>
            </div>
          </div>

          {/* How it's calculated */}
          <div className="text-sm text-muted-foreground">
            <strong>Výpočet:</strong> Průměrná hodnota RPE ze všech záznamů cviků, kde bylo RPE zadáno.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
