import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Scale, 
  Droplet, 
  Activity, 
  Heart, 
  Flame, 
  Target,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Measurement {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  water_percent: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  notes: string | null;
}

interface MeasurementDetailCardProps {
  measurement: Measurement;
  previousMeasurement?: Measurement | null;
  onClose?: () => void;
}

// Helper to get status based on value and range
function getStatus(value: number, min: number, max: number): 'under' | 'normal' | 'over' {
  if (value < min) return 'under';
  if (value > max) return 'over';
  return 'normal';
}

function getStatusColor(status: 'under' | 'normal' | 'over'): string {
  switch (status) {
    case 'under': return 'text-blue-500';
    case 'normal': return 'text-green-500';
    case 'over': return 'text-orange-500';
  }
}

function getStatusLabel(status: 'under' | 'normal' | 'over'): string {
  switch (status) {
    case 'under': return 'Pod normou';
    case 'normal': return 'Normální';
    case 'over': return 'Nad normou';
  }
}

// Progress bar with range indicator
function MetricProgressBar({ 
  label, 
  value, 
  unit, 
  min, 
  max, 
  rangeMin,
  rangeMax,
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  unit: string;
  min: number;
  max: number;
  rangeMin: number;
  rangeMax: number;
  icon: React.ElementType;
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const status = getStatus(value, rangeMin, rangeMax);
  const normalStartPercent = ((rangeMin - min) / (max - min)) * 100;
  const normalEndPercent = ((rangeMax - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{value}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Normal range indicator */}
        <div 
          className="absolute h-full bg-green-500/30"
          style={{ 
            left: `${normalStartPercent}%`, 
            width: `${normalEndPercent - normalStartPercent}%` 
          }}
        />
        {/* Current value indicator */}
        <div 
          className={cn(
            "absolute h-full rounded-full transition-all",
            status === 'normal' ? 'bg-green-500' : status === 'under' ? 'bg-blue-500' : 'bg-orange-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}{unit}</span>
        <Badge variant="outline" className={cn("text-xs", getStatusColor(status))}>
          {getStatusLabel(status)}
        </Badge>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// Simple metric display without progress bar
function SimpleMetric({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  trend,
}: { 
  label: string; 
  value: number | string; 
  unit: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'same';
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
        {trend && (
          trend === 'up' ? <TrendingUp className="w-4 h-4 text-orange-500" /> :
          trend === 'down' ? <TrendingDown className="w-4 h-4 text-green-500" /> :
          <Minus className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function MeasurementDetailCard({ 
  measurement, 
  previousMeasurement,
}: MeasurementDetailCardProps) {
  const measurementDate = parseISO(measurement.date);

  // Calculate trends
  const getWeightTrend = () => {
    if (!previousMeasurement?.weight || !measurement.weight) return undefined;
    const diff = measurement.weight - previousMeasurement.weight;
    if (Math.abs(diff) < 0.1) return 'same';
    return diff > 0 ? 'up' : 'down';
  };

  const getBodyFatTrend = () => {
    if (!previousMeasurement?.body_fat_percentage || !measurement.body_fat_percentage) return undefined;
    const diff = measurement.body_fat_percentage - previousMeasurement.body_fat_percentage;
    if (Math.abs(diff) < 0.1) return 'same';
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Měření těla
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            {format(measurementDate, 'd. MMMM yyyy', { locale: cs })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-6">
        {/* Composition Analysis Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Složení těla
          </h3>
          
          <div className="grid gap-4">
            {/* Weight */}
            {measurement.weight && (
              <SimpleMetric 
                label="Váha"
                value={measurement.weight}
                unit="kg"
                icon={Scale}
                trend={getWeightTrend()}
              />
            )}

            {/* Body Fat */}
            {measurement.body_fat_percentage && (
              <MetricProgressBar
                label="Tělesný tuk"
                value={measurement.body_fat_percentage}
                unit="%"
                min={10}
                max={40}
                rangeMin={18}
                rangeMax={28}
                icon={Droplet}
              />
            )}

            {/* Muscle Mass */}
            {measurement.muscle_mass && (
              <SimpleMetric 
                label="Svalová hmota"
                value={measurement.muscle_mass}
                unit="kg"
                icon={Activity}
              />
            )}

            {/* Visceral Fat */}
            {measurement.visceral_fat && (
              <MetricProgressBar
                label="Viscerální tuk"
                value={measurement.visceral_fat}
                unit=""
                min={1}
                max={20}
                rangeMin={1}
                rangeMax={9}
                icon={Target}
              />
            )}

            {/* Water */}
            {measurement.water_percent && (
              <MetricProgressBar
                label="Voda"
                value={measurement.water_percent}
                unit="%"
                min={30}
                max={60}
                rangeMin={45}
                rangeMax={55}
                icon={Droplet}
              />
            )}
          </div>
        </div>

        {/* Other Metrics Section */}
        {(measurement.bmi || measurement.basal_metabolism) && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Další metriky
            </h3>
            
            <div className="grid gap-3">
              {/* BMI */}
              {measurement.bmi && (
                <MetricProgressBar
                  label="BMI"
                  value={measurement.bmi}
                  unit=""
                  min={15}
                  max={35}
                  rangeMin={18.5}
                  rangeMax={25}
                  icon={Target}
                />
              )}

              {/* Basal Metabolism */}
              {measurement.basal_metabolism && (
                <SimpleMetric 
                  label="Bazální metabolismus"
                  value={Math.round(measurement.basal_metabolism)}
                  unit="kcal/den"
                  icon={Flame}
                />
              )}
            </div>
          </div>
        )}

        {/* Body Circumferences */}
        {(measurement.chest || measurement.waist || measurement.hips) && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Obvody těla
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              {measurement.chest && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Hrudník</p>
                  <p className="text-lg font-bold">{measurement.chest}</p>
                  <p className="text-xs text-muted-foreground">cm</p>
                </div>
              )}
              {measurement.waist && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Pas</p>
                  <p className="text-lg font-bold">{measurement.waist}</p>
                  <p className="text-xs text-muted-foreground">cm</p>
                </div>
              )}
              {measurement.hips && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Boky</p>
                  <p className="text-lg font-bold">{measurement.hips}</p>
                  <p className="text-xs text-muted-foreground">cm</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {measurement.notes && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Poznámky
            </h3>
            <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
              {measurement.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
