/**
 * QuickAddFoodDialog - Dialog for quick-adding a frequent food item
 * Allows user to confirm portion size and time before saving
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { TIME_PRESETS, PORTION_SIZES, PORTION_LABELS, MEAL_LABELS } from './constants';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { motion } from 'framer-motion';

interface FrequentFood {
  description: string;
  meal_type: string;
  portion_size: string;
}

interface QuickAddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: FrequentFood | null;
  onConfirm: (data: {
    description: string;
    meal_type: string;
    portion_size: string;
    entry_time: string;
  }) => Promise<void>;
  isPending?: boolean;
}

export function QuickAddFoodDialog({
  open,
  onOpenChange,
  food,
  onConfirm,
  isPending = false,
}: QuickAddFoodDialogProps) {
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'));
  const [portionSize, setPortionSize] = useState(food?.portion_size || 'medium');

  // Reset state when dialog opens with new food
  useEffect(() => {
    if (open && food) {
      setTime(format(new Date(), 'HH:mm'));
      setPortionSize(food.portion_size || 'medium');
    }
  }, [open, food]);

  const handleConfirm = async () => {
    if (!food) return;
    haptic('medium');
    await onConfirm({
      description: food.description,
      meal_type: food.meal_type,
      portion_size: portionSize,
      entry_time: time,
    });
  };

  const handlePresetClick = (presetTime: string) => {
    haptic('selection');
    if (presetTime === 'now') {
      setTime(format(new Date(), 'HH:mm'));
    } else {
      setTime(presetTime);
    }
  };

  const handlePortionClick = (size: string) => {
    haptic('selection');
    setPortionSize(size);
  };

  if (!food) return null;

  const mealLabel = MEAL_LABELS[food.meal_type] || food.meal_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            Rychle přidat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Food Info */}
          <div className="p-3 bg-muted/50 rounded-xl">
            <p className="font-medium text-base">{food.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{mealLabel}</p>
          </div>

          {/* Portion Size */}
          <div className="space-y-2">
            <Label className="text-sm">📏 Porce</Label>
            <div className="grid grid-cols-3 gap-2">
              {PORTION_SIZES.map((portion) => (
                <motion.div
                  key={portion.id}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    type="button"
                    variant={portionSize === portion.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePortionClick(portion.id)}
                    className={cn(
                      "w-full h-12 flex-col gap-0.5",
                      portionSize === portion.id && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <span>{portion.icon}</span>
                    <span className="text-xs">{portion.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="food-entry-time" className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Čas konzumace
            </Label>
            <div className="relative w-full overflow-hidden">
              <Input
                id="food-entry-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-lg h-12 text-center font-mono w-full max-w-full"
              />
            </div>
          </div>

          {/* Time Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Rychlá volba</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset.time}
                  type="button"
                  variant={time === preset.time || (preset.time === 'now' && time === format(new Date(), 'HH:mm')) ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(preset.time)}
                  className="h-9 text-xs"
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !time}
          >
            {isPending ? 'Ukládám...' : '✓ Přidat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
