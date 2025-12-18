import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { Plus, Utensils, Droplets, Coffee, Check, ChevronLeft, ChevronRight, Globe, Lightbulb, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SessionData {
  id: string;
  client_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface ContainerSizes {
  default_glass_ml: number;
  default_mug_ml: number;
  default_bottle_ml: number;
  default_can_ml: number;
}

interface FoodItem {
  id: string;
  name: string;
  name_normalized: string;
  category?: string;
  default_portion_mode?: string;
  default_grams?: number;
}

interface DrinkItem {
  id: string;
  name: string;
  name_normalized: string;
  drink_type: string;
  default_ml?: number;
}

const DEFAULT_CONTAINER_SIZES: ContainerSizes = {
  default_glass_ml: 250,
  default_mug_ml: 300,
  default_bottle_ml: 500,
  default_can_ml: 330,
};

// Normalize text - remove diacritics for search
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const translations = {
  cs: {
    title: '7denní jídelní log',
    food: 'Jídlo',
    drink: 'Pití',
    coffee: 'Káva',
    addFood: '+ Jídlo',
    addDrink: '+ Pití',
    addCoffee: '+ Káva',
    save: 'Uložit',
    cancel: 'Zrušit',
    time: 'Čas',
    description: 'Co jste jedli?',
    descriptionHelper: 'Popište jídlo, např. "Kuřecí prsa s rýží a zeleninou"',
    portion: 'Velikost porce',
    portionHelper: 'Nemusíte být přesní - stačí odhad',
    grams: 'Gramy',
    portionSize: 'Porce',
    units: 'Kusy',
    small: 'Malá (cca 150g)',
    medium: 'Střední (cca 250g)',
    large: 'Velká (cca 400g)',
    count: 'Počet',
    unit: 'Jednotka',
    note: 'Poznámka',
    noteHelper: 'Volitelné - přidejte poznámku',
    drinkType: 'Typ nápoje',
    amount: 'Množství',
    ml: 'ml',
    container: 'Nádoba',
    containerCount: 'Počet',
    coffeeType: 'Typ kávy',
    sugar: 'Cukr',
    sugarSpoons: 'Lžičky cukru',
    milk: 'Mléko',
    milkAmount: 'Množství mléka',
    milkType: 'Typ mléka',
    noMilk: 'Bez mléka',
    littleMilk: 'Trochu',
    normalMilk: 'Normálně',
    muchMilk: 'Hodně',
    cowMilk: '🥛 Kravské',
    oatMilk: '🌾 Ovesné',
    almondMilk: '🥜 Mandlové',
    soyMilk: '🫘 Sójové',
    coconutMilk: '🥥 Kokosové',
    finishWeek: 'Dokončit týden',
    completed: 'Dokončeno',
    invalidToken: 'Neplatný odkaz',
    expiredSession: 'Tento log již byl dokončen',
    noEntries: 'Zatím žádné záznamy pro tento den',
    pieces: 'ks',
    slices: 'plátky',
    spoons: 'lžíce',
    scoops: 'naběračky',
    other: 'jiné',
    water: 'Voda',
    mineral: 'Minerálka',
    sparkling: 'Perlivá voda',
    cola: 'Cola / Limonáda',
    juice: 'Džus',
    sports: 'Iontový nápoj',
    tea: 'Čaj',
    alcohol: 'Alkohol',
    smoothie: 'Smoothie',
    milkDrink: 'Mléko',
    otherDrink: 'Jiný nápoj',
    // Coffee types - expanded
    smallEspresso: 'Malé espresso',
    largeEspresso: 'Velké espresso / Lungo',
    espresso: 'Espresso',
    lungo: 'Lungo',
    americano: 'Americano',
    cappuccino: 'Cappuccino',
    latte: 'Latte',
    flatWhite: 'Flat white',
    filter: 'Filtrovaná káva',
    instant: 'Instantní káva',
    decaf: 'Bezkofeinová káva',
    otherCoffee: 'Jiná káva',
    // Containers - updated labels
    smallGlass: 'Malá sklenice (250 ml)',
    largeGlass: 'Velká sklenice (500 ml)',
    glass: 'Sklenice (250 ml)',
    mug: 'Hrnek (300 ml)',
    bottle: 'Lahev (500 ml)',
    can: 'Plechovka (330 ml)',
    // Tips
    tipTitle: '💡 Tip',
    tipText: 'Nemusíte být přesní. Stačí odhadnout porci nebo počet kusů. Důležité je zaznamenat vše co jíte a pijete.',
    // Search
    searchPlaceholder: 'Hledejte nebo napište...',
    addNewItem: '+ Přidat novou položku',
    noResults: 'Nic nenalezeno',
    saving: 'Ukládám...',
  },
  en: {
    title: '7-Day Food Log',
    food: 'Food',
    drink: 'Drink',
    coffee: 'Coffee',
    addFood: '+ Food',
    addDrink: '+ Drink',
    addCoffee: '+ Coffee',
    save: 'Save',
    cancel: 'Cancel',
    time: 'Time',
    description: 'What did you eat?',
    descriptionHelper: 'Describe the food, e.g. "Chicken breast with rice and vegetables"',
    portion: 'Portion size',
    portionHelper: 'You don\'t need to be exact - an estimate is fine',
    grams: 'Grams',
    portionSize: 'Portion',
    units: 'Units',
    small: 'Small (~150g)',
    medium: 'Medium (~250g)',
    large: 'Large (~400g)',
    count: 'Count',
    unit: 'Unit',
    note: 'Note',
    noteHelper: 'Optional - add a note',
    drinkType: 'Drink type',
    amount: 'Amount',
    ml: 'ml',
    container: 'Container',
    containerCount: 'Count',
    coffeeType: 'Coffee type',
    sugar: 'Sugar',
    sugarSpoons: 'Sugar spoons',
    milk: 'Milk',
    milkAmount: 'Milk amount',
    milkType: 'Milk type',
    noMilk: 'No milk',
    littleMilk: 'A little',
    normalMilk: 'Normal',
    muchMilk: 'A lot',
    cowMilk: '🥛 Cow milk',
    oatMilk: '🌾 Oat milk',
    almondMilk: '🥜 Almond milk',
    soyMilk: '🫘 Soy milk',
    coconutMilk: '🥥 Coconut milk',
    finishWeek: 'Finish week',
    completed: 'Completed',
    invalidToken: 'Invalid link',
    expiredSession: 'This log has been completed',
    noEntries: 'No entries yet for this day',
    pieces: 'pcs',
    slices: 'slices',
    spoons: 'spoons',
    scoops: 'scoops',
    other: 'other',
    water: 'Water',
    mineral: 'Mineral water',
    sparkling: 'Sparkling water',
    cola: 'Cola / Soda',
    juice: 'Juice',
    sports: 'Sports drink',
    tea: 'Tea',
    alcohol: 'Alcohol',
    smoothie: 'Smoothie',
    milkDrink: 'Milk',
    otherDrink: 'Other drink',
    // Coffee types
    smallEspresso: 'Small espresso',
    largeEspresso: 'Large espresso / Lungo',
    espresso: 'Espresso',
    lungo: 'Lungo',
    americano: 'Americano',
    cappuccino: 'Cappuccino',
    latte: 'Latte',
    flatWhite: 'Flat white',
    filter: 'Filter coffee',
    instant: 'Instant coffee',
    decaf: 'Decaf coffee',
    otherCoffee: 'Other coffee',
    // Containers
    smallGlass: 'Small glass (250 ml)',
    largeGlass: 'Large glass (500 ml)',
    glass: 'Glass (250 ml)',
    mug: 'Mug (300 ml)',
    bottle: 'Bottle (500 ml)',
    can: 'Can (330 ml)',
    // Tips
    tipTitle: '💡 Tip',
    tipText: 'You don\'t need to be exact. Just estimate the portion or count. What matters is logging everything you eat and drink.',
    // Search
    searchPlaceholder: 'Search or type...',
    addNewItem: '+ Add new item',
    noResults: 'Nothing found',
    saving: 'Saving...',
  }
};

type Language = 'cs' | 'en';

export default function PublicNutritionLogPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [language, setLanguage] = useState<Language>('cs');
  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [drinkEntries, setDrinkEntries] = useState<any[]>([]);
  const [coffeeEntries, setCoffeeEntries] = useState<any[]>([]);
  const [containerSizes, setContainerSizes] = useState<ContainerSizes>(DEFAULT_CONTAINER_SIZES);
  const t = translations[language];
  const locale = language === 'cs' ? cs : enUS;

  useEffect(() => {
    if (token) {
      loadSession();
    }
  }, [token]);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-nutrition-log', {
        body: { token }
      });

      if (error) throw error;
      if (!data.session) {
        setError('invalidToken');
        return;
      }
      
      setSession(data.session);
      setFoodEntries(data.food || []);
      setDrinkEntries(data.drinks || []);
      setCoffeeEntries(data.coffee || []);
      setContainerSizes(data.containerSizes || DEFAULT_CONTAINER_SIZES);

      // Set initial day to today if within range
      const start = parseISO(data.session.start_date);
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        if (isSameDay(addDays(start, i), today)) {
          setSelectedDayIndex(i);
          break;
        }
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError('invalidToken');
    } finally {
      setLoading(false);
    }
  };

  const days = useMemo(() => {
    if (!session) return [];
    const start = parseISO(session.start_date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [session]);

  const selectedDate = days[selectedDayIndex];

  const dayEntries = useMemo(() => {
    if (!selectedDate) return { food: [], drinks: [], coffee: [] };
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return {
      food: foodEntries.filter(e => e.entry_date === dateStr),
      drinks: drinkEntries.filter(e => e.entry_date === dateStr),
      coffee: coffeeEntries.filter(e => e.entry_date === dateStr),
    };
  }, [foodEntries, drinkEntries, coffeeEntries, selectedDate]);

  const handleAddEntry = async (type: 'food' | 'drink' | 'coffee', data: any) => {
    if (!session || !selectedDate) return;

    try {
      const { data: result, error } = await supabase.functions.invoke('submit-nutrition-entry', {
        body: {
          token,
          type,
          entry: {
            ...data,
            session_id: session.id,
            client_id: session.client_id,
            entry_date: format(selectedDate, 'yyyy-MM-dd'),
          }
        }
      });

      if (error) throw error;

      // Reload entries
      loadSession();
      toast.success(language === 'cs' ? 'Uloženo' : 'Saved');
    } catch (err: any) {
      console.error('Error adding entry:', err);
      toast.error(language === 'cs' ? 'Nepodařilo se uložit: ' + (err?.message || 'Neznámá chyba') : 'Failed to save: ' + (err?.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Načítám...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium text-destructive">
              {error === 'invalidToken' ? t.invalidToken : t.expiredSession}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">{t.completed}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayNames = language === 'cs' 
    ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold">{t.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(l => l === 'cs' ? 'en' : 'cs')}
          >
            <Globe className="h-5 w-5" />
          </Button>
        </div>

        {/* Day Navigation */}
        <div className="flex items-center justify-between px-2 pb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDayIndex(i => Math.max(0, i - 1))}
            disabled={selectedDayIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-1 overflow-x-auto">
            {days.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              const dayOfWeek = day.getDay();
              const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDayIndex(index)}
                  className={cn(
                    'flex flex-col items-center px-3 py-2 rounded-lg min-w-[50px] transition-colors',
                    selectedDayIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                  )}
                >
                  <span className="text-xs">{dayNames[dayNameIndex]}</span>
                  <span className="text-sm font-medium">{format(day, 'd')}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDayIndex(i => Math.min(6, i + 1))}
            disabled={selectedDayIndex === 6}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Tip Banner */}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3 flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t.tipTitle}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{t.tipText}</p>
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <p className="text-center text-muted-foreground">
            {format(selectedDate, 'EEEE d. MMMM', { locale })}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <FoodDialog onSave={(data) => handleAddEntry('food', data)} t={t} language={language}>
            <Button variant="outline" className="w-full h-16 flex-col gap-1">
              <Utensils className="h-5 w-5" />
              <span className="text-xs">{t.addFood}</span>
            </Button>
          </FoodDialog>

          <DrinkDialog onSave={(data) => handleAddEntry('drink', data)} t={t} containerSizes={containerSizes} language={language}>
            <Button variant="outline" className="w-full h-16 flex-col gap-1">
              <Droplets className="h-5 w-5" />
              <span className="text-xs">{t.addDrink}</span>
            </Button>
          </DrinkDialog>

          <CoffeeDialog onSave={(data) => handleAddEntry('coffee', data)} t={t}>
            <Button variant="outline" className="w-full h-16 flex-col gap-1">
              <Coffee className="h-5 w-5" />
              <span className="text-xs">{t.addCoffee}</span>
            </Button>
          </CoffeeDialog>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {dayEntries.food.length === 0 && dayEntries.drinks.length === 0 && dayEntries.coffee.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t.noEntries}
              </CardContent>
            </Card>
          ) : (
            <>
              {dayEntries.food.map((entry: any) => (
                <EntryCard key={entry.id} type="food" entry={entry} t={t} containerSizes={containerSizes} />
              ))}
              {dayEntries.drinks.map((entry: any) => (
                <EntryCard key={entry.id} type="drink" entry={entry} t={t} containerSizes={containerSizes} />
              ))}
              {dayEntries.coffee.map((entry: any) => (
                <EntryCard key={entry.id} type="coffee" entry={entry} t={t} containerSizes={containerSizes} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ type, entry, t, containerSizes }: { type: string; entry: any; t: typeof translations.cs; containerSizes: ContainerSizes }) {
  const icons = { food: Utensils, drink: Droplets, coffee: Coffee };
  const Icon = icons[type as keyof typeof icons];
  const colors = { food: 'text-orange-500', drink: 'text-blue-500', coffee: 'text-amber-700' };

  const getContainerMl = (containerType: string) => {
    const sizes: Record<string, number> = {
      small_glass: 250,
      large_glass: 500,
      glass: containerSizes.default_glass_ml,
      mug: containerSizes.default_mug_ml,
      bottle: containerSizes.default_bottle_ml,
      can: containerSizes.default_can_ml,
    };
    return sizes[containerType] || 250;
  };

  const getDrinkTypeLabel = (drinkType: string) => {
    const labels: Record<string, keyof typeof t> = {
      water: 'water',
      mineral: 'mineral',
      sparkling: 'sparkling',
      cola: 'cola',
      juice: 'juice',
      sports: 'sports',
      tea: 'tea',
      alcohol: 'alcohol',
      smoothie: 'smoothie',
      milk: 'milkDrink',
      other: 'otherDrink',
    };
    return t[labels[drinkType] as keyof typeof t] || drinkType;
  };

  const getCoffeeTypeLabel = (coffeeType: string) => {
    const labels: Record<string, keyof typeof t> = {
      small_espresso: 'smallEspresso',
      large_espresso: 'largeEspresso',
      espresso: 'espresso',
      lungo: 'lungo',
      americano: 'americano',
      cappuccino: 'cappuccino',
      latte: 'latte',
      flat_white: 'flatWhite',
      filter: 'filter',
      instant: 'instant',
      decaf: 'decaf',
      other: 'otherCoffee',
    };
    return t[labels[coffeeType] as keyof typeof t] || coffeeType;
  };

  const getMilkLabel = (milk: string) => {
    const labels: Record<string, keyof typeof t> = {
      none: 'noMilk',
      little: 'littleMilk',
      normal: 'normalMilk',
      much: 'muchMilk',
      cow: 'cowMilk',
      oat: 'oatMilk',
      almond: 'almondMilk',
      soy: 'soyMilk',
      coconut: 'coconutMilk',
    };
    return t[labels[milk] as keyof typeof t] || milk;
  };

  const getTitle = () => {
    if (type === 'food') return entry.description;
    if (type === 'drink') return `${getDrinkTypeLabel(entry.drink_type)}${entry.drink_name ? ` (${entry.drink_name})` : ''}`;
    if (type === 'coffee') return `${getCoffeeTypeLabel(entry.coffee_type)}${entry.count > 1 ? ` ×${entry.count}` : ''}`;
    return '';
  };

  const getSubtitle = () => {
    if (type === 'food') {
      if (entry.portion_mode === 'grams') return `${entry.grams}g`;
      if (entry.portion_mode === 'portion_size' || entry.portion_mode === 'portion') {
        const sizeLabels: Record<string, keyof typeof t> = { small: 'small', medium: 'medium', large: 'large' };
        return t[sizeLabels[entry.portion_size] as keyof typeof t] || entry.portion_size;
      }
      if (entry.portion_mode === 'units') return `${entry.units_count} ${entry.units_label || t.pieces}`;
    }
    if (type === 'drink') {
      const ml = entry.amount_ml || (entry.amount_container_count * getContainerMl(entry.amount_container_type));
      return `${ml} ml`;
    }
    if (type === 'coffee') {
      const parts = [];
      if (entry.sugar && entry.sugar_spoons > 0) parts.push(`${entry.sugar_spoons}× cukr`);
      if (entry.milk && entry.milk !== 'none') parts.push(getMilkLabel(entry.milk));
      return parts.join(', ') || '-';
    }
    return '';
  };

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full bg-muted', colors[type as keyof typeof colors])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{getTitle()}</p>
            <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
          </div>
          <span className="text-sm text-muted-foreground">{entry.entry_time?.slice(0, 5)}</span>
        </div>
        {entry.note && (
          <p className="text-sm text-muted-foreground mt-2 pl-11">{entry.note}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Food autocomplete search component
function FoodAutocomplete({ 
  value, 
  onChange, 
  onSelectItem,
  placeholder,
  language
}: { 
  value: string; 
  onChange: (val: string) => void;
  onSelectItem?: (item: FoodItem) => void;
  placeholder: string;
  language: Language;
}) {
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchFood = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const normalized = normalizeText(query);
      const { data, error } = await supabase
        .from('nutrition_food_items')
        .select('*')
        .ilike('name_normalized', `%${normalized}%`)
        .order('usage_count', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFood(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, searchFood]);

  const handleAddNew = async () => {
    if (!value.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('nutrition_food_items')
        .insert({
          name: value.trim(),
          name_normalized: normalizeText(value.trim()),
          usage_count: 1
        })
        .select()
        .single();
      
      if (!error && data && onSelectItem) {
        onSelectItem(data);
        toast.success(language === 'cs' ? 'Položka přidána' : 'Item added');
      }
    } catch (err) {
      console.error('Add error:', err);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pl-9"
        />
        {value && (
          <button 
            onClick={() => { onChange(''); setSuggestions([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      
      {showSuggestions && (suggestions.length > 0 || value.length >= 2) && (
        <Card className="absolute z-20 w-full mt-1 max-h-48 overflow-auto">
          <CardContent className="p-1">
            {suggestions.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm"
                onClick={() => {
                  onChange(item.name);
                  onSelectItem?.(item);
                  setShowSuggestions(false);
                }}
              >
                {item.name}
                {item.category && (
                  <span className="text-muted-foreground ml-2">({item.category})</span>
                )}
              </button>
            ))}
            {value.length >= 2 && !suggestions.find(s => normalizeText(s.name) === normalizeText(value)) && (
              <button
                className="w-full text-left px-3 py-2 hover:bg-muted rounded-md text-sm text-primary font-medium"
                onClick={handleAddNew}
              >
                + {language === 'cs' ? `Přidat "${value}"` : `Add "${value}"`}
              </button>
            )}
            {suggestions.length === 0 && value.length >= 2 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {language === 'cs' ? 'Nic nenalezeno' : 'Nothing found'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FoodDialog({ children, onSave, t, language }: { children: React.ReactNode; onSave: (data: any) => void; t: typeof translations.cs; language: Language }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<string>('lunch');
  const [portionMode, setPortionMode] = useState<'grams' | 'portion_size' | 'units' | 'hand'>('portion_size');
  const [grams, setGrams] = useState('');
  const [portionSize, setPortionSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [portionEstimate, setPortionEstimate] = useState<'palm' | 'fist' | 'handful' | 'thumb'>('fist');
  const [unitsCount, setUnitsCount] = useState('1');
  const [unitsLabel, setUnitsLabel] = useState('ks');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error(language === 'cs' ? 'Vyplňte popis jídla' : 'Please enter food description');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        entry_time: time,
        description,
        meal_type: mealType,
        portion_mode: portionMode === 'hand' ? 'portion_size' : portionMode,
        grams: portionMode === 'grams' ? parseInt(grams) || null : null,
        portion_size: portionMode === 'portion_size' ? portionSize : null,
        portion_estimate: portionMode === 'hand' ? portionEstimate : null,
        units_count: portionMode === 'units' ? parseFloat(unitsCount) || null : null,
        units_label: portionMode === 'units' ? unitsLabel : null,
        note: note || null,
      });

      setDescription('');
      setNote('');
      setGrams('');
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectFood = (item: FoodItem) => {
    setDescription(item.name);
    if (item.default_portion_mode) {
      setPortionMode(item.default_portion_mode as any);
    }
    if (item.default_grams) {
      setGrams(String(item.default_grams));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            {t.food}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t.time}</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label>{t.mealType}</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">🌅 {t.breakfast}</SelectItem>
                  <SelectItem value="snack_am">🍎 {t.snackAm}</SelectItem>
                  <SelectItem value="lunch">🍽️ {t.lunch}</SelectItem>
                  <SelectItem value="snack_pm">🥪 {t.snackPm}</SelectItem>
                  <SelectItem value="dinner">🌙 {t.dinner}</SelectItem>
                  <SelectItem value="snack">🍿 {t.snack}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t.description}</Label>
            <FoodAutocomplete
              value={description}
              onChange={setDescription}
              onSelectItem={handleSelectFood}
              placeholder={t.searchPlaceholder}
              language={language}
            />
            <p className="text-xs text-muted-foreground mt-1">{t.descriptionHelper}</p>
          </div>

          <div>
            <Label>{t.portion}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t.portionHelper}</p>
            <RadioGroup value={portionMode} onValueChange={(v: any) => setPortionMode(v)} className="flex flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portion_size" id="portion_size" />
                <Label htmlFor="portion_size" className="font-normal">{t.sizeEstimate}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hand" id="hand" />
                <Label htmlFor="hand" className="font-normal">{t.handEstimate}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grams" id="grams" />
                <Label htmlFor="grams" className="font-normal">{t.grams}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="units" id="units" />
                <Label htmlFor="units" className="font-normal">{t.units}</Label>
              </div>
            </RadioGroup>
          </div>

          {portionMode === 'grams' && (
            <div>
              <Label>{t.grams}</Label>
              <Input type="number" value={grams} onChange={e => setGrams(e.target.value)} placeholder="150" />
            </div>
          )}

          {portionMode === 'portion_size' && (
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={portionSize === size ? 'default' : 'outline'}
                  className="h-auto py-3 flex-col"
                  onClick={() => setPortionSize(size)}
                >
                  <span className="text-lg">{size === 'small' ? '🍽️' : size === 'medium' ? '🍲' : '🥘'}</span>
                  <span className="text-xs">{t[size]}</span>
                </Button>
              ))}
            </div>
          )}

          {portionMode === 'hand' && (
            <div className="grid grid-cols-2 gap-2">
              {(['palm', 'fist', 'handful', 'thumb'] as const).map((est) => (
                <Button
                  key={est}
                  type="button"
                  variant={portionEstimate === est ? 'default' : 'outline'}
                  className="h-auto py-2 text-left justify-start"
                  onClick={() => setPortionEstimate(est)}
                >
                  <span className="text-sm">{t[est]}</span>
                </Button>
              ))}
            </div>
          )}

          {portionMode === 'units' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.count}</Label>
                <Input type="number" value={unitsCount} onChange={e => setUnitsCount(e.target.value)} />
              </div>
              <div>
                <Label>{t.unit}</Label>
                <Select value={unitsLabel} onValueChange={setUnitsLabel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ks">{t.pieces}</SelectItem>
                    <SelectItem value="plátky">{t.slices}</SelectItem>
                    <SelectItem value="lžíce">{t.spoons}</SelectItem>
                    <SelectItem value="naběračky">{t.scoops}</SelectItem>
                    <SelectItem value="jiné">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>{t.note}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t.noteHelper} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </Button>
          </div>
        </div>

          {portionMode === 'grams' && (
            <div>
              <Label>{t.grams}</Label>
              <Input type="number" value={grams} onChange={e => setGrams(e.target.value)} placeholder="150" />
            </div>
          )}

          {portionMode === 'portion_size' && (
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={portionSize === size ? 'default' : 'outline'}
                  className="h-auto py-3 flex-col"
                  onClick={() => setPortionSize(size)}
                >
                  <span className="text-lg">{size === 'small' ? '🍽️' : size === 'medium' ? '🍲' : '🥘'}</span>
                  <span className="text-xs">{t[size]}</span>
                </Button>
              ))}
            </div>
          )}

          {portionMode === 'units' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.count}</Label>
                <Input type="number" value={unitsCount} onChange={e => setUnitsCount(e.target.value)} />
              </div>
              <div>
                <Label>{t.unit}</Label>
                <Select value={unitsLabel} onValueChange={setUnitsLabel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ks">{t.pieces}</SelectItem>
                    <SelectItem value="plátky">{t.slices}</SelectItem>
                    <SelectItem value="lžíce">{t.spoons}</SelectItem>
                    <SelectItem value="naběračky">{t.scoops}</SelectItem>
                    <SelectItem value="jiné">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>{t.note}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t.noteHelper} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DrinkDialog({ children, onSave, t, containerSizes, language }: { children: React.ReactNode; onSave: (data: any) => void; t: typeof translations.cs; containerSizes: ContainerSizes; language: Language }) {
  const [open, setOpen] = useState(false);
  const [drinkType, setDrinkType] = useState('water');
  const [drinkName, setDrinkName] = useState('');
  const [amountMode, setAmountMode] = useState<'ml' | 'container'>('container');
  const [amountMl, setAmountMl] = useState('');
  const [containerType, setContainerType] = useState('small_glass');
  const [containerCount, setContainerCount] = useState('1');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);

  const getContainerMl = (type: string) => {
    const sizes: Record<string, number> = {
      small_glass: 250,
      large_glass: 500,
      glass: containerSizes.default_glass_ml,
      mug: containerSizes.default_mug_ml,
      bottle: containerSizes.default_bottle_ml,
      can: containerSizes.default_can_ml,
    };
    return sizes[type] || 250;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        entry_time: time,
        drink_type: drinkType,
        drink_name: drinkName || null,
        amount_ml: amountMode === 'ml' ? parseInt(amountMl) || null : Math.round(parseFloat(containerCount) * getContainerMl(containerType)),
        amount_container_type: amountMode === 'container' ? containerType : null,
        amount_container_count: amountMode === 'container' ? parseFloat(containerCount) || null : null,
        note: note || null,
      });

      setDrinkName('');
      setNote('');
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            {t.drink}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t.time}</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>

          <div>
            <Label>{t.drinkType}</Label>
            <Select value={drinkType} onValueChange={setDrinkType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="water">💧 {t.water}</SelectItem>
                <SelectItem value="sparkling">🫧 {t.sparkling}</SelectItem>
                <SelectItem value="mineral">💦 {t.mineral}</SelectItem>
                <SelectItem value="tea">🍵 {t.tea}</SelectItem>
                <SelectItem value="juice">🧃 {t.juice}</SelectItem>
                <SelectItem value="cola">🥤 {t.cola}</SelectItem>
                <SelectItem value="sports">⚡ {t.sports}</SelectItem>
                <SelectItem value="smoothie">🥤 {t.smoothie}</SelectItem>
                <SelectItem value="milk">🥛 {t.milkDrink}</SelectItem>
                <SelectItem value="alcohol">🍺 {t.alcohol}</SelectItem>
                <SelectItem value="other">📝 {t.otherDrink}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {drinkType === 'other' && (
            <div>
              <Label>{language === 'cs' ? 'Název nápoje' : 'Drink name'}</Label>
              <Input value={drinkName} onChange={e => setDrinkName(e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t.amount}</Label>
            <RadioGroup value={amountMode} onValueChange={(v: any) => setAmountMode(v)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="container" id="container" />
                <Label htmlFor="container" className="font-normal">{t.container}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ml" id="ml" />
                <Label htmlFor="ml" className="font-normal">{t.ml}</Label>
              </div>
            </RadioGroup>
          </div>

          {amountMode === 'ml' ? (
            <div>
              <Label>{t.ml}</Label>
              <Input type="number" value={amountMl} onChange={e => setAmountMl(e.target.value)} placeholder="250" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.container}</Label>
                <Select value={containerType} onValueChange={setContainerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small_glass">{t.smallGlass}</SelectItem>
                    <SelectItem value="large_glass">{t.largeGlass}</SelectItem>
                    <SelectItem value="mug">{t.mug}</SelectItem>
                    <SelectItem value="bottle">{t.bottle}</SelectItem>
                    <SelectItem value="can">{t.can}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.containerCount}</Label>
                <Input type="number" step="0.5" value={containerCount} onChange={e => setContainerCount(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>{t.note}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t.noteHelper} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoffeeDialog({ children, onSave, t }: { children: React.ReactNode; onSave: (data: any) => void; t: typeof translations.cs }) {
  const [open, setOpen] = useState(false);
  const [coffeeType, setCoffeeType] = useState('espresso');
  const [count, setCount] = useState('1');
  const [sugar, setSugar] = useState(false);
  const [sugarSpoons, setSugarSpoons] = useState('1');
  const [milkAmount, setMilkAmount] = useState<'none' | 'little' | 'normal' | 'much'>('none');
  const [milkType, setMilkType] = useState<'cow' | 'oat' | 'almond' | 'soy' | 'coconut'>('cow');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Send milk as the amount or type depending on selection
      const milkValue = milkAmount === 'none' ? 'none' : milkAmount;
      
      await onSave({
        entry_time: time,
        coffee_type: coffeeType,
        count: parseInt(count) || 1,
        sugar,
        sugar_spoons: sugar ? parseInt(sugarSpoons) || 0 : 0,
        milk: milkValue,
        milk_type: milkAmount !== 'none' ? milkType : null,
        note: note || null,
      });

      setNote('');
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            {t.coffee}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t.time}</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label>{t.count}</Label>
              <Input type="number" value={count} onChange={e => setCount(e.target.value)} min="1" />
            </div>
          </div>

          <div>
            <Label>{t.coffeeType}</Label>
            <Select value={coffeeType} onValueChange={setCoffeeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small_espresso">☕ {t.smallEspresso}</SelectItem>
                <SelectItem value="large_espresso">☕ {t.largeEspresso}</SelectItem>
                <SelectItem value="americano">☕ {t.americano}</SelectItem>
                <SelectItem value="cappuccino">☕ {t.cappuccino}</SelectItem>
                <SelectItem value="latte">☕ {t.latte}</SelectItem>
                <SelectItem value="flat_white">☕ {t.flatWhite}</SelectItem>
                <SelectItem value="filter">☕ {t.filter}</SelectItem>
                <SelectItem value="instant">☕ {t.instant}</SelectItem>
                <SelectItem value="decaf">☕ {t.decaf}</SelectItem>
                <SelectItem value="other">📝 {t.otherCoffee}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>{t.sugar}</Label>
            <Switch checked={sugar} onCheckedChange={setSugar} />
          </div>

          {sugar && (
            <div>
              <Label>{t.sugarSpoons}</Label>
              <Input type="number" value={sugarSpoons} onChange={e => setSugarSpoons(e.target.value)} min="0" max="10" />
            </div>
          )}

          <div>
            <Label>{t.milkAmount}</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {(['none', 'little', 'normal', 'much'] as const).map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={milkAmount === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMilkAmount(amount)}
                >
                  {t[`${amount}Milk` as keyof typeof t]}
                </Button>
              ))}
            </div>
          </div>

          {milkAmount !== 'none' && (
            <div>
              <Label>{t.milkType}</Label>
              <Select value={milkType} onValueChange={(v: any) => setMilkType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cow">{t.cowMilk}</SelectItem>
                  <SelectItem value="oat">{t.oatMilk}</SelectItem>
                  <SelectItem value="almond">{t.almondMilk}</SelectItem>
                  <SelectItem value="soy">{t.soyMilk}</SelectItem>
                  <SelectItem value="coconut">{t.coconutMilk}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{t.note}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t.noteHelper} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
