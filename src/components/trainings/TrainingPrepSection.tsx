/**
 * TrainingPrepSection - Merged preparation section
 * Combines: ClientProfilePanel, PreviousFollowupAlert, PreviousTrainingPreview
 * Enhanced with body part tags, training type, and feedback data
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Heart, Target, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Client } from '@/hooks/useClients';
import { useClientPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';
import { useUnresolvedFollowups, useResolveFollowup, FollowupPriority } from '@/hooks/useTrainingFollowups';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TrainingPrepSectionProps {
  client: Client | null;
  clientId: string;
  currentTrainingId?: string;
  trainingDate?: string;
}

const priorityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { color: 'text-muted-foreground', bg: 'bg-muted/30' },
};

export function TrainingPrepSection({
  client,
  clientId,
  currentTrainingId,
  trainingDate,
}: TrainingPrepSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Client profile data
  const { data: preDiagnostic } = useClientPreDiagnostic(clientId);
  const { data: answers = [] } = usePreDiagnosticAnswers(preDiagnostic?.id);
  
  // Followups
  const { data: unresolvedFollowups = [] } = useUnresolvedFollowups(clientId);
  const resolveFollowup = useResolveFollowup();
  // Extract client data
  const trainingAlert = preDiagnostic?.trainer_restrictions;
  const painAreas = answers.find(a => a.field_key === 'pain_areas')?.value as string[] | undefined;
  const hasPain = answers.find(a => a.field_key === 'has_pain')?.value === true;
  const mainGoal = answers.find(a => a.field_key === 'main_goal')?.value as string | undefined || 
    (client?.training_goals?.[0] || null);

  // Filter followups for current date
  const today = trainingDate || new Date().toISOString().split('T')[0];
  const filteredFollowups = unresolvedFollowups.filter(followup => {
    if (followup.followup_type === 'measurement' && followup.remind_after_date) {
      return followup.remind_after_date <= today;
    }
    return true;
  });

  const handleResolveFollowup = async (followupId: string) => {
    try {
      await resolveFollowup.mutateAsync({
        followupId,
        clientId,
        resolvedInTrainingId: currentTrainingId,
      });
      toast({ title: 'Připomenutí vyřešeno' });
    } catch {
      toast({ title: 'Chyba', variant: 'destructive' });
    }
  };

  // Check if there's any content to show
  const hasAlerts = trainingAlert || (hasPain && painAreas?.length);
  const hasFollowups = filteredFollowups.length > 0;
  const hasContent = hasAlerts || hasFollowups || mainGoal;

  if (!hasContent) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="training-section-title">Příprava na trénink</span>
              {hasAlerts && (
                <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">
                  !
                </Badge>
              )}
              {hasFollowups && (
                <Badge variant="outline" className="text-[10px] px-1.5 border-warning/50 text-warning">
                  {filteredFollowups.length}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Training Alert - most important */}
            {trainingAlert && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 ring-1 ring-destructive/20 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-destructive uppercase tracking-widest">Upozornění</p>
                    <p className="text-sm text-foreground mt-1">{trainingAlert}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Pain */}
            {hasPain && painAreas && painAreas.length > 0 && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 ring-1 ring-warning/20 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-warning/20">
                    <Heart className="w-4 h-4 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-warning uppercase tracking-widest">Aktuální bolest</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {painAreas.map((area) => (
                        <Badge key={area} variant="outline" className="text-xs border-warning/50 text-warning bg-warning/5">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Goal - compact */}
            {mainGoal && (
              <div className="flex items-center gap-2 px-1">
                <Target className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">Cíl:</span>
                <span className="text-sm font-medium truncate">{mainGoal}</span>
              </div>
            )}

            {/* Followups from previous trainings */}
            {hasFollowups && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Bell className="w-4 h-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase tracking-wide">
                    Z minula ({filteredFollowups.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {filteredFollowups.slice(0, 3).map((followup) => {
                    const prio = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
                    return (
                      <div
                        key={followup.id}
                        className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg', prio.bg)}
                      >
                        <span className="text-sm flex-1 truncate">{followup.content}</span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleResolveFollowup(followup.id)}
                          disabled={resolveFollowup.isPending}
                          className="text-success hover:text-success shrink-0"
                        >
                          ✓
                        </Button>
                      </div>
                    );
                  })}
                  {filteredFollowups.length > 3 && (
                    <p className="text-xs text-muted-foreground px-2">
                      +{filteredFollowups.length - 3} dalších
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
