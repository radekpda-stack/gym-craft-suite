import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FileText, ListOrdered, Dumbbell, Target } from "lucide-react";

export interface ExerciseDetailData {
  name: string;
  description_cs?: string | null;
  instructions_cs?: string | null;
  equipment?: string[] | null;
  muscle_groups?: string[] | null;
}

interface ExerciseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ExerciseDetailData | null;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: "Činka",
  dumbbells: "Jednoručky",
  kettlebell: "Kettlebell",
  bodyweight: "Vlastní váha",
  machine: "Stroj",
  cable: "Kladka",
  bands: "Gumy",
  bench: "Lavice",
  pullup_bar: "Hrazda",
  box: "Bedna",
  rings: "Kruhy",
  trx: "TRX",
  medicine_ball: "Medicinbal",
  slam_ball: "Slam ball",
  foam_roller: "Foam roller",
  rowing_machine: "Veslařský trenažér",
  bike: "Rotoped",
  treadmill: "Běžecký pás",
  skierg: "SkiErg",
  assault_bike: "Assault bike",
};

export function ExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
}: ExerciseDetailSheetProps) {
  if (!exercise) return null;

  const hasDescription = !!exercise.description_cs;
  const hasInstructions = !!exercise.instructions_cs;
  const hasEquipment = exercise.equipment && exercise.equipment.length > 0;
  const hasMuscleGroups = exercise.muscle_groups && exercise.muscle_groups.length > 0;
  const hasAnyContent = hasDescription || hasInstructions || hasEquipment || hasMuscleGroups;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                {exercise.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detail cviku {exercise.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {!hasAnyContent && (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Pro tento cvik zatím nejsou k dispozici podrobnosti.</p>
            </div>
          )}

          {/* Description */}
          {hasDescription && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Popis
              </h3>
              <p className="text-sm leading-relaxed">
                {exercise.description_cs}
              </p>
            </div>
          )}

          {/* Instructions */}
          {hasInstructions && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <ListOrdered className="h-4 w-4" />
                Jak cvičit
              </h3>
              <div className="text-sm leading-relaxed whitespace-pre-line bg-secondary/30 rounded-lg p-3">
                {exercise.instructions_cs}
              </div>
            </div>
          )}

          {/* Equipment */}
          {hasEquipment && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Vybavení
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.equipment!.map((eq) => (
                  <Badge key={eq} variant="secondary" className="text-xs">
                    {EQUIPMENT_LABELS[eq] || eq}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Muscle Groups */}
          {hasMuscleGroups && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Svalové skupiny
              </h3>
              <div className="flex flex-wrap gap-2">
                {exercise.muscle_groups!.map((mg) => (
                  <Badge key={mg} variant="outline" className="text-xs">
                    {mg}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
