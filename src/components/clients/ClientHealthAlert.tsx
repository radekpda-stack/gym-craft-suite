/**
 * ClientHealthAlert Component
 * 
 * Prominent banner showing active health restrictions/injuries
 */
import { AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientInjuryHistory } from '@/hooks/useClientInjuryHistory';

interface ClientHealthAlertProps {
  clientId: string;
  healthRestrictions?: string | null;
}

export function ClientHealthAlert({ clientId, healthRestrictions }: ClientHealthAlertProps) {
  const { data: injuryData } = useClientInjuryHistory(clientId);

  // Combine health restrictions with active pain from feedback
  const hasHealthRestrictions = !!healthRestrictions && healthRestrictions.trim().length > 0;
  const hasActivePain = injuryData?.activeInjuries?.some(i => i.type === 'feedback_pain') || false;
  const activePainAreas = injuryData?.activeInjuries
    ?.filter(i => i.type === 'feedback_pain')
    .map(i => i.bodyArea)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    || [];

  if (!hasHealthRestrictions && !hasActivePain) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-xl p-3 border',
      hasActivePain 
        ? 'bg-destructive/10 border-destructive/30' 
        : 'bg-warning/10 border-warning/30'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg shrink-0',
          hasActivePain ? 'bg-destructive/20' : 'bg-warning/20'
        )}>
          {hasActivePain ? (
            <ShieldAlert className={cn('w-4 h-4', hasActivePain ? 'text-destructive' : 'text-warning')} />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium text-sm',
            hasActivePain ? 'text-destructive' : 'text-warning'
          )}>
            {hasActivePain ? 'Aktivní bolest' : 'Zdravotní omezení'}
          </p>

          {/* Active pain areas */}
          {activePainAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {activePainAreas.slice(0, 3).map((area, i) => (
                <span 
                  key={i}
                  className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive"
                >
                  {area}
                </span>
              ))}
              {activePainAreas.length > 3 && (
                <span className="text-xs text-destructive">
                  +{activePainAreas.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Health restrictions text */}
          {hasHealthRestrictions && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {healthRestrictions}
            </p>
          )}
        </div>

        {/* Indicator for multiple issues */}
        {hasHealthRestrictions && hasActivePain && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span>2</span>
          </div>
        )}
      </div>
    </div>
  );
}
