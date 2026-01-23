import { useState, useEffect } from 'react';
import { Utensils, Droplets, Coffee, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  useUpdateFoodEntry, 
  useUpdateDrinkEntry, 
  useUpdateCoffeeEntry,
  FoodEntryInput,
  DrinkEntryInput,
  CoffeeEntryInput 
} from '@/hooks/useClientPortalNutrition';

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'food' | 'drink' | 'coffee';
  entry: any;
  sessionId: string;
  clientId: string;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Snídaně', icon: '🌅' },
  { id: 'lunch', label: 'Oběd', icon: '☀️' },
  { id: 'dinner', label: 'Večeře', icon: '🌙' },
  { id: 'snack', label: 'Svačina', icon: '🍎' },
] as const;

const PORTION_SIZES = [
  { id: 'small', label: 'Malá', icon: '🥄' },
  { id: 'medium', label: 'Střední', icon: '🍽️' },
  { id: 'large', label: 'Velká', icon: '🍳' },
] as const;

const DRINK_TYPES = [
  { id: 'water', label: 'Voda', icon: '💧' },
  { id: 'sugary', label: 'Slazené', icon: '🥤' },
  { id: 'sports', label: 'Ionťák', icon: '⚡' },
  { id: 'alcohol', label: 'Alkohol', icon: '🍺' },
  { id: 'other', label: 'Jiné', icon: '🧃' },
] as const;

const COFFEE_TYPES = [
  { id: 'espresso', label: 'Espresso', icon: '☕' },
  { id: 'cappuccino', label: 'Cappuccino', icon: '🥛' },
  { id: 'tea', label: 'Čaj', icon: '🍵' },
  { id: 'energy', label: 'Energy', icon: '⚡' },
  { id: 'other', label: 'Jiné', icon: '🫖' },
] as const;

export function EditEntryDialog({ 
  open, 
  onOpenChange, 
  type, 
  entry, 
  sessionId, 
  clientId 
}: EditEntryDialogProps) {
  // Food form state
  const [mealType, setMealType] = useState<FoodEntryInput['meal_type']>('lunch');
  const [description, setDescription] = useState('');
  const [portionSize, setPortionSize] = useState<FoodEntryInput['portion_size']>('medium');

  // Drink form state
  const [drinkType, setDrinkType] = useState<DrinkEntryInput['drink_type']>('water');
  const [drinkAmount, setDrinkAmount] = useState<number>(300);
  const [drinkName, setDrinkName] = useState<string>('');

  // Coffee form state
  const [coffeeType, setCoffeeType] = useState<CoffeeEntryInput['coffee_type']>('espresso');
  const [coffeeCount, setCoffeeCount] = useState(1);

  const updateFood = useUpdateFoodEntry();
  const updateDrink = useUpdateDrinkEntry();
  const updateCoffee = useUpdateCoffeeEntry();

  const isLoading = updateFood.isPending || updateDrink.isPending || updateCoffee.isPending;

  // Initialize form with entry data
  useEffect(() => {
    if (entry) {
      if (type === 'food') {
        setMealType(entry.meal_type || 'lunch');
        setDescription(entry.description || '');
        setPortionSize(entry.portion_size || 'medium');
      } else if (type === 'drink') {
        setDrinkType(entry.drink_type || 'water');
        setDrinkAmount(entry.amount_ml || 300);
        setDrinkName(entry.drink_name || '');
      } else if (type === 'coffee') {
        setCoffeeType(entry.coffee_type || 'espresso');
        setCoffeeCount(entry.count || 1);
      }
    }
  }, [entry, type]);

  const handleSubmit = async () => {
    try {
      if (type === 'food') {
        if (!description.trim()) {
          toast.error('Vyplň co jsi jedl/a');
          return;
        }
        await updateFood.mutateAsync({
          entryId: entry.id,
          sessionId,
          clientId,
          entry: {
            meal_type: mealType,
            description: description.trim(),
            portion_size: portionSize,
          },
        });
      } else if (type === 'drink') {
        await updateDrink.mutateAsync({
          entryId: entry.id,
          sessionId,
          clientId,
          entry: {
            drink_type: drinkType,
            amount_ml: drinkAmount,
            drink_name: drinkType === 'other' && drinkName.trim() ? drinkName.trim() : undefined,
          },
        });
      } else if (type === 'coffee') {
        await updateCoffee.mutateAsync({
          entryId: entry.id,
          sessionId,
          clientId,
          entry: {
            coffee_type: coffeeType,
            count: coffeeCount,
          },
        });
      }
      
      toast.success('Záznam upraven');
      onOpenChange(false);
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const getTitle = () => {
    if (type === 'food') return 'Upravit jídlo';
    if (type === 'drink') return 'Upravit pití';
    return 'Upravit kávu';
  };

  const getIcon = () => {
    if (type === 'food') return <Utensils className="w-5 h-5 text-warning" />;
    if (type === 'drink') return <Droplets className="w-5 h-5 text-accent" />;
    return <Coffee className="w-5 h-5 text-warning" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {type === 'food' && (
            <>
              {/* Meal Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ jídla</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMealType(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        mealType === t.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Co jsi jedl/a?</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="např. kuřecí prsa, rýže, zelenina"
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Portion Size */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Velikost porce</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PORTION_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setPortionSize(size.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        portionSize === size.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{size.icon}</span>
                      <span>{size.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'drink' && (
            <>
              {/* Drink Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ nápoje</Label>
                <div className="grid grid-cols-5 gap-2">
                  {DRINK_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setDrinkType(t.id);
                        if (t.id !== 'other') setDrinkName('');
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        drinkType === t.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{t.icon}</span>
                      <span className="truncate w-full text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drink Name (for "other" type) */}
              {drinkType === 'other' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Jaký nápoj?</Label>
                  <Input
                    value={drinkName}
                    onChange={(e) => setDrinkName(e.target.value)}
                    placeholder="např. Limonáda, Mléko, Džus..."
                    maxLength={50}
                  />
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Množství (ml)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[200, 300, 500, 750].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDrinkAmount(amount)}
                      className={cn(
                        "p-2 rounded-lg transition-colors text-sm font-medium",
                        drinkAmount === amount 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      {amount} ml
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'coffee' && (
            <>
              {/* Coffee Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COFFEE_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCoffeeType(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        coffeeType === t.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{t.icon}</span>
                      <span className="truncate w-full text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Počet</Label>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCoffeeCount(Math.max(1, coffeeCount - 1))}
                    disabled={coffeeCount <= 1}
                  >
                    -
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center">{coffeeCount}</span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCoffeeCount(coffeeCount + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
              Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
