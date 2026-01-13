import { XCircle, Clock, TrendingDown, CreditCard, ChevronRight } from 'lucide-react';
import { useCancellationStats } from '@/hooks/useCancellationStats';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CancellationStatsCardProps {
  onClick?: () => void;
}

export function CancellationStatsCard({ onClick }: CancellationStatsCardProps) {
  const { data: stats, isLoading } = useCancellationStats();

  if (isLoading) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalCanceled === 0) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Zrušené tréninky</h3>
            <p className="text-xs text-muted-foreground">Celková statistika</p>
          </div>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Zatím žádné zrušené tréninky</p>
          <p className="text-xs">Skvělá práce!</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (rate: number) => {
    if (rate <= 5) return 'text-success';
    if (rate <= 10) return 'text-warning';
    if (rate <= 20) return 'text-warning';
    return 'text-destructive';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div 
      className={cn(
        "bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 transition-all",
        onClick && "cursor-pointer hover:bg-card/70 hover:border-border hover:shadow-lg group"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Zrušené tréninky</h3>
            <p className="text-xs text-muted-foreground">Celková statistika</p>
          </div>
        </div>
        {onClick && (
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Canceled */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <XCircle className="w-3.5 h-3.5" />
            Celkem zrušeno
          </div>
          <div className="text-xl font-bold">{stats.totalCanceled}</div>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Míra zrušení
          </div>
          <div className={cn("text-xl font-bold", getSeverityColor(stats.cancellationRate))}>
            {stats.cancellationRate.toFixed(1)}%
          </div>
        </div>

        {/* Late Cancellations */}
        <div className="bg-warning/10 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-warning/80 mb-1">
            <Clock className="w-3.5 h-3.5" />
            Pozdní zrušení
          </div>
          <div className="text-xl font-bold text-warning">{stats.lateCancellations}</div>
          <div className="text-xs text-muted-foreground">
            {stats.lateCancellationRate.toFixed(0)}% ze zrušených
          </div>
        </div>

        {/* Credit Deducted */}
        <div className="bg-destructive/10 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-destructive/80 mb-1">
            <CreditCard className="w-3.5 h-3.5" />
            Se stržením
          </div>
          <div className="text-xl font-bold text-destructive">{stats.withCreditDeducted}</div>
          {stats.totalCreditAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalCreditAmount)}
            </div>
          )}
        </div>
      </div>

      {/* Click hint */}
      {onClick && (
        <div className="mt-3 pt-3 border-t border-border/50 text-center">
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Kliknutím zobrazíte podrobnosti
          </span>
        </div>
      )}
    </div>
  );
}
