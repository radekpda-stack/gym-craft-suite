import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Clock, AlertTriangle } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface CancellationStatsCardProps {
  stats?: AnnualStatsData | null;
}

export function CancellationStatsCard({ stats }: CancellationStatsCardProps) {
  const totalTrainings = stats?.totalTrainings || 0;
  const canceledTrainings = stats?.canceledTrainings || 0;
  const lateCancellations = stats?.lateCancellations || 0;
  
  const cancellationRate = totalTrainings > 0 
    ? ((canceledTrainings / totalTrainings) * 100).toFixed(1) 
    : '0';
  
  const lateCancelRate = canceledTrainings > 0 
    ? ((lateCancellations / canceledTrainings) * 100).toFixed(0) 
    : '0';

  // Determine severity
  const getSeverity = (rate: number) => {
    if (rate < 5) return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Výborné' };
    if (rate < 15) return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Průměrné' };
    return { color: 'text-red-500', bg: 'bg-red-500', label: 'Vysoké' };
  };

  const severity = getSeverity(parseFloat(cancellationRate));

  if (totalTrainings === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            Zrušené tréninky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <XCircle className="h-4 w-4 text-destructive" />
          Zrušené tréninky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main cancellation rate */}
        <div className="text-center pb-2 border-b">
          <div className="flex items-center justify-center gap-2">
            <p className={`text-3xl font-bold ${severity.color}`}>{cancellationRate}%</p>
          </div>
          <p className="text-sm text-muted-foreground">míra zrušení</p>
          <p className="text-xs text-muted-foreground mt-1">{severity.label}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${severity.bg} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(parseFloat(cancellationRate), 100)}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-lg font-semibold">{canceledTrainings}</span>
            </div>
            <p className="text-xs text-muted-foreground">zrušených</p>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-lg font-semibold">{lateCancellations}</span>
            </div>
            <p className="text-xs text-muted-foreground">pozdě zrušených</p>
          </div>
        </div>

        {/* Late cancel warning */}
        {lateCancellations > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">
              {lateCancelRate}% zrušení bylo méně než 24h předem
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
