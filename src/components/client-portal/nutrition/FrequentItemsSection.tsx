/**
 * FrequentItemsSection - Displays frequent foods, water amounts, and coffee types
 * Automatically learns from client's history and provides quick-add functionality
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Droplets, Star, Utensils, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrequentWaterAmounts, useFrequentCoffeeTypes } from '@/hooks/useFrequentNutrition';
import { useMealTemplates } from '@/hooks/useNutritionMealTemplates';
import { QUICK_WATER_AMOUNTS, COFFEE_TYPES, COFFEE_LABELS, type MealTypeId } from './constants';
import { QuickAddFoodDialog } from './QuickAddFoodDialog';

interface FrequentFood {
  description: string;
  meal_type: string;
  portion_size: string;
  use_count?: number;
}

interface FrequentItemsSectionProps {
  clientId: string;
  recentFoods: FrequentFood[];
  onQuickAddFood: (food: FrequentFood, time: string) => Promise<void>;
  onQuickAddWater: (amount: number) => void;
  onQuickAddCoffee: (type: string) => void;
  onOpenMealForm: (mealType: MealTypeId) => void;
  isAdding?: boolean;
}

export function FrequentItemsSection({
  clientId,
  recentFoods,
  onQuickAddFood,
  onQuickAddWater,
  onQuickAddCoffee,
  onOpenMealForm,
  isAdding = false,
}: FrequentItemsSectionProps) {
  const { data: waterData } = useFrequentWaterAmounts(clientId);
  const { data: coffeeData } = useFrequentCoffeeTypes(clientId);
  const { data: mealTemplates = [] } = useMealTemplates(clientId);
  
  // Use meal templates as primary source, fallback to recent foods
  const displayFoods: FrequentFood[] = mealTemplates.length > 0
    ? mealTemplates.slice(0, 6).map(t => ({
        description: t.description,
        meal_type: t.meal_type || 'lunch',
        portion_size: t.portion_size || 'medium',
        use_count: t.use_count,
      }))
    : recentFoods.slice(0, 6);
  
  const [foodDialogOpen, setFoodDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FrequentFood | null>(null);
  const [isSavingFood, setIsSavingFood] = useState(false);

  // Determine water amounts to show
  const waterAmounts = waterData?.hasHistory && waterData.amounts.length > 0
    ? waterData.amounts.map(a => ({
        amount: a.amount,
        label: `${a.amount} ml`,
        icon: a.amount <= 250 ? '💧' : a.amount <= 400 ? '☕' : '🍶',
        isFrequent: a.isTop,
        count: a.count,
      }))
    : QUICK_WATER_AMOUNTS.map(w => ({
        amount: w.amount,
        label: `${w.amount} ml`,
        icon: w.icon,
        isFrequent: false,
        count: 0,
      }));

  // Determine coffee types to show
  const coffeeTypes = coffeeData?.hasHistory && coffeeData.types.length > 0
    ? coffeeData.types.map(c => ({
        id: c.type,
        label: COFFEE_LABELS[c.type] || c.type,
        icon: COFFEE_TYPES.find(ct => ct.id === c.type)?.icon || '☕',
        count: c.count,
      }))
    : [
        { id: 'espresso', label: 'Espresso', icon: '☕', count: 0 },
        { id: 'tea', label: 'Čaj', icon: '🍵', count: 0 },
      ];

  const handleFoodClick = (food: FrequentFood) => {
    haptic('selection');
    setSelectedFood(food);
    setFoodDialogOpen(true);
  };

  const handleFoodConfirm = async (data: {
    description: string;
    meal_type: string;
    portion_size: string;
    entry_time: string;
  }) => {
    setIsSavingFood(true);
    try {
      await onQuickAddFood(
        { 
          description: data.description, 
          meal_type: data.meal_type, 
          portion_size: data.portion_size 
        },
        data.entry_time
      );
      setFoodDialogOpen(false);
      setSelectedFood(null);
    } finally {
      setIsSavingFood(false);
    }
  };

  const handleWaterClick = (amount: number) => {
    haptic('selection');
    onQuickAddWater(amount);
  };

  const handleCoffeeClick = (type: string) => {
    haptic('selection');
    onQuickAddCoffee(type);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-5">
          {/* Quick Meal Buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Utensils className="w-3.5 h-3.5" />
              <span>Přidat jídlo</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'breakfast' as MealTypeId, label: 'Snídaně', icon: '🌅' },
                { id: 'lunch' as MealTypeId, label: 'Oběd', icon: '☀️' },
                { id: 'dinner' as MealTypeId, label: 'Večeře', icon: '🌙' },
                { id: 'snack' as MealTypeId, label: 'Svačina', icon: '🍎' },
              ].map((meal) => (
                <Button
                  key={meal.id}
                  variant="outline"
                  size="lg"
                  onClick={() => onOpenMealForm(meal.id)}
                  className="h-14 flex-col gap-1"
                >
                  <span className="text-lg">{meal.icon}</span>
                  <span className="text-sm font-medium">{meal.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Frequent Foods - from templates or history */}
          {displayFoods.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Tvoje častá jídla</span>
                {mealTemplates.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70 font-normal normal-case">
                    (automaticky se učí)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {displayFoods.map((food, idx) => (
                    <motion.div
                      key={`${food.description}-${idx}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFoodClick(food)}
                        disabled={isAdding}
                        className={cn(
                          "h-auto py-2 px-3 text-xs bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/20",
                          "transition-all duration-200 relative"
                        )}
                      >
                        <Plus className="w-3 h-3 mr-1.5 text-primary" />
                        <span className="truncate max-w-[140px]">{food.description}</span>
                        {food.use_count && food.use_count > 2 && (
                          <span className="ml-1.5 text-[9px] text-amber-600 font-medium">
                            {food.use_count}×
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Water Quick Add */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>Rychle přidat vodu</span>
              {waterData?.hasHistory && (
                <span className="text-[10px] text-muted-foreground/70 font-normal normal-case">
                  (podle tvé historie)
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {waterAmounts.slice(0, 4).map((item, idx) => (
                <motion.div
                  key={item.amount}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => handleWaterClick(item.amount)}
                    disabled={isAdding}
                    className={cn(
                      "w-full h-14 flex-col gap-0.5 relative",
                      item.isFrequent && "ring-2 ring-blue-400/50"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-medium">{item.amount}</span>
                    {item.isFrequent && (
                      <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Coffee/Tea Quick Add */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Káva / Čaj</span>
              {coffeeData?.hasHistory && (
                <span className="text-[10px] text-muted-foreground/70 font-normal normal-case">
                  (podle tvé historie)
                </span>
              )}
            </div>
            <div className={cn(
              "grid gap-2",
              coffeeTypes.length <= 2 ? "grid-cols-2" : coffeeTypes.length === 3 ? "grid-cols-3" : "grid-cols-4"
            )}>
              {coffeeTypes.slice(0, 4).map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => handleCoffeeClick(item.id)}
                    disabled={isAdding}
                    className="w-full h-14 flex-col gap-0.5"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Food Dialog */}
      <QuickAddFoodDialog
        open={foodDialogOpen}
        onOpenChange={setFoodDialogOpen}
        food={selectedFood}
        onConfirm={handleFoodConfirm}
        isPending={isSavingFood}
      />
    </>
  );
}
