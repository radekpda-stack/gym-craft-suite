import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Scale, Stethoscope, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { Diagnostic } from '@/hooks/useDiagnostics';
import { Client } from '@/hooks/useClients';
import { startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';

interface RecordsStatsBarProps {
  measurements: Measurement[];
  diagnostics: Diagnostic[];
  clients: Client[];
  className?: string;
}

interface ClientWeightChange {
  clientId: string;
  clientName: string;
  change: number;
}

function getMonthlyStats(
  measurements: Measurement[],
  diagnostics: Diagnostic[],
  clients: Client[]
) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const isInCurrentMonth = (dateStr: string) => {
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
  };

  const isInLastMonth = (dateStr: string) => {
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
  };

  // Current month counts
  const currentMeasurements = measurements.filter(m => isInCurrentMonth(m.date));
  const currentDiagnostics = diagnostics.filter(d => isInCurrentMonth(d.date));
  
  // Last month counts
  const lastMonthMeasurements = measurements.filter(m => isInLastMonth(m.date));
  const lastMonthDiagnostics = diagnostics.filter(d => isInLastMonth(d.date));

  // Calculate weight changes per client (current month)
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const clientWeightChanges: ClientWeightChange[] = [];
  
  // Group measurements by client
  const measurementsByClient = new Map<string, Measurement[]>();
  currentMeasurements.forEach(m => {
    const existing = measurementsByClient.get(m.client_id) || [];
    existing.push(m);
    measurementsByClient.set(m.client_id, existing);
  });

  // Calculate change for each client
  measurementsByClient.forEach((clientMeasurements, clientId) => {
    if (clientMeasurements.length >= 2) {
      // Sort by date
      const sorted = [...clientMeasurements].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      
      if (first.weight && last.weight) {
        const change = last.weight - first.weight;
        clientWeightChanges.push({
          clientId,
          clientName: clientMap.get(clientId) || 'Neznámý',
          change,
        });
      }
    }
  });

  // Average weight change
  const avgWeightChange = clientWeightChanges.length > 0
    ? clientWeightChanges.reduce((sum, c) => sum + c.change, 0) / clientWeightChanges.length
    : null;

  // Clients needing attention (weight change > 2kg)
  const clientsNeedingAttention = clientWeightChanges.filter(c => Math.abs(c.change) > 2);

  return {
    currentMonth: {
      measurements: currentMeasurements.length,
      diagnostics: currentDiagnostics.length,
    },
    lastMonth: {
      measurements: lastMonthMeasurements.length,
      diagnostics: lastMonthDiagnostics.length,
    },
    avgWeightChange,
    clientsNeedingAttention,
  };
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  change,
  changeLabel,
  variant = 'default',
  onClick,
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number | null;
  changeLabel?: string;
  variant?: 'default' | 'warning' | 'success';
  onClick?: () => void;
}) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-warning/10 border-warning/20',
    success: 'bg-success/10 border-success/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    success: 'text-success',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        variantStyles[variant],
        onClick && 'hover:shadow-md cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <div className={cn('p-2 rounded-md bg-muted/50', iconStyles[variant])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-left min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{value}</span>
          {change !== undefined && change !== null && (
            <span className={cn(
              'text-xs flex items-center gap-0.5',
              change > 0 ? 'text-warning' : change < 0 ? 'text-success' : 'text-muted-foreground'
            )}>
              {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {changeLabel || (change > 0 ? `+${change}` : change)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function RecordsStatsBar({ 
  measurements, 
  diagnostics, 
  clients,
  className 
}: RecordsStatsBarProps) {
  const stats = useMemo(
    () => getMonthlyStats(measurements, diagnostics, clients),
    [measurements, diagnostics, clients]
  );

  const measurementChange = stats.currentMonth.measurements - stats.lastMonth.measurements;
  const diagnosticChange = stats.currentMonth.diagnostics - stats.lastMonth.diagnostics;

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3', className)}>
      <StatCard
        icon={Scale}
        label="Měření tento měsíc"
        value={stats.currentMonth.measurements}
        change={measurementChange !== 0 ? measurementChange : null}
        changeLabel={measurementChange !== 0 ? `${measurementChange > 0 ? '+' : ''}${measurementChange} oproti minulému` : undefined}
      />
      
      <StatCard
        icon={Stethoscope}
        label="Diagnostiky tento měsíc"
        value={stats.currentMonth.diagnostics}
        change={diagnosticChange !== 0 ? diagnosticChange : null}
        changeLabel={diagnosticChange !== 0 ? `${diagnosticChange > 0 ? '+' : ''}${diagnosticChange} oproti minulému` : undefined}
      />
      
      <StatCard
        icon={stats.avgWeightChange !== null && stats.avgWeightChange > 0 ? TrendingUp : TrendingDown}
        label="Průměrná změna váhy"
        value={stats.avgWeightChange !== null ? `${stats.avgWeightChange > 0 ? '+' : ''}${stats.avgWeightChange.toFixed(1)} kg` : '—'}
        variant={stats.avgWeightChange !== null ? (stats.avgWeightChange <= 0 ? 'success' : 'default') : 'default'}
      />
      
      <StatCard
        icon={AlertTriangle}
        label="Vyžadují pozornost"
        value={stats.clientsNeedingAttention.length}
        variant={stats.clientsNeedingAttention.length > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
