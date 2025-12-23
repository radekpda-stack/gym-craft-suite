import { Users, Wallet, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardViewModel } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsInstrumentsProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

interface MetricItemProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: 'default' | 'success' | 'warning' | 'primary';
}

function MetricItem({ icon, value, label, color = 'default' }: MetricItemProps) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    primary: 'text-primary',
  };

  return (
    <div className="metric-card premium-touch stagger-item">
      <div className="text-muted-foreground mb-2">{icon}</div>
      <p className={cn('text-xl font-bold tabular-nums', colorClasses[color])}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}

export function MetricsInstruments({ data, isLoading }: MetricsInstrumentsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { capacity, todayEstimatedIncome, clientsQuickInfo } = data;
  const activeClients = clientsQuickInfo.length;
  const capacityPercent = capacity.total > 0 
    ? Math.round((capacity.completed / capacity.total) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricItem
        icon={<Users className="w-5 h-5" />}
        value={activeClients}
        label="Klientů"
        color="default"
      />
      <MetricItem
        icon={<Target className="w-5 h-5" />}
        value={`${capacity.completed}/${capacity.total}`}
        label="Tréninky"
        color={capacityPercent >= 80 ? 'success' : 'default'}
      />
      <MetricItem
        icon={<Wallet className="w-5 h-5" />}
        value={`${(todayEstimatedIncome / 1000).toFixed(1)}k`}
        label="Příjem dnes"
        color="primary"
      />
      <MetricItem
        icon={<TrendingUp className="w-5 h-5" />}
        value={`${capacityPercent}%`}
        label="Kapacita"
        color={capacityPercent >= 80 ? 'success' : capacityPercent >= 50 ? 'warning' : 'default'}
      />
    </div>
  );
}
