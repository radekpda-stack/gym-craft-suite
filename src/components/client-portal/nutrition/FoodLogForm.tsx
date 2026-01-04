import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Droplets, Coffee, X, Loader2, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  useAddFoodEntry, 
  useAddDrinkEntry, 
  useAddCoffeeEntry,
  FoodEntryInput,
  DrinkEntryInput,
  CoffeeEntryInput 
} from '@/hooks/useClientPortalNutrition';
import { useNutritionXP } from '@/hooks/useNutritionXP';
import {
  MEAL_TYPES,
  PORTION_SIZES,
  QUALITY_OPTIONS,
  SATIATION_OPTIONS,
  DRINK_TYPES,
  DRINK_AMOUNTS,
  COFFEE_TYPES,
  type MealTypeId,
  type PortionSizeId,
  type QualityId,
  type SatiationId,
  type DrinkTypeId,
  type CoffeeTypeId,
} from './constants';

type EntryType = 'food' | 'drink' | 'coffee' | null;

interface FoodLogFormProps {
  sessionId: string;
  clientId: string;
  onClose?: () => void;
  prefilledMealType?: MealTypeId;
  selectedDate?: Date;
  campaignStartDate?: string;
  campaignEndDate?: string;
}

export function FoodLogForm({ 
  sessionId, 
  clientId, 
  onClose, 
  prefilledMealType,
  selectedDate: initialDate,
  campaignStartDate,
  campaignEndDate,
}: FoodLogFormProps) {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [entryType, setEntryType] = useState<EntryType>(null);
  const [entryDate, setEntryDate] = useState<Date>(initialDate || new Date());
  
  // Food form state
  const [mealType, setMealType] = useState<MealTypeId>(prefilledMealType || 'lunch');
  const [description, setDescription] = useState('');
  const [portionSize, setPortionSize] = useState<PortionSizeId>('medium');
  const [quality, setQuality] = useState<QualityId | undefined>();
  const [satiation, setSatiation] = useState<SatiationId | undefined>();
  const [note, setNote] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Drink form state
  const [drinkType, setDrinkType] = useState<DrinkTypeId>('water');
  const [drinkAmount, setDrinkAmount] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  // Coffee form state
  const [coffeeType, setCoffeeType] = useState<CoffeeTypeId>('espresso');
  const [coffeeCount, setCoffeeCount] = useState(1);

  const addFood = useAddFoodEntry();
  const addDrink = useAddDrinkEntry();
  const addCoffee = useAddCoffeeEntry();
  const nutritionXP = useNutritionXP();

  const isLoading = addFood.isPending || addDrink.isPending || addCoffee.isPending;

  // Update date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setEntryDate(initialDate);
    }
  }, [initialDate]);

  // Update meal type when prefilled changes
  useEffect(() => {
    if (prefilledMealType) {
      setMealType(prefilledMealType);
      setEntryType('food');
      setStep('form');
    }
  }, [prefilledMealType]);

  // Date validation for campaign period
  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (date > today) return true;
    
    if (campaignStartDate && campaignEndDate) {
      const start = startOfDay(parseISO(campaignStartDate));
      const end = startOfDay(parseISO(campaignEndDate));
      return !isWithinInterval(startOfDay(date), { start, end });
    }
    return false;
  };

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
        date: entryDate,
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
      
      // Calculate XP for the entry
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'food' });
      
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleSubmitDrink = async () => {
    const finalAmount = showCustomAmount ? parseInt(customAmount) || 300 : drinkAmount;
    
    try {
      await addDrink.mutateAsync({
        sessionId,
        clientId,
        date: entryDate,
        entry: {
          drink_type: drinkType,
          amount_ml: finalAmount,
        },
      });
      toast.success('Záznam přidán');
      
      // Calculate XP for the entry
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'drink' });
      
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
        date: entryDate,
        entry: {
          coffee_type: coffeeType,
          count: coffeeCount,
        },
      });
      toast.success('Záznam přidán');
      
      // Calculate XP for the entry
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'coffee' });
      
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const renderDatePicker = () => (
    <div className="space-y-2 pb-2 border-b mb-4">
      <Label className="text-xs text-muted-foreground">Datum záznamu</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <Calendar className="mr-2 h-4 w-4" />
            {format(entryDate, 'd. MMMM yyyy', { locale: cs })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={entryDate}
            onSelect={(date) => date && setEntryDate(date)}
            disabled={isDateDisabled}
            locale={cs}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {step === 'type' ? 'Přidat záznam' : entryType === 'food' ? 'Jídlo' : entryType === 'drink' ? 'Pití' : 'Káva / Čaj'}
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
              className="space-y-4"
            >
              {renderDatePicker()}
              <div className="grid grid-cols-3 gap-3">
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
                  <span className="text-sm font-medium">Káva/Čaj</span>
                </button>
              </div>
            </motion.div>
          ) : entryType === 'food' ? (
            <motion.div
              key="food-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {renderDatePicker()}
              
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

              {/* Optional Details - Collapsible */}
              <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    <span className="text-xs">Více detailů (volitelné)</span>
                    {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {/* Quality (optional) */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Kvalita jídla</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {QUALITY_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setQuality(quality === option.id ? undefined : option.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                            quality === option.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Satiation (optional) */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Jak jsi se najedl/a?</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {SATIATION_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSatiation(satiation === option.id ? undefined : option.id)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs",
                            satiation === option.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note (optional) */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Poznámka</Label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="např. domácí příprava, restaurace..."
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
              {renderDatePicker()}
              
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
                <div className="grid grid-cols-5 gap-2">
                  {DRINK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setDrinkAmount(amount);
                        setShowCustomAmount(false);
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-colors text-sm font-medium",
                        !showCustomAmount && drinkAmount === amount 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                    >
                      {amount}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomAmount(true)}
                    className={cn(
                      "p-2 rounded-lg transition-colors text-sm font-medium",
                      showCustomAmount 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    Jiné
                  </button>
                </div>
                {showCustomAmount && (
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Zadej množství v ml"
                    min={1}
                    max={5000}
                    className="mt-2"
                  />
                )}
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
              {renderDatePicker()}
              
              {/* Coffee Type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Typ</Label>
                <div className="grid grid-cols-5 gap-2">
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
