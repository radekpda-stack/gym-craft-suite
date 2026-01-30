/**
 * MachineMetricsInput - Dynamic input for machine-specific workout metrics
 * Displays appropriate fields based on workout type (erg, treadmill, jumprope)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { NumericInput } from '@/components/ui/numeric-input';
import { TimeInput } from '@/components/ui/time-input';
import { cn } from '@/lib/utils';

export interface MachineMetrics {
  distance_meters?: number;
  duration_ms?: number;           // Time in milliseconds for precision
  pace_per_500m_ms?: number;      // Pace per 500m in milliseconds
  avg_watts?: number;
  cadence?: number;               // Strokes/min for rowing, steps/min for treadmill
  avg_speed_kmh?: number;
  incline_percent?: number;
  jump_count?: number;
  is_double_unders?: boolean;
}

interface MachineMetricsInputProps {
  workoutType: string;
  metrics: MachineMetrics;
  onChange: (metrics: MachineMetrics) => void;
  className?: string;
}

// Map workout types to machine categories
const getMachineType = (workoutType: string): 'erg' | 'treadmill' | 'jumprope' | null => {
  switch (workoutType) {
    case 'rowing':
    case 'skierg':
      return 'erg';
    case 'treadmill_motor':
    case 'treadmill_curved':
      return 'treadmill';
    case 'jumprope':
      return 'jumprope';
    default:
      return null;
  }
};

export function MachineMetricsInput({ 
  workoutType, 
  metrics, 
  onChange,
  className 
}: MachineMetricsInputProps) {
  const machineType = getMachineType(workoutType);
  
  if (!machineType) return null;

  const updateMetric = <K extends keyof MachineMetrics>(key: K, value: MachineMetrics[K]) => {
    onChange({ ...metrics, [key]: value });
  };

  // Erg machines (Rowing, SkiErg) - meters, time, pace/500m, watts, stroke rate
  if (machineType === 'erg') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="grid grid-cols-2 gap-3">
          {/* Distance (meters) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vzdálenost (m)</Label>
            <NumericInput
              placeholder="2000"
              value={metrics.distance_meters?.toString() || ''}
              onChange={(val) => updateMetric('distance_meters', val ? parseInt(val) : undefined)}
              allowDecimals={false}
              suffix="m"
            />
          </div>
          
          {/* Duration */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Čas</Label>
            <TimeInput
              value={metrics.duration_ms}
              onChange={(ms) => updateMetric('duration_ms', ms ?? undefined)}
              placeholder="8:15.00"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Pace per 500m */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pace/500m</Label>
            <TimeInput
              value={metrics.pace_per_500m_ms}
              onChange={(ms) => updateMetric('pace_per_500m_ms', ms ?? undefined)}
              placeholder="2:04.50"
            />
          </div>
          
          {/* Watts */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Průměr wattů</Label>
            <NumericInput
              placeholder="185"
              value={metrics.avg_watts?.toString() || ''}
              onChange={(val) => updateMetric('avg_watts', val ? parseInt(val) : undefined)}
              allowDecimals={false}
              suffix="W"
            />
          </div>
        </div>
        
        {/* Stroke rate - only for rowing */}
        {workoutType === 'rowing' && (
          <div className="w-1/2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tempo tahů/min</Label>
              <NumericInput
                placeholder="24"
                value={metrics.cadence?.toString() || ''}
                onChange={(val) => updateMetric('cadence', val ? parseInt(val) : undefined)}
                allowDecimals={false}
                suffix="spm"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Treadmill (motor & curved)
  if (machineType === 'treadmill') {
    const isMotorized = workoutType === 'treadmill_motor';
    
    return (
      <div className={cn("space-y-3", className)}>
        <div className="grid grid-cols-2 gap-3">
          {/* Distance (km) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vzdálenost (km)</Label>
            <NumericInput
              placeholder="5.0"
              value={metrics.distance_meters ? (metrics.distance_meters / 1000).toString() : ''}
              onChange={(val) => updateMetric('distance_meters', val ? parseFloat(val) * 1000 : undefined)}
              allowDecimals={true}
              suffix="km"
            />
          </div>
          
          {/* Duration */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Čas</Label>
            <TimeInput
              value={metrics.duration_ms}
              onChange={(ms) => updateMetric('duration_ms', ms ?? undefined)}
              placeholder="30:00"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Speed (km/h) - mainly for motorized */}
          {isMotorized && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rychlost (km/h)</Label>
              <NumericInput
                placeholder="10.0"
                value={metrics.avg_speed_kmh?.toString() || ''}
                onChange={(val) => updateMetric('avg_speed_kmh', val ? parseFloat(val) : undefined)}
                allowDecimals={true}
                suffix="km/h"
              />
            </div>
          )}
          
          {/* Incline (%) */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sklon (%)</Label>
            <NumericInput
              placeholder="2"
              value={metrics.incline_percent?.toString() || ''}
              onChange={(val) => updateMetric('incline_percent', val ? parseFloat(val) : undefined)}
              allowDecimals={true}
              suffix="%"
            />
          </div>
          
          {/* Cadence for curved - steps per minute */}
          {!isMotorized && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Kadence (kroků/min)</Label>
              <NumericInput
                placeholder="160"
                value={metrics.cadence?.toString() || ''}
                onChange={(val) => updateMetric('cadence', val ? parseInt(val) : undefined)}
                allowDecimals={false}
                suffix="spm"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Jump rope
  if (machineType === 'jumprope') {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="grid grid-cols-2 gap-3">
          {/* Duration */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Čas</Label>
            <TimeInput
              value={metrics.duration_ms}
              onChange={(ms) => updateMetric('duration_ms', ms ?? undefined)}
              placeholder="10:00"
            />
          </div>
          
          {/* Jump count */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Počet přeskoků</Label>
            <NumericInput
              placeholder="500"
              value={metrics.jump_count?.toString() || ''}
              onChange={(val) => updateMetric('jump_count', val ? parseInt(val) : undefined)}
              allowDecimals={false}
            />
          </div>
        </div>
        
        {/* Double unders toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="double-unders"
            checked={metrics.is_double_unders || false}
            onCheckedChange={(checked) => updateMetric('is_double_unders', checked === true)}
          />
          <Label 
            htmlFor="double-unders" 
            className="text-sm font-normal cursor-pointer"
          >
            Dvojité přeskoky (double unders)
          </Label>
        </div>
      </div>
    );
  }

  return null;
}

// Helper to format machine metrics for display/notes
export function formatMachineMetrics(workoutType: string, metrics: MachineMetrics): string {
  const parts: string[] = [];
  
  // Format time from ms
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    if (centiseconds > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const machineType = getMachineType(workoutType);
  
  if (machineType === 'erg') {
    if (metrics.distance_meters) parts.push(`${metrics.distance_meters} m`);
    if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
    if (metrics.pace_per_500m_ms) parts.push(`@ ${formatTime(metrics.pace_per_500m_ms)}/500m`);
    if (metrics.avg_watts) parts.push(`${metrics.avg_watts} W`);
    if (metrics.cadence) parts.push(`${metrics.cadence} spm`);
  } else if (machineType === 'treadmill') {
    if (metrics.distance_meters) parts.push(`${(metrics.distance_meters / 1000).toFixed(1)} km`);
    if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
    if (metrics.avg_speed_kmh) parts.push(`${metrics.avg_speed_kmh} km/h`);
    if (metrics.incline_percent) parts.push(`sklon ${metrics.incline_percent}%`);
    if (metrics.cadence) parts.push(`${metrics.cadence} spm`);
  } else if (machineType === 'jumprope') {
    if (metrics.duration_ms) parts.push(formatTime(metrics.duration_ms));
    if (metrics.jump_count) parts.push(`${metrics.jump_count} přeskoků`);
    if (metrics.is_double_unders) parts.push('(double unders)');
  }
  
  return parts.join(' • ');
}

// Check if a workout type has machine metrics
export function hasMachineMetrics(workoutType: string): boolean {
  return getMachineType(workoutType) !== null;
}
