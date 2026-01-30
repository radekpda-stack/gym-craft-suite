/**
 * WeeklyNutritionChart Component
 * 
 * Displays a 7-day calorie trend chart with macro breakdown
 * for the client nutrition portal.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodEntry {
  id: string;
  entry_date: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ai_enriched?: boolean;
}

interface WeeklyNutritionChartProps {
  allFoodEntries: FoodEntry[];
  className?: string;
}

interface DayData {
  date: Date;
  dateStr: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
  hasData: boolean;
}

export function WeeklyNutritionChart({
  allFoodEntries,
  className,
}: WeeklyNutritionChartProps) {
  const weekData = useMemo(() => {
    const today = new Date();
    const days: DayData[] = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = allFoodEntries.filter(e => e.entry_date === dateStr && e.ai_enriched);
      
      days.push({
        date,
        dateStr,
        label: format(date, 'EEE', { locale: cs }),
        calories: dayEntries.reduce((sum, e) => sum + (e.calories || 0), 0),
        protein: Math.round(dayEntries.reduce((sum, e) => sum + (Number(e.protein_g) || 0), 0)),
        carbs: Math.round(dayEntries.reduce((sum, e) => sum + (Number(e.carbs_g) || 0), 0)),
        fat: Math.round(dayEntries.reduce((sum, e) => sum + (Number(e.fat_g) || 0), 0)),
        entryCount: dayEntries.length,
        hasData: dayEntries.length > 0,
      });
    }
    
    return days;
  }, [allFoodEntries]);

  const averageCalories = useMemo(() => {
    const daysWithData = weekData.filter(d => d.hasData);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((sum, d) => sum + d.calories, 0) / daysWithData.length);
  }, [weekData]);

  const totalMacros = useMemo(() => {
    const daysWithData = weekData.filter(d => d.hasData);
    return {
      protein: daysWithData.reduce((sum, d) => sum + d.protein, 0),
      carbs: daysWithData.reduce((sum, d) => sum + d.carbs, 0),
      fat: daysWithData.reduce((sum, d) => sum + d.fat, 0),
    };
  }, [weekData]);

  const hasAnyData = weekData.some(d => d.hasData);

  if (!hasAnyData) {
    return null;
  }

  // Calculate macro distribution
  const totalMacroGrams = totalMacros.protein + totalMacros.carbs + totalMacros.fat;
  const proteinPercent = totalMacroGrams > 0 ? Math.round((totalMacros.protein / totalMacroGrams) * 100) : 0;
  const carbsPercent = totalMacroGrams > 0 ? Math.round((totalMacros.carbs / totalMacroGrams) * 100) : 0;
  const fatPercent = totalMacroGrams > 0 ? Math.round((totalMacros.fat / totalMacroGrams) * 100) : 0;

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Týdenní přehled
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>AI odhady</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Average calories */}
        <div className="mb-4 text-center">
          <span className="text-2xl font-bold">Ø {averageCalories}</span>
          <span className="text-sm text-muted-foreground ml-1">kcal/den</span>
        </div>

        {/* Bar Chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} kcal`, 'Kalorie']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar 
                dataKey="calories" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {weekData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.hasData ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                    opacity={entry.hasData ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Macro Distribution */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Rozložení makronutrientů (týden)</p>
          <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-muted">
            <div 
              className="h-full bg-blue-500 rounded-l-full" 
              style={{ width: `${proteinPercent}%` }}
            />
            <div 
              className="h-full bg-amber-500" 
              style={{ width: `${carbsPercent}%` }}
            />
            <div 
              className="h-full bg-rose-500 rounded-r-full" 
              style={{ width: `${fatPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">B: {proteinPercent}%</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">S: {carbsPercent}%</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">T: {fatPercent}%</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
