/**
 * NutritionDayCaloriesSummary Component
 * 
 * Displays daily summary of calories intake/expenditure and macros
 * Used in trainer's NutritionClientDetail view
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodEntry {
  id: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ai_enriched?: boolean;
}

interface WorkoutLog {
  id: string;
  calories_burned?: number | null;
}

interface NutritionDayCaloriesSummaryProps {
  foodEntries: FoodEntry[];
  workoutLogs?: WorkoutLog[];
  className?: string;
}

export interface DayNutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  caloriesBurned: number;
  entriesWithData: number;
  totalEntries: number;
  hasData: boolean;
}

export function calculateDayNutrition(
  foodEntries: FoodEntry[], 
  workoutLogs?: WorkoutLog[]
): DayNutritionSummary {
  const entriesWithData = foodEntries.filter(e => e.calories && e.ai_enriched);
  
  return {
    totalCalories: foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
    totalProtein: Math.round(foodEntries.reduce((sum, e) => sum + (Number(e.protein_g) || 0), 0)),
    totalCarbs: Math.round(foodEntries.reduce((sum, e) => sum + (Number(e.carbs_g) || 0), 0)),
    totalFat: Math.round(foodEntries.reduce((sum, e) => sum + (Number(e.fat_g) || 0), 0)),
    caloriesBurned: workoutLogs?.reduce((sum, w) => sum + (w.calories_burned || 0), 0) || 0,
    entriesWithData: entriesWithData.length,
    totalEntries: foodEntries.length,
    hasData: entriesWithData.length > 0,
  };
}

export function NutritionDayCaloriesSummary({
  foodEntries,
  workoutLogs,
  className,
}: NutritionDayCaloriesSummaryProps) {
  const summary = useMemo(() => 
    calculateDayNutrition(foodEntries, workoutLogs),
    [foodEntries, workoutLogs]
  );

  if (!summary.hasData) return null;

  const coverage = Math.round((summary.entriesWithData / summary.totalEntries) * 100);
  const netCalories = summary.totalCalories - summary.caloriesBurned;

  return (
    <Card className={cn("bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Intake */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-medium">🍽️ Příjem:</span>
              <span className="text-sm font-bold">~{summary.totalCalories} kcal</span>
              {coverage < 100 && (
                <span className="text-[10px] text-muted-foreground">
                  ({coverage}% dat)
                </span>
              )}
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalProtein}g B • {summary.totalCarbs}g S • {summary.totalFat}g T
            </p>
          </div>
          
          {/* Expenditure */}
          {summary.caloriesBurned > 0 && (
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm font-medium">Výdej:</span>
                <span className="text-sm font-bold text-orange-600">~{summary.caloriesBurned} kcal</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bilance: <span className={cn(
                  "font-medium",
                  netCalories > 0 ? "text-foreground" : "text-red-500"
                )}>~{netCalories} kcal</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
