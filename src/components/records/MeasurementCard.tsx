import { cn } from '@/lib/utils';
import { Scale, Activity, Droplet, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Measurement } from '@/hooks/useMeasurements';
import { Client } from '@/hooks/useClients';
import { ClientAvatar } from '@/components/ui/client-avatar';

interface MeasurementCardProps {
  measurement: Measurement;
  client?: Client | null;
  previousMeasurement?: Measurement | null;
  className?: string;
  onClick?: () => void;
}

function getWeightTrend(current: number | null, previous: number | null): {
  diff: number;
  type: 'gain' | 'loss' | 'stable';
  color: string;
  borderColor: string;
} | null {
  if (current === null || previous === null) return null;
  
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) {
    return { diff: 0, type: 'stable', color: 'text-muted-foreground', borderColor: 'border-l-muted-foreground/50' };
  }
  
  if (diff > 0) {
    // Weight gain - orange/warning
    return { diff, type: 'gain', color: 'text-warning', borderColor: 'border-l-warning' };
  }
  
  // Weight loss - green/success
  return { diff, type: 'loss', color: 'text-success', borderColor: 'border-l-success' };
}

function WeightTrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  const trend = getWeightTrend(current, previous);
  if (!trend) return null;
  
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-medium', trend.color)}>
      {trend.type === 'gain' && <TrendingUp className="w-3 h-3" />}
      {trend.type === 'loss' && <TrendingDown className="w-3 h-3" />}
      {trend.type === 'stable' && <Minus className="w-3 h-3" />}
      {trend.type !== 'stable' && (
        <span>{trend.type === 'gain' ? '+' : ''}{trend.diff.toFixed(1)} kg</span>
      )}
    </span>
  );
}

export function MeasurementCard({
  measurement,
  client,
  previousMeasurement,
  className,
  onClick,
}: MeasurementCardProps) {
  const measurementDate = new Date(measurement.date);
  const trend = getWeightTrend(measurement.weight, previousMeasurement?.weight || null);
  const borderColor = trend?.borderColor || 'border-l-muted-foreground/50';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full text-left glass rounded-xl border-l-4 transition-all duration-200 hover:glow p-3 sm:p-4',
        borderColor,
        className
      )}
    >
      {/* Header: Avatar, Client Name, Date, Icon */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ClientAvatar 
            name={client?.name || 'K'} 
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0">
            <span className="font-medium text-foreground truncate block">
              {client?.name || 'Klient'}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {format(measurementDate, 'd. M. yyyy', { locale: cs })}
            </span>
          </div>
        </div>
        <Scale className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      
      {/* Main Weight Value */}
      {measurement.weight && (
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl font-bold text-foreground">
            {measurement.weight}
          </span>
          <span className="text-sm text-muted-foreground">kg</span>
          <WeightTrendBadge 
            current={measurement.weight} 
            previous={previousMeasurement?.weight || null} 
          />
        </div>
      )}
      
      {/* Secondary Metrics Row */}
      <div className="flex items-center gap-4 mt-2 text-sm">
        {/* Body Fat */}
        {measurement.body_fat_percentage && (
          <div className="flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{measurement.body_fat_percentage}% tuku</span>
          </div>
        )}
        
        {/* Muscle Mass */}
        {measurement.muscle_mass && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{measurement.muscle_mass} kg svalů</span>
          </div>
        )}
      </div>
      
      {/* Notes */}
      {measurement.notes && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
          {measurement.notes}
        </p>
      )}
    </button>
  );
}
