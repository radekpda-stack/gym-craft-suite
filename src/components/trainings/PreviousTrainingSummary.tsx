/**
 * PreviousTrainingSummary - Collapsible card showing what happened last time
 * Shows header + quick stats by default, exercises/notes expandable.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { History, Clock, Dumbbell, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLastTraining } from '@/hooks/useLastTraining';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { PreviousTrainingFeedbackCard } from './PreviousTrainingFeedbackCard';
import { TrainingCoachingTip } from './TrainingCoachingTip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface PreviousTrainingSummaryProps {
  clientId: string;
}

export function PreviousTrainingSummary({ clientId }: PreviousTrainingSummaryProps) {
  const navigate = useNavigate();
  const { data: lastTraining, isLoading } = useLastTraining(clientId);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!lastTraining) return null;

  const typeLabel = lastTraining.training_type
    ? TRAINING_TYPE_LABELS[lastTraining.training_type] || lastTraining.training_type
    : null;

  const dateStr = format(new Date(lastTraining.date), "EEEE d. MMMM", { locale: cs });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-primary/20 shadow-sm">
        {/* Subtle accent stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />

        <div className="p-4 space-y-3">
          {/* Header row - always visible */}
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <History className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Předchozí trénink</h3>
                  <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/trainings/${lastTraining.id}`);
                  }}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Detail
                </button>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Quick stats row - always visible */}
          <div className="flex flex-wrap items-center gap-2">
            {typeLabel && (
              <Badge variant="secondary" className="text-xs font-medium">
                {typeLabel}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {lastTraining.duration} min
            </span>
            {lastTraining.rpe && (
              <Badge variant="outline" className={cn(
                "text-xs",
                lastTraining.rpe >= 8 ? "border-warning/50 text-warning" : ""
              )}>
                RPE {lastTraining.rpe}/10
              </Badge>
            )}
            {lastTraining.subjective_rating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 text-warning" />
                {lastTraining.subjective_rating}/10
              </span>
            )}
          </div>

          {/* Body part tags - always visible */}
          {lastTraining.bodyPartTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {lastTraining.bodyPartTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    borderColor: tag.color,
                    color: tag.color,
                    backgroundColor: `${tag.color}10`,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Collapsible detail section */}
          <CollapsibleContent>
            <div className="space-y-3 pt-1 border-t border-border/30">
              {/* Exercises - compact list */}
              {lastTraining.exercises.length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2">
                  {lastTraining.exercises.slice(0, 6).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate text-foreground/80 font-medium">{ex.exercise_name}</span>
                      <span className="text-muted-foreground ml-1 shrink-0">
                        {ex.sets?.length || 0}×
                      </span>
                    </div>
                  ))}
                  {lastTraining.exercises.length > 6 && (
                    <span className="text-xs text-muted-foreground col-span-2">
                      +{lastTraining.exercises.length - 6} dalších
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {lastTraining.notes && (
                <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/30 rounded-lg px-2.5 py-1.5">
                  "{lastTraining.notes}"
                </p>
              )}

              {/* Feedback from client */}
              {lastTraining.feedback && (
                <PreviousTrainingFeedbackCard feedback={lastTraining.feedback} />
              )}

              {/* Coaching tip */}
              <TrainingCoachingTip lastTraining={lastTraining} />
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
