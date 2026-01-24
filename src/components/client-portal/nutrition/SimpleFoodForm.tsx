import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Clock, Calendar, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAddFoodEntry } from '@/hooks/useClientPortalNutrition';
import { useNutritionXP } from '@/hooks/useNutritionXP';
import { FoodAutocomplete } from './FoodAutocomplete';
import { 
  MEAL_TYPES, 
  PORTION_SIZES,
  TIME_PRESETS,
  type MealTypeId, 
  type PortionSizeId 
} from './constants';

interface SimpleFoodFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  clientId: string;
  selectedDate: Date;
  prefilledMealType?: MealTypeId;
}

export function SimpleFoodForm({
  open,
  onOpenChange,
  sessionId,
  clientId,
  selectedDate,
  prefilledMealType,
}: SimpleFoodFormProps) {
  const addFood = useAddFoodEntry();
  const nutritionXP = useNutritionXP();
  
  const [mealType, setMealType] = useState<MealTypeId>(prefilledMealType || 'lunch');
  const [description, setDescription] = useState('');
  const [portionSize, setPortionSize] = useState<PortionSizeId>('medium');
  const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [note, setNote] = useState('');

  // Reset form when opened with prefilled meal type
  useEffect(() => {
    if (open) {
      if (prefilledMealType) {
        setMealType(prefilledMealType);
      }
      setEntryTime(format(new Date(), 'HH:mm'));
      setDescription('');
      setPortionSize('medium');
      setNote('');
    }
  }, [open, prefilledMealType]);

  const handleTimePreset = (preset: typeof TIME_PRESETS[number]) => {
    if (preset.time === 'now') {
      setEntryTime(format(new Date(), 'HH:mm'));
    } else {
      setEntryTime(preset.time);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Zadej co jsi jedl/a');
      return;
    }

    try {
      await addFood.mutateAsync({
        sessionId,
        clientId,
        date: selectedDate,
        entry: {
          meal_type: mealType,
          description: description.trim(),
          portion_size: portionSize,
          note: note.trim() || undefined,
          entry_time: entryTime,
        },
      });

      toast.success('Jídlo uloženo');
      nutritionXP.mutate({ 
        clientId, 
        date: format(selectedDate, 'yyyy-MM-dd'), 
        entryType: 'food' 
      });
      onOpenChange(false);
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-2xl px-4 pt-4 pb-8 flex flex-col"
      >
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="text-center">Přidat jídlo</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3 min-w-0 overflow-hidden">
            {/* Date - Read Only Display */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Datum
              </Label>
              <div className="h-11 px-3 flex items-center rounded-lg bg-muted/50 text-sm font-medium truncate">
                {format(selectedDate, 'd. MMMM', { locale: cs })}
              </div>
            </div>

            {/* Time Input */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Čas
              </Label>
              <Input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="h-11 text-center text-base font-semibold w-full max-w-full"
              />
            </div>
          </div>

          {/* Time Presets */}
          <div className="flex flex-wrap gap-1.5">
            {TIME_PRESETS.map((preset) => (
              <Button
                key={preset.time}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleTimePreset(preset)}
                className={cn(
                  "h-8 px-2.5 text-xs gap-1 bg-muted/50 hover:bg-muted",
                  entryTime === preset.time && "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </Button>
            ))}
          </div>

          {/* Meal Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Typ jídla</Label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setMealType(type.id)}
                  className={cn(
                    "h-14 flex-col gap-1 bg-muted/30 hover:bg-muted/50 border border-transparent",
                    mealType === type.id && "border-primary bg-primary/10 hover:bg-primary/15"
                  )}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-[11px] font-medium">{type.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Food Description with Autocomplete */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Co jsi jedl/a?</Label>
            <FoodAutocomplete
              value={description}
              onChange={setDescription}
              clientId={clientId}
              onSelectSuggestion={(food) => {
                setDescription(food.description);
                if (food.portion_size) {
                  setPortionSize(food.portion_size as PortionSizeId);
                }
              }}
            />
          </div>

          {/* Portion Size */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Velikost porce</Label>
            <div className="grid grid-cols-3 gap-2">
              {PORTION_SIZES.map((size) => (
                <Button
                  key={size.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setPortionSize(size.id)}
                  className={cn(
                    "h-12 flex-col gap-0.5 bg-muted/30 hover:bg-muted/50 border border-transparent",
                    portionSize === size.id && "border-primary bg-primary/10 hover:bg-primary/15"
                  )}
                >
                  <span className="text-base">{size.icon}</span>
                  <span className="text-xs font-medium">{size.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Note - Optional */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Poznámka (volitelné)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="např. domácí, restaurace, bez omáčky..."
              className="min-h-[60px] resize-none text-sm"
              rows={2}
            />
          </div>
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="pt-4 border-t border-border/50">
          <Button
            onClick={handleSubmit}
            disabled={addFood.isPending || !description.trim()}
            size="lg"
            className="w-full h-12 gap-2 text-base font-semibold"
          >
            {addFood.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Uložit
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
