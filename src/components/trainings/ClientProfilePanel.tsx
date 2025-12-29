import { AlertTriangle, Target, Heart, Briefcase, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useClientPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';

interface ClientProfilePanelProps {
  client: Client;
  compact?: boolean;
}

export function ClientProfilePanel({ client, compact = false }: ClientProfilePanelProps) {
  const { data: preDiagnostic } = useClientPreDiagnostic(client.id);
  const { data: answers = [] } = usePreDiagnosticAnswers(preDiagnostic?.id);
  
  // Get trainer alert from pre-diagnostic
  const trainingAlert = preDiagnostic?.trainer_restrictions;
  
  // Get pain areas from answers
  const painAreas = answers.find(a => a.field_key === 'pain_areas')?.value as string[] | undefined;
  const hasPain = answers.find(a => a.field_key === 'has_pain')?.value === true;
  
  // Get main goal
  const mainGoal = answers.find(a => a.field_key === 'main_goal')?.value as string | undefined || 
    (client.training_goals?.[0] || null);

  // If no relevant data, don't render
  if (!trainingAlert && !hasPain && !mainGoal && !client.health_restrictions) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {trainingAlert && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Upozornění
          </Badge>
        )}
        {hasPain && painAreas && painAreas.length > 0 && (
          <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
            <Heart className="w-3 h-3" />
            Bolest: {painAreas.slice(0, 2).join(', ')}{painAreas.length > 2 ? '...' : ''}
          </Badge>
        )}
        {mainGoal && (
          <Badge variant="secondary" className="gap-1">
            <Target className="w-3 h-3" />
            {mainGoal.slice(0, 30)}{mainGoal.length > 30 ? '...' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
      <h4 className="text-sm font-medium text-muted-foreground">Profil & omezení</h4>
      
      {/* Training Alert - most important */}
      {trainingAlert && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Upozornění</p>
              <p className="text-sm text-foreground mt-1">{trainingAlert}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Pain */}
      {hasPain && painAreas && painAreas.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-2">
            <Heart className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">Aktuální bolest</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {painAreas.map((area) => (
                  <Badge key={area} variant="outline" className="text-xs border-warning/50">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Restrictions */}
      {client.health_restrictions && (
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Zdravotní omezení</p>
          <p className="text-sm">{client.health_restrictions}</p>
        </div>
      )}

      {/* Goal */}
      {mainGoal && (
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm">
            <span className="text-muted-foreground">Cíl:</span> {mainGoal}
          </span>
        </div>
      )}

      {/* Quick stats */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
        {client.occupation && (
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            {client.occupation}
          </span>
        )}
        {client.sitting_hours_daily && (
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {client.sitting_hours_daily}h sezení/den
          </span>
        )}
      </div>
    </div>
  );
}
