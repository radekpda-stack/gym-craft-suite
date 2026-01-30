/**
 * ClientDayNutritionSummary Component
 * 
 * Displays daily calorie and macro summary for the client portal.
 * Shows AI-enriched nutrition data with visual progress bars.
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

interface ClientDayNutritionSummaryProps {
  foodEntries: FoodEntry[];
  className?: string;
}

interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entriesWithData: number;
  totalEntries: number;
  coverage: number;
  hasData: boolean;
}

function calculateNutritionSummary(entries: FoodEntry[]): NutritionSummary {
  const entriesWithData = entries.filter(e => e.calories && e.ai_enriched);
  
  return {
    totalCalories: entries.reduce((sum, e) => sum + (e.calories || 0), 0),
    totalProtein: Math.round(entries.reduce((sum, e) => sum + (Number(e.protein_g) || 0), 0)),
    totalCarbs: Math.round(entries.reduce((sum, e) => sum + (Number(e.carbs_g) || 0), 0)),
    totalFat: Math.round(entries.reduce((sum, e) => sum + (Number(e.fat_g) || 0), 0)),
    entriesWithData: entriesWithData.length,
    totalEntries: entries.length,
    coverage: entries.length > 0 ? Math.round((entriesWithData.length / entries.length) * 100) : 0,
    hasData: entriesWithData.length > 0,
  };
}

// Recommended daily values for visualization (generic values)
const DAILY_TARGETS = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fat: 70,
};

export function ClientDayNutritionSummary({
  foodEntries,
  className,
}: ClientDayNutritionSummaryProps) {
  const summary = useMemo(() => calculateNutritionSummary(foodEntries), [foodEntries]);

  if (!summary.hasData) {
    return null;
  }

  const caloriePercent = Math.min(100, Math.round((summary.totalCalories / DAILY_TARGETS.calories) * 100));
  const proteinPercent = Math.min(100, Math.round((summary.totalProtein / DAILY_TARGETS.protein) * 100));
  const carbsPercent = Math.min(100, Math.round((summary.totalCarbs / DAILY_TARGETS.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((summary.totalFat / DAILY_TARGETS.fat) * 100));

  return (
    <Card className={cn("bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold">Dnešní příjem</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>AI odhad z {summary.entriesWithData}/{summary.totalEntries} jídel</span>
          </div>
        </div>

        {/* Total Calories */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-3xl font-bold text-foreground">~{summary.totalCalories}</span>
            <span className="text-sm text-muted-foreground">kcal</span>
          </div>
          <Progress value={caloriePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{caloriePercent}% z doporučeného denního příjmu</p>
        </div>

        {/* Macros Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Protein */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600">Bílkoviny</span>
              <span className="text-xs text-muted-foreground">{proteinPercent}%</span>
            </div>
            <Progress value={proteinPercent} className="h-1.5 [&>div]:bg-blue-500" />
            <p className="text-sm font-semibold text-center">{summary.totalProtein}g</p>
          </div>

          {/* Carbs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600">Sacharidy</span>
              <span className="text-xs text-muted-foreground">{carbsPercent}%</span>
            </div>
            <Progress value={carbsPercent} className="h-1.5 [&>div]:bg-amber-500" />
            <p className="text-sm font-semibold text-center">{summary.totalCarbs}g</p>
          </div>

          {/* Fat */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-600">Tuky</span>
              <span className="text-xs text-muted-foreground">{fatPercent}%</span>
            </div>
            <Progress value={fatPercent} className="h-1.5 [&>div]:bg-rose-500" />
            <p className="text-sm font-semibold text-center">{summary.totalFat}g</p>
          </div>
        </div>

        {/* Coverage warning */}
        {summary.coverage < 100 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            ℹ️ Pouze {summary.coverage}% jídel má odhad nutrientů
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Export the calculation function for reuse
export { calculateNutritionSummary };
export type { NutritionSummary };
