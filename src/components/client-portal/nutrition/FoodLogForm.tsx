import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Droplets, Coffee, X, Loader2, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  useAddFoodEntry, 
  useAddDrinkEntry, 
  useAddCoffeeEntry,
} from '@/hooks/useClientPortalNutrition';
import { useNutritionXP } from '@/hooks/useNutritionXP';
import { FoodAutocomplete } from './FoodAutocomplete';
import { BREAKFAST_PRESETS, LUNCH_PRESETS, SNACK_PRESETS, FoodPreset } from './QuickFoodPresets';
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

type EntryType = 'food' | 'drink' | 'coffee';

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
  const [activeTab, setActiveTab] = useState<EntryType>('food');
  const [entryDate, setEntryDate] = useState<Date>(initialDate || new Date());
  const [entryTime, setEntryTime] = useState<string>(format(new Date(), 'HH:mm'));
  
  // Food form state
  const [mealType, setMealType] = useState<MealTypeId>(prefilledMealType || 'lunch');
  const [description, setDescription] = useState('');
  const [portionSize, setPortionSize] = useState<PortionSizeId>('medium');
  const [quality, setQuality] = useState<QualityId | undefined>();
  const [satiation, setSatiation] = useState<SatiationId | undefined>();
  const [note, setNote] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showQuantityDetails, setShowQuantityDetails] = useState(false);
  const [grams, setGrams] = useState<string>('');
  const [unitsCount, setUnitsCount] = useState<string>('');
  const [unitsLabel, setUnitsLabel] = useState<string>('');

  // Drink form state
  const [drinkType, setDrinkType] = useState<DrinkTypeId>('water');
  const [drinkAmount, setDrinkAmount] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [drinkName, setDrinkName] = useState<string>('');

  // Coffee form state
  const [coffeeType, setCoffeeType] = useState<CoffeeTypeId>('espresso');
  const [coffeeCount, setCoffeeCount] = useState(1);
  const [isCaffeinated, setIsCaffeinated] = useState(true);
  const [coffeeAmountMl, setCoffeeAmountMl] = useState<number | null>(null);
  const [showCoffeeAmount, setShowCoffeeAmount] = useState(false);
  const [coffeeName, setCoffeeName] = useState<string>('');

  const COFFEE_AMOUNTS = [30, 60, 120, 200, 330];

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

  // Update meal type when prefilled changes and set default time
  useEffect(() => {
    if (prefilledMealType) {
      setMealType(prefilledMealType);
      // Set default time based on meal type
      const timeDefaults: Record<MealTypeId, string> = {
        breakfast: '07:30',
        lunch: '12:30',
        dinner: '18:30',
        snack: format(new Date(), 'HH:mm'),
      };
      setEntryTime(timeDefaults[prefilledMealType] || format(new Date(), 'HH:mm'));
    }
  }, [prefilledMealType]);

  // Get presets based on meal type
  const getCurrentPresets = (): FoodPreset[] => {
    switch (mealType) {
      case 'breakfast':
        return BREAKFAST_PRESETS;
      case 'lunch':
      case 'dinner':
        return LUNCH_PRESETS;
      case 'snack':
        return SNACK_PRESETS;
      default:
        return LUNCH_PRESETS;
    }
  };

  const handleSelectPreset = (preset: FoodPreset) => {
    setDescription(preset.description);
    setPortionSize(preset.portion_size);
  };

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
          entry_time: entryTime,
        },
      });
      toast.success('Záznam přidán');
      
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'food' });
      
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleSubmitDrink = async () => {
    // Validate: if "other" is selected, drink name is required
    if (drinkType === 'other' && !drinkName.trim()) {
      toast.error('Zadej konkrétní název nápoje');
      return;
    }
    
    const finalAmount = showCustomAmount ? parseInt(customAmount) || 300 : drinkAmount;
    
    try {
      await addDrink.mutateAsync({
        sessionId,
        clientId,
        date: entryDate,
        entry: {
          drink_type: drinkType,
          amount_ml: finalAmount,
          drink_name: drinkType === 'other' && drinkName.trim() ? drinkName.trim() : undefined,
          entry_time: entryTime,
        },
      });
      toast.success('Záznam přidán');
      
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'drink' });
      
      setDrinkName('');
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleSubmitCoffee = async () => {
    // Validate: if "other" is selected, coffee name is required
    if (coffeeType === 'other' && !coffeeName.trim()) {
      toast.error('Zadej konkrétní název nápoje');
      return;
    }
    
    try {
      await addCoffee.mutateAsync({
        sessionId,
        clientId,
        date: entryDate,
        entry: {
          coffee_type: coffeeType,
          count: coffeeCount,
          is_caffeinated: isCaffeinated,
          coffee_amount_ml: coffeeAmountMl || undefined,
          coffee_name: coffeeType === 'other' && coffeeName.trim() ? coffeeName.trim() : undefined,
          entry_time: entryTime,
        },
      });
      toast.success('Záznam přidán');
      
      const dateStr = format(entryDate, 'yyyy-MM-dd');
      nutritionXP.mutate({ clientId, date: dateStr, entryType: 'coffee' });
      
      setCoffeeName('');
      onClose?.();
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const renderDateTimePicker = () => (
    <div className="space-y-3 pb-3 border-b mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Datum</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                <Calendar className="mr-2 h-4 w-4 shrink-0" />
                {format(entryDate, 'd.M.yyyy', { locale: cs })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="center" side="bottom" sideOffset={4}>
              <CalendarComponent
                mode="single"
                selected={entryDate}
                onSelect={(date) => date && setEntryDate(date)}
                disabled={isDateDisabled}
                locale={cs}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Time */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Čas konzumace</Label>
          <div className="relative w-full">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="pl-9 h-9 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFoodForm = () => (
    <div className="space-y-4">
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

      {/* Description with Autocomplete */}
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
        
        {/* Quick Presets - prominently visible when no description */}
        {description.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {getCurrentPresets().slice(0, 6).map((preset) => (
              <Button
                key={preset.description}
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleSelectPreset(preset)}
                disabled={isLoading}
              >
                {preset.icon} {preset.description}
              </Button>
            ))}
          </div>
        )}
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
                "flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                portionSize === size.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <span className="text-lg">{size.icon}</span>
              <span className="text-xs font-medium">{size.label}</span>
              <span className={cn(
                "text-[10px]",
                portionSize === size.id 
                  ? "text-primary-foreground/80" 
                  : "text-muted-foreground"
              )}>
                {size.grams}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Optional Details - Collapsible with better label */}
      <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground h-9">
            <div className="flex flex-col items-start">
              <span className="text-xs">📝 Přidat hodnocení (volitelné)</span>
              <span className="text-[10px] text-muted-foreground/70">Kvalita, sytost, poznámka</span>
            </div>
            {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Quality */}
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

          {/* Satiation */}
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

          {/* Note */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Poznámka</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="např. domácí příprava, restaurace..."
            />
          </div>

          {/* Quantity Details */}
          <Collapsible open={showQuantityDetails} onOpenChange={setShowQuantityDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                <span className="text-xs">Přesnější množství</span>
                {showQuantityDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  placeholder="gramů"
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">g</span>
                <span className="text-xs text-muted-foreground">nebo</span>
                <Input
                  type="number"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(e.target.value)}
                  placeholder="počet"
                  className="w-20"
                />
                <Input
                  value={unitsLabel}
                  onChange={(e) => setUnitsLabel(e.target.value)}
                  placeholder="kusů/vajec..."
                  className="flex-1"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit */}
      <Button onClick={handleSubmitFood} disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
      </Button>
    </div>
  );

  const renderDrinkForm = () => (
    <div className="space-y-4">
      {/* Drink Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Typ nápoje</Label>
        <div className="grid grid-cols-5 gap-2">
          {DRINK_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setDrinkType(type.id);
                if (type.id !== 'other') setDrinkName('');
              }}
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

      {/* Submit */}
      <Button onClick={handleSubmitDrink} disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
      </Button>
    </div>
  );

  const renderCoffeeForm = () => (
    <div className="space-y-4">
      {/* Coffee Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Typ</Label>
        <div className="grid grid-cols-5 gap-2">
          {COFFEE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setCoffeeType(type.id);
                if (type.id !== 'other') setCoffeeName('');
              }}
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

      {/* Coffee Name (for "other" type) - required */}
      {coffeeType === 'other' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Jaký nápoj? *</Label>
          <Input
            value={coffeeName}
            onChange={(e) => setCoffeeName(e.target.value)}
            placeholder="např. Matcha, Kakao, Horká čokoláda..."
            maxLength={50}
            required
          />
        </div>
      )}

      {/* Caffeinated Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Coffee className={cn("h-4 w-4", isCaffeinated ? "text-amber-600" : "text-muted-foreground")} />
          <Label className="text-sm font-medium">
            {isCaffeinated ? 'S kofeinem' : 'Bez kofeinu'}
          </Label>
        </div>
        <Switch
          checked={isCaffeinated}
          onCheckedChange={setIsCaffeinated}
        />
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

      {/* Optional Amount */}
      <Collapsible open={showCoffeeAmount} onOpenChange={setShowCoffeeAmount}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground h-9">
            <span className="text-xs">📏 Objem (volitelné)</span>
            {showCoffeeAmount ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="grid grid-cols-6 gap-2">
            {COFFEE_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setCoffeeAmountMl(coffeeAmountMl === amount ? null : amount)}
                className={cn(
                  "p-2 rounded-lg transition-colors text-xs font-medium",
                  coffeeAmountMl === amount 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                {amount}ml
              </button>
            ))}
            <button
              onClick={() => setCoffeeAmountMl(null)}
              className={cn(
                "p-2 rounded-lg transition-colors text-xs",
                coffeeAmountMl === null 
                  ? "bg-muted text-muted-foreground" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              —
            </button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit */}
      <Button onClick={handleSubmitCoffee} disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uložit'}
      </Button>
    </div>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Přidat záznam</CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        {/* Tabs for entry type selection */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntryType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="food" className="gap-1.5">
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Jídlo</span>
            </TabsTrigger>
            <TabsTrigger value="drink" className="gap-1.5">
              <Droplets className="w-4 h-4" />
              <span className="hidden sm:inline">Pití</span>
            </TabsTrigger>
            <TabsTrigger value="coffee" className="gap-1.5">
              <Coffee className="w-4 h-4" />
              <span className="hidden sm:inline">Káva</span>
            </TabsTrigger>
          </TabsList>

          {renderDateTimePicker()}

          <TabsContent value="food" className="mt-0">
            {renderFoodForm()}
          </TabsContent>

          <TabsContent value="drink" className="mt-0">
            {renderDrinkForm()}
          </TabsContent>

          <TabsContent value="coffee" className="mt-0">
            {renderCoffeeForm()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
