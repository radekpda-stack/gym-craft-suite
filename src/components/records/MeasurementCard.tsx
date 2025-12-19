import { cn } from '@/lib/utils';
import { Scale, Activity, Droplet, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Measurement } from '@/hooks/useMeasurements';
import { Client } from '@/hooks/useClients';

interface MeasurementCardProps {
  measurement: Measurement;
  client?: Client | null;
  previousMeasurement?: Measurement | null;
  className?: string;
  onClick?: () => void;
}

function WeightChange({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null;
  
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) {
    return (
      <span className="flex items-center text-muted-foreground">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  
  const isGain = diff > 0;
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-xs font-medium',
      isGain ? 'text-warning' : 'text-success'
    )}>
      {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isGain ? '+' : ''}{diff.toFixed(1)}
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
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full text-left glass rounded-xl border-l-4 border-l-muted-foreground/50 transition-all duration-200 hover:glow p-3 sm:p-4',
        className
      )}
    >
      {/* Header: Time, Client Name, Icon */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-muted-foreground tabular-nums shrink-0">
            {format(measurementDate, 'd. M. yyyy', { locale: cs })}
          </span>
          <span className="font-medium text-foreground truncate">
            {client?.name || 'Klient'}
          </span>
        </div>
        <Scale className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      
      {/* Metrics Row */}
      <div className="flex items-center gap-4 mt-2 text-sm">
        {/* Weight */}
        {measurement.weight && (
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold">{measurement.weight} kg</span>
            <WeightChange 
              current={measurement.weight} 
              previous={previousMeasurement?.weight || null} 
            />
          </div>
        )}
        
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
