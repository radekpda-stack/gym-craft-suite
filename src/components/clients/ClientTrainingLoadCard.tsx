import { cn } from '@/lib/utils';
import { useTrainingLoadStats } from '@/hooks/useTrainingLoadStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientTrainingLoadCardProps {
  clientId: string;
  className?: string;
}

export function ClientTrainingLoadCard({ clientId, className }: ClientTrainingLoadCardProps) {
  const { data: stats, isLoading, error } = useTrainingLoadStats(clientId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-muted-foreground">
          Nepodařilo se načíst statistiky zátěže
        </CardContent>
      </Card>
    );
  }

  // Připravit data pro graf
  const chartData = stats.loadOverTime.map((item) => {
    const coachRPE = stats.coachRPEOverTime.find((r) => r.date === item.date)?.value;
    const clientRPE = stats.clientRPEOverTime.find((r) => r.date === item.date)?.value;
    return {
      date: item.date,
      formattedDate: format(parseISO(item.date), 'd. MMM', { locale: cs }),
      load: item.value,
      coachRPE,
      clientRPE,
    };
  });

  const TrendIcon = stats.loadTrend === 'increasing' 
    ? TrendingUp 
    : stats.loadTrend === 'decreasing' 
      ? TrendingDown 
      : Minus;

  const trendColor = stats.loadTrend === 'increasing'
    ? 'text-green-600'
    : stats.loadTrend === 'decreasing'
      ? 'text-red-600'
      : 'text-muted-foreground';

  const trendLabel = stats.loadTrend === 'increasing'
    ? 'Rostoucí'
    : stats.loadTrend === 'decreasing'
      ? 'Klesající'
      : 'Stabilní';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Zátěž a náročnost
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hlavní metriky */}
        <div className="grid grid-cols-3 gap-3">
          {/* Coach RPE */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-700">
              {stats.avgCoachRPE28d ?? '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              Coach RPE (28d)
            </div>
            {stats.avgCoachRPE7d && (
              <div className="text-xs text-blue-600 mt-1">
                7d: {stats.avgCoachRPE7d}
              </div>
            )}
          </div>

          {/* Client RPE */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-700">
              {stats.avgClientRPE28d ?? '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              Client RPE (28d)
            </div>
            {stats.avgClientRPE7d && (
              <div className="text-xs text-purple-600 mt-1">
                7d: {stats.avgClientRPE7d}
              </div>
            )}
          </div>

          {/* Training Load */}
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-700">
              {stats.totalLoad7d.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Load (7d)
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={cn('h-3 w-3', trendColor)} />
              <span className={cn('text-xs', trendColor)}>{trendLabel}</span>
            </div>
          </div>
        </div>

        {/* Rozdíl RPE varování */}
        {stats.rpeDiscrepancy !== null && Math.abs(stats.rpeDiscrepancy) >= 1 && (
          <div className={cn(
            'flex items-center gap-2 p-2 rounded-lg text-sm',
            Math.abs(stats.rpeDiscrepancy) >= 2
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700'
              : 'bg-muted text-muted-foreground'
          )}>
            {Math.abs(stats.rpeDiscrepancy) >= 2 && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>
              Rozdíl RPE: Trenér hodnotí o {Math.abs(stats.rpeDiscrepancy).toFixed(1)}{' '}
              {stats.rpeDiscrepancy > 0 ? 'výš' : 'níž'} než klient
            </span>
          </div>
        )}

        {/* Graf trendu */}
        {chartData.length > 2 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  yAxisId="rpe"
                  domain={[0, 10]}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="rpe"
                  type="monotone"
                  dataKey="coachRPE"
                  name="Coach RPE"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="rpe"
                  type="monotone"
                  dataKey="clientRPE"
                  name="Client RPE"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Statistiky podle typu */}
        {stats.byType.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Podle typu tréninku</div>
            <div className="flex flex-wrap gap-2">
              {stats.byType.map((item) => (
                <Badge key={item.type} variant="outline" className="text-xs">
                  {getTypeLabel(item.type)}: RPE {item.avgRPE.toFixed(1)} ({item.count}×)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Souhrn */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {stats.totalSessions7d} tréninků za 7 dní • {stats.totalSessions28d} za 28 dní
        </div>
      </CardContent>
    </Card>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    strength: 'Silový',
    conditioning: 'Kondiční',
    hiit: 'HIIT',
    cardio: 'Kardio',
    running: 'Běh',
    functional: 'Funkční',
    mobility: 'Mobilita',
    regeneration: 'Regenerace',
    diagnostic: 'Diagnostický',
    other: 'Jiný',
  };
  return labels[type] || type;
}
