import { Badge } from '@/components/ui/badge';
import { useExerciseBodyPartCategories, BODY_PART_LABELS, BODY_PART_COLORS } from '@/hooks/useBodyPartCategories';
import { useExerciseMuscleGroups } from '@/hooks/useExerciseMuscleGroups';
import { useMuscleGroups, REGION_LABELS } from '@/hooks/useMuscleGroups';
import { Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseBodyPartDisplayProps {
  exerciseId: string;
}

export function ExerciseBodyPartDisplay({ exerciseId }: ExerciseBodyPartDisplayProps) {
  const { getExerciseBodyParts, isLoading: loadingBodyParts } = useExerciseBodyPartCategories([exerciseId]);
  const { primaryMuscles, secondaryMuscles, isLoading: loadingMuscles } = useExerciseMuscleGroups(exerciseId);
  const { muscleGroups } = useMuscleGroups();

  const bodyParts = getExerciseBodyParts(exerciseId);
  const isLoading = loadingBodyParts || loadingMuscles;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Načítám...</span>
      </div>
    );
  }

  const hasMuscleGroups = primaryMuscles.length > 0 || secondaryMuscles.length > 0;

  return (
    <div className="space-y-4">
      {/* High-level derived categories */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Zaměření (high-level)</span>
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        
        {bodyParts.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {bodyParts.map(bp => (
              <Badge 
                key={bp} 
                variant="secondary"
                className={cn("text-sm", BODY_PART_COLORS[bp])}
              >
                {BODY_PART_LABELS[bp]}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              (odvozeno z detailních partií)
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Přiřaďte svalové skupiny pro automatické odvození zaměření
          </p>
        )}
      </div>

      {/* Detail muscle groups */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Partie (detail)</span>
        
        {hasMuscleGroups ? (
          <div className="space-y-2">
            {primaryMuscles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-16">Primární:</span>
                {primaryMuscles.map(pm => (
                  <Badge key={pm.id} variant="default" className="text-xs">
                    {pm.muscle_group?.name_cz || pm.muscle_group?.name}
                  </Badge>
                ))}
              </div>
            )}
            {secondaryMuscles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground w-16">Sekundární:</span>
                {secondaryMuscles.map(sm => (
                  <Badge key={sm.id} variant="outline" className="text-xs">
                    {sm.muscle_group?.name_cz || sm.muscle_group?.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Žádné svalové skupiny nepřiřazeny
          </p>
        )}
      </div>
    </div>
  );
}
