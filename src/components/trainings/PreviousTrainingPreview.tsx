import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronDown, Clock, Dumbbell, Star, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useLastTraining } from "@/hooks/useLastTraining";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PreviousTrainingPreviewProps {
  clientId: string | undefined;
}

export function PreviousTrainingPreview({
  clientId,
}: PreviousTrainingPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: lastTraining, isLoading } = useLastTraining(clientId);

  if (!clientId) return null;

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    );
  }

  if (!lastTraining) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
        <p className="text-sm text-muted-foreground">
          Žádný předchozí trénink nebyl nalezen.
        </p>
      </div>
    );
  }

  const formattedDate = format(new Date(lastTraining.date), "d. MMMM yyyy", {
    locale: cs,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl bg-secondary/30 border border-border/50 overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Předchozí trénink</span>
            <span className="text-muted-foreground">• {formattedDate}</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/30">
            {/* Header with duration, rating and tags */}
            <div className="pt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{lastTraining.duration} min</span>
              </div>

              {lastTraining.subjective_rating && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="w-3.5 h-3.5" />
                  <span>{lastTraining.subjective_rating}/10</span>
                </div>
              )}

              {lastTraining.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lastTraining.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs px-2 py-0"
                      style={{
                        backgroundColor: tag.color ? `${tag.color}20` : undefined,
                        color: tag.color || undefined,
                        borderColor: tag.color ? `${tag.color}40` : undefined,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Exercises list */}
            {lastTraining.exercises.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Cviky ({lastTraining.exercises.length})</span>
                </div>
                <div className="space-y-1.5">
                  {lastTraining.exercises.map((exercise, idx) => {
                    // Calculate summary for this exercise
                    const setsCount = exercise.sets.length;
                    const maxWeight = Math.max(
                      ...exercise.sets.map((s) => s.weight_kg || 0)
                    );
                    const repsRange =
                      exercise.sets.length > 0
                        ? exercise.sets
                            .map((s) => s.reps)
                            .filter((r) => r !== null)
                        : [];
                    const minReps = Math.min(...repsRange.filter(r => r !== undefined) as number[]);
                    const maxReps = Math.max(...repsRange.filter(r => r !== undefined) as number[]);
                    
                    // Check for time-based exercises
                    const hasTime = exercise.sets.some((s) => s.time_seconds);
                    const totalTime = exercise.sets.reduce(
                      (acc, s) => acc + (s.time_seconds || 0),
                      0
                    );

                    return (
                      <div
                        key={`${exercise.exercise_name}-${idx}`}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-background/50 text-sm"
                      >
                        <span className="font-medium truncate max-w-[60%]">
                          {exercise.exercise_name}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {hasTime ? (
                            <>
                              {setsCount}× • {Math.round(totalTime / 60)} min
                            </>
                          ) : maxWeight > 0 ? (
                            <>
                              {setsCount}×
                              {minReps === maxReps
                                ? minReps
                                : `${minReps}-${maxReps}`}{" "}
                              @ {maxWeight} kg
                            </>
                          ) : repsRange.length > 0 ? (
                            <>
                              {setsCount}×
                              {minReps === maxReps
                                ? minReps
                                : `${minReps}-${maxReps}`}{" "}
                              reps
                            </>
                          ) : (
                            <>{setsCount} sérií</>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {lastTraining.notes && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Poznámky:
                </span>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                  {lastTraining.notes}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
