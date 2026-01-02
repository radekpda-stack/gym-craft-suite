import { useMemo } from 'react';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Droplets, Utensils, Coffee, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { NutritionFoodEntry, NutritionDrinkEntry, NutritionCoffeeEntry, calculateDrinkMl } from '@/hooks/useNutritionLog';

interface NutritionStatsProps {
  food: NutritionFoodEntry[];
  drinks: NutritionDrinkEntry[];
  coffee: NutritionCoffeeEntry[];
  startDate: string;
  endDate: string;
}

const WATER_GOAL_ML = 2000; // 2 liters daily goal

export function NutritionStats({ food, drinks, coffee, startDate, endDate }: NutritionStatsProps) {
  const stats = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    // Calculate stats per day
    const dailyStats = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayFood = food.filter(f => f.entry_date === dayStr);
      const dayDrinks = drinks.filter(d => d.entry_date === dayStr);
      const dayCoffee = coffee.filter(c => c.entry_date === dayStr);

      const waterMl = dayDrinks
        .filter(d => d.drink_type === 'water')
        .reduce((sum, d) => sum + calculateDrinkMl(d), 0);

      const totalDrinksMl = dayDrinks.reduce((sum, d) => sum + calculateDrinkMl(d), 0);

      return {
        date: day,
        dateStr: dayStr,
        mealCount: dayFood.length,
        waterMl,
        totalDrinksMl,
        coffeeCount: dayCoffee.reduce((sum, c) => sum + c.count, 0),
        hasEntries: dayFood.length > 0 || dayDrinks.length > 0 || dayCoffee.length > 0,
        isPast: day <= today,
      };
    });

    // Aggregate stats
    const daysWithEntries = dailyStats.filter(d => d.hasEntries).length;
    const totalMeals = food.length;
    const totalWaterMl = dailyStats.reduce((sum, d) => sum + d.waterMl, 0);
    const totalCoffee = dailyStats.reduce((sum, d) => sum + d.coffeeCount, 0);
    const avgMealsPerDay = daysWithEntries > 0 ? totalMeals / daysWithEntries : 0;
    const avgWaterPerDay = daysWithEntries > 0 ? totalWaterMl / daysWithEntries : 0;

    // Meal type distribution
    const mealTypes = {
      breakfast: food.filter(f => f.meal_type === 'breakfast').length,
      lunch: food.filter(f => f.meal_type === 'lunch').length,
      dinner: food.filter(f => f.meal_type === 'dinner').length,
      snack: food.filter(f => f.meal_type === 'snack').length,
    };

    // Today's progress
    const todayStats = dailyStats.find(d => isSameDay(d.date, today));
    const todayWaterProgress = todayStats ? Math.min((todayStats.waterMl / WATER_GOAL_ML) * 100, 100) : 0;

    return {
      dailyStats,
      daysWithEntries,
      totalMeals,
      totalWaterMl,
      totalCoffee,
      avgMealsPerDay,
      avgWaterPerDay,
      mealTypes,
      todayStats,
      todayWaterProgress,
    };
  }, [food, drinks, coffee, startDate, endDate]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Utensils className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalMeals}</p>
                <p className="text-xs text-muted-foreground">celkem jídel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats.totalWaterMl / 1000).toFixed(1)}l</p>
                <p className="text-xs text-muted-foreground">vody celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCoffee}</p>
                <p className="text-xs text-muted-foreground">káv/energy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgMealsPerDay.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">jídel/den</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Water Progress */}
      {stats.todayStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Dnešní pitný režim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.todayStats.waterMl} ml</span>
                <span className="text-muted-foreground">{WATER_GOAL_ML} ml cíl</span>
              </div>
              <Progress value={stats.todayWaterProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.todayWaterProgress >= 100 
                  ? '🎉 Cíl splněn!' 
                  : `Zbývá ${WATER_GOAL_ML - stats.todayStats.waterMl} ml`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Přehled po dnech</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {stats.dailyStats.map((day) => (
              <div 
                key={day.dateStr}
                className={`text-center p-2 rounded-lg text-xs ${
                  day.hasEntries 
                    ? 'bg-primary/10 text-primary' 
                    : day.isPast 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="font-medium">{format(day.date, 'EEE', { locale: cs })}</div>
                <div>{format(day.date, 'd.M.')}</div>
                {day.hasEntries && (
                  <div className="mt-1 space-y-0.5">
                    <div className="text-[10px]">🍽️ {day.mealCount}</div>
                    <div className="text-[10px]">💧 {Math.round(day.waterMl / 100)}dl</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meal Type Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rozložení jídel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { key: 'breakfast', label: 'Snídaně', icon: '🌅' },
              { key: 'lunch', label: 'Oběd', icon: '☀️' },
              { key: 'dinner', label: 'Večeře', icon: '🌙' },
              { key: 'snack', label: 'Svačina', icon: '🍎' },
            ].map(({ key, label, icon }) => {
              const count = stats.mealTypes[key as keyof typeof stats.mealTypes];
              const percentage = stats.totalMeals > 0 ? (count / stats.totalMeals) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-6">{icon}</span>
                  <span className="w-20 text-sm">{label}</span>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <span className="w-8 text-sm text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
