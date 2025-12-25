import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Droplets, Coffee, X, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  useAddFoodEntry, 
  useAddDrinkEntry, 
  useAddCoffeeEntry,
  FoodEntryInput,
  DrinkEntryInput,
  CoffeeEntryInput 
} from '@/hooks/useClientPortalNutrition';

type EntryType = 'food' | 'drink' | 'coffee' | null;

interface FoodLogFormProps {
  sessionId: string;
  clientId: string;
  onClose?: () => void;
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
  { id: 'energy', label: 'Energy drink', icon: '⚡' },
  { id: 'other', label: 'Jiné', icon: '🫖' },
] as const;

export function FoodLogForm({ sessionId, clientId, onClose }: FoodLogFormProps) {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [entryType, setEntryType] = useState<EntryType>(null);
  
  // Food form state
  const [mealType, setMealType] = useState<FoodEntryInput['meal_type']>('lunch');
  const [description, setDescription] = useState('');
  const [portionSize, setPortionSize] = useState<FoodEntryInput['portion_size']>('medium');
  const [quality, setQuality] = useState<FoodEntryInput['quality']>();
  const [satiation, setSatiation] = useState<FoodEntryInput['satiation']>();
  const [note, setNote] = useState('');

  // Drink form state
  const [drinkType, setDrinkType] = useState<DrinkEntryInput['drink_type']>('water');
  const [drinkAmount, setDrinkAmount] = useState<number>(300);

  // Coffee form state
  const [coffeeType, setCoffeeType] = useState<CoffeeEntryInput['coffee_type']>('espresso');
  const [coffeeCount, setCoffeeCount] = useState(1);

  const addFood = useAddFoodEntry();
  const addDrink = useAddDrinkEntry();
  const addCoffee = useAddCoffeeEntry();

  const isLoading = addFood.isPending || addDrink.isPending || addCoffee.isPending;

  const handleSelectType = (type: EntryType) => {
    setEntryType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('type');
    setEntryType(null);
  };

  const handleSubmitFood = async () => {
    if (!description.trim()) {
      toast.error('Vyplň co jsi jedl/a');
      return;
    }

    try {
      await addFood.mutateAsync({
        sessionId,
        clientId,
        entry: {
          meal_type: mealType,
          description: description.trim(),
          portion_size: portionSize,
          quality,
          satiation,
          note: note.trim() || undefined,
        },
      });
      toast.success('Záznam přidán');
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleSubmitDrink = async () => {
    try {
      await addDrink.mutateAsync({
        sessionId,
        clientId,
        entry: {
          drink_type: drinkType,
          amount_ml: drinkAmount,
        },
      });
      toast.success('Záznam přidán');
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleSubmitCoffee = async () => {
    try {
      await addCoffee.mutateAsync({
        sessionId,
        clientId,
        entry: {
          coffee_type: coffeeType,
          count: coffeeCount,
        },
      });
      toast.success('Záznam přidán');
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {step === 'type' ? 'Přidat záznam' : entryType === 'food' ? 'Jídlo' : entryType === 'drink' ? 'Pití' : 'Káva'}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <AnimatePresence mode="wait">
          {step === 'type' ? (
            <motion.div
              key="type-select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-3 gap-3"
            >
              <button
                onClick={() => handleSelectType('food')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
              >
                <Utensils className="w-6 h-6 text-orange-500" />
                <span className="text-sm font-medium">Jídlo</span>
              </button>
              <button
                onClick={() => handleSelectType('drink')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
              >
                <Droplets className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium">Pití</span>
              </button>
              <button
                onClick={() => handleSelectType('coffee')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 transition-colors"
              >
                <Coffee className="w-6 h-6 text-amber-600" />
                <span className="text-sm font-medium">Káva</span>
              </button>
            </motion.div>
          ) : entryType === 'food' ? (
            <motion.div
              key="food-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Meal Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ jídla</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setMealType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        mealType === type.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleBack} disabled={isLoading} className="flex-1">
                  Zpět
                </Button>
                <Button onClick={handleSubmitFood} disabled={isLoading} className="flex-1">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
                </Button>
              </div>
            </motion.div>
          ) : entryType === 'drink' ? (
            <motion.div
              key="drink-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Drink Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ nápoje</Label>
                <div className="grid grid-cols-5 gap-2">
                  {DRINK_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setDrinkType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        drinkType === type.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{type.icon}</span>
                      <span className="truncate w-full text-center">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleBack} disabled={isLoading} className="flex-1">
                  Zpět
                </Button>
                <Button onClick={handleSubmitDrink} disabled={isLoading} className="flex-1">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
                </Button>
              </div>
            </motion.div>
          ) : entryType === 'coffee' ? (
            <motion.div
              key="coffee-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Coffee Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ</Label>
                <div className="grid grid-cols-4 gap-2">
                  {COFFEE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setCoffeeType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                        coffeeType === type.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span>{type.icon}</span>
                      <span className="truncate w-full text-center">{type.label}</span>
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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleBack} disabled={isLoading} className="flex-1">
                  Zpět
                </Button>
                <Button onClick={handleSubmitCoffee} disabled={isLoading} className="flex-1">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
