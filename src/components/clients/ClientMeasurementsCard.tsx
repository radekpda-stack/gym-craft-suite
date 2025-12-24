import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, TrendingUp, TrendingDown, Minus, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMeasurements } from '@/hooks/useMeasurements';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientMeasurementsCardProps {
  clientId: string;
  defaultOpen?: boolean;
}

export function ClientMeasurementsCard({ clientId, defaultOpen = false }: ClientMeasurementsCardProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: measurements = [], isLoading } = useMeasurements(clientId);

  const lastMeasurement = measurements[0];
  const previousMeasurement = measurements[1];
  
  // Calculate weight trend
  const weightTrend = lastMeasurement && previousMeasurement && 
    lastMeasurement.weight && previousMeasurement.weight
    ? lastMeasurement.weight - previousMeasurement.weight
    : null;

  const totalMeasurements = measurements.length;
  const daysAgo = lastMeasurement 
    ? differenceInDays(new Date(), new Date(lastMeasurement.date))
    : null;

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
        <div className="h-16 bg-secondary/30 rounded" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Ruler className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Měření</p>
              <p className="text-sm text-muted-foreground">
                {totalMeasurements > 0 
                  ? `${totalMeasurements} záznamů • Poslední ${daysAgo === 0 ? 'dnes' : daysAgo === 1 ? 'včera' : `před ${daysAgo} dny`}`
                  : 'Žádná měření'}
              </p>
            </div>
          </div>
          <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 glass rounded-2xl space-y-4">
          {lastMeasurement ? (
            <>
              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Weight */}
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {weightTrend !== null && (
                      weightTrend > 0 ? (
                        <TrendingUp className="w-3 h-3 text-warning" />
                      ) : weightTrend < 0 ? (
                        <TrendingDown className="w-3 h-3 text-success" />
                      ) : (
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      )
                    )}
                    <p className="text-lg font-bold text-foreground">
                      {lastMeasurement.weight?.toFixed(1) || '—'}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Váha (kg)</p>
                  {weightTrend !== null && (
                    <p className={cn(
                      'text-[10px]',
                      weightTrend > 0 ? 'text-warning' : weightTrend < 0 ? 'text-success' : 'text-muted-foreground'
                    )}>
                      {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg
                    </p>
                  )}
                </div>

                {/* Body fat */}
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {lastMeasurement.body_fat_percentage?.toFixed(1) || '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Tuk (%)</p>
                </div>

                {/* Muscle mass */}
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {lastMeasurement.muscle_mass?.toFixed(1) || '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Svaly (kg)</p>
                </div>
              </div>

              {/* Last measurement date */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Poslední měření: {format(new Date(lastMeasurement.date), 'd. MMM yyyy', { locale: cs })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/records/${clientId}?tab=measurements`)}
                >
                  Zobrazit vše
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Body measurements if available */}
              {(lastMeasurement.waist || lastMeasurement.hips || lastMeasurement.chest) && (
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Obvody (cm)</p>
                  <div className="flex gap-4 text-sm">
                    {lastMeasurement.waist && (
                      <div>
                        <span className="text-muted-foreground">Pas:</span>
                        <span className="ml-1 font-medium">{lastMeasurement.waist}</span>
                      </div>
                    )}
                    {lastMeasurement.hips && (
                      <div>
                        <span className="text-muted-foreground">Boky:</span>
                        <span className="ml-1 font-medium">{lastMeasurement.hips}</span>
                      </div>
                    )}
                    {lastMeasurement.chest && (
                      <div>
                        <span className="text-muted-foreground">Hrudník:</span>
                        <span className="ml-1 font-medium">{lastMeasurement.chest}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <Ruler className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Zatím žádná měření</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/records/${clientId}?tab=measurements`)}
              >
                <Plus className="w-4 h-4" />
                Přidat měření
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
