/**
 * TrainingPrepSection - Merged preparation section
 * Combines: ClientProfilePanel, PreviousFollowupAlert, PreviousTrainingPreview
 * Enhanced with body part tags, training type, and feedback data
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Heart, Target, Bell, FileText, Clock, Dumbbell, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Client } from '@/hooks/useClients';
import { useClientPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';
import { useUnresolvedFollowups, useResolveFollowup, FollowupPriority } from '@/hooks/useTrainingFollowups';
import { useLastTraining } from '@/hooks/useLastTraining';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PreviousTrainingFeedbackCard } from './PreviousTrainingFeedbackCard';
import { TrainingCoachingTip } from './TrainingCoachingTip';

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

// Training type labels for display
const TRAINING_TYPE_LABELS: Record<string, string> = {
  strength: 'Silový',
  cardio: 'Kardio',
  hiit: 'HIIT',
  functional: 'Funkční',
  mobility: 'Mobilita',
  rehab: 'Rehabilitace',
  plyometric: 'Plyometrický',
  endurance: 'Vytrvalostní',
  hypertrophy: 'Hypertrofie',
  power: 'Výbušnost',
};

export function TrainingPrepSection({
  client,
  clientId,
  currentTrainingId,
  trainingDate,
}: TrainingPrepSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showPreviousTraining, setShowPreviousTraining] = useState(false);
  
  // Client profile data
  const { data: preDiagnostic } = useClientPreDiagnostic(clientId);
  const { data: answers = [] } = usePreDiagnosticAnswers(preDiagnostic?.id);
  
  // Followups
  const { data: unresolvedFollowups = [] } = useUnresolvedFollowups(clientId);
  const resolveFollowup = useResolveFollowup();
  
  // Previous training
  const { data: lastTraining, isLoading: isLoadingLastTraining } = useLastTraining(clientId);

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
  const hasPreviousTraining = !isLoadingLastTraining && lastTraining;
  const hasContent = hasAlerts || hasFollowups || mainGoal || hasPreviousTraining;

  if (!hasContent) return null;

  // Get training type label
  const trainingTypeLabel = lastTraining?.training_type 
    ? TRAINING_TYPE_LABELS[lastTraining.training_type] || lastTraining.training_type
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="training-section">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="training-section-title">Příprava na trénink</span>
              {hasAlerts && (
                <Badge variant="destructive" className="text-[10px] px-1.5">
                  {hasAlerts ? '!' : ''}
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
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Upozornění</p>
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
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-warning uppercase tracking-wide">Aktuální bolest</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {painAreas.map((area) => (
                        <Badge key={area} variant="outline" className="text-xs border-warning/50 text-warning">
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

            {/* Previous Training - expandable with enhanced data */}
            {isLoadingLastTraining ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : lastTraining && (
              <Collapsible open={showPreviousTraining} onOpenChange={setShowPreviousTraining}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">Předchozí trénink</span>
                      <span className="text-muted-foreground">
                        • {format(new Date(lastTraining.date), 'd.M.', { locale: cs })}
                      </span>
                      {/* Training Type Badge */}
                      {trainingTypeLabel && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {trainingTypeLabel}
                        </Badge>
                      )}
                    </div>
                    {showPreviousTraining ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2 pl-6 space-y-3">
                    {/* Body Part Tags */}
                    {lastTraining.bodyPartTags && lastTraining.bodyPartTags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Dumbbell className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Partie:</span>
                        <div className="flex flex-wrap gap-1">
                          {lastTraining.bodyPartTags.map((tag) => (
                            <Badge 
                              key={tag.id} 
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{ 
                                borderColor: tag.color,
                                color: tag.color,
                                backgroundColor: `${tag.color}10`
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastTraining.duration} min
                      </span>
                      {lastTraining.rpe && (
                        <span className="flex items-center gap-1">
                          RPE: {lastTraining.rpe}/10
                        </span>
                      )}
                      {lastTraining.subjective_rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {lastTraining.subjective_rating}/10
                        </span>
                      )}
                    </div>

                    {/* Exercises list */}
                    {lastTraining.exercises?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          Cviky ({lastTraining.exercises.length}):
                        </p>
                        {lastTraining.exercises.slice(0, 4).map((ex, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background/50">
                            <span className="font-medium truncate max-w-[60%]">{ex.exercise_name}</span>
                            <span className="text-muted-foreground">
                              {ex.sets?.length || 0}×
                            </span>
                          </div>
                        ))}
                        {lastTraining.exercises.length > 4 && (
                          <p className="text-xs text-muted-foreground px-2">
                            +{lastTraining.exercises.length - 4} dalších
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {lastTraining.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 px-2 italic">
                        {lastTraining.notes}
                      </p>
                    )}

                    {/* Feedback Card - NEW */}
                    {lastTraining.feedback && (
                      <PreviousTrainingFeedbackCard feedback={lastTraining.feedback} />
                    )}

                    {/* Coaching Tips - NEW */}
                    <TrainingCoachingTip lastTraining={lastTraining} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
