import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { Plus, Utensils, Droplets, Coffee, Check, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
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

const DEFAULT_CONTAINER_SIZES: ContainerSizes = {
  default_glass_ml: 250,
  default_mug_ml: 300,
  default_bottle_ml: 500,
  default_can_ml: 330,
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
    description: 'Popis jídla',
    portion: 'Porce',
    grams: 'Gramy',
    portionSize: 'Velikost porce',
    units: 'Kusy',
    small: 'Malá',
    medium: 'Střední',
    large: 'Velká',
    count: 'Počet',
    unit: 'Jednotka',
    note: 'Poznámka',
    drinkType: 'Typ nápoje',
    amount: 'Množství',
    ml: 'ml',
    container: 'Nádoba',
    containerCount: 'Počet',
    coffeeType: 'Typ kávy',
    sugar: 'Cukr',
    sugarSpoons: 'Lžičky cukru',
    milk: 'Mléko',
    noMilk: 'Bez mléka',
    littleMilk: 'Trochu',
    normalMilk: 'Normálně',
    muchMilk: 'Hodně',
    finishWeek: 'Dokončit týden',
    completed: 'Dokončeno',
    invalidToken: 'Neplatný odkaz',
    expiredSession: 'Tento log již byl dokončen',
    noEntries: 'Zatím žádné záznamy',
    pieces: 'ks',
    slices: 'plátky',
    spoons: 'lžíce',
    scoops: 'naběračky',
    other: 'jiné',
    water: 'Voda',
    mineral: 'Minerálka',
    cola: 'Cola',
    juice: 'Džus',
    sports: 'Ionťák',
    tea: 'Čaj',
    alcohol: 'Alkohol',
    otherDrink: 'Jiné',
    espresso: 'Espresso',
    lungo: 'Lungo',
    cappuccino: 'Cappuccino',
    latte: 'Latte',
    filter: 'Filtrovaná',
    otherCoffee: 'Jiné',
    glass: 'Sklenice',
    mug: 'Hrnek',
    bottle: 'Lahev',
    can: 'Plechovka',
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
    description: 'Food description',
    portion: 'Portion',
    grams: 'Grams',
    portionSize: 'Portion size',
    units: 'Units',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    count: 'Count',
    unit: 'Unit',
    note: 'Note',
    drinkType: 'Drink type',
    amount: 'Amount',
    ml: 'ml',
    container: 'Container',
    containerCount: 'Count',
    coffeeType: 'Coffee type',
    sugar: 'Sugar',
    sugarSpoons: 'Sugar spoons',
    milk: 'Milk',
    noMilk: 'No milk',
    littleMilk: 'A little',
    normalMilk: 'Normal',
    muchMilk: 'A lot',
    finishWeek: 'Finish week',
    completed: 'Completed',
    invalidToken: 'Invalid link',
    expiredSession: 'This log has been completed',
    noEntries: 'No entries yet',
    pieces: 'pcs',
    slices: 'slices',
    spoons: 'spoons',
    scoops: 'scoops',
    other: 'other',
    water: 'Water',
    mineral: 'Sparkling water',
    cola: 'Cola',
    juice: 'Juice',
    sports: 'Sports drink',
    tea: 'Tea',
    alcohol: 'Alcohol',
    otherDrink: 'Other',
    espresso: 'Espresso',
    lungo: 'Lungo',
    cappuccino: 'Cappuccino',
    latte: 'Latte',
    filter: 'Filter coffee',
    otherCoffee: 'Other',
    glass: 'Glass',
    mug: 'Mug',
    bottle: 'Bottle',
    can: 'Can',
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
      const end = parseISO(data.session.end_date);
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
    } catch (err) {
      console.error('Error adding entry:', err);
      toast.error(language === 'cs' ? 'Nepodařilo se uložit' : 'Failed to save');
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
        {selectedDate && (
          <p className="text-center text-muted-foreground">
            {format(selectedDate, 'EEEE d. MMMM', { locale })}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <FoodDialog onSave={(data) => handleAddEntry('food', data)} t={t}>
            <Button variant="outline" className="w-full h-16 flex-col gap-1">
              <Utensils className="h-5 w-5" />
              <span className="text-xs">{t.addFood}</span>
            </Button>
          </FoodDialog>

          <DrinkDialog onSave={(data) => handleAddEntry('drink', data)} t={t} containerSizes={containerSizes}>
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
      glass: containerSizes.default_glass_ml,
      mug: containerSizes.default_mug_ml,
      bottle: containerSizes.default_bottle_ml,
      can: containerSizes.default_can_ml,
    };
    return sizes[containerType] || 250;
  };

  const getTitle = () => {
    if (type === 'food') return entry.description;
    if (type === 'drink') return `${t[entry.drink_type as keyof typeof t] || entry.drink_type}${entry.drink_name ? ` (${entry.drink_name})` : ''}`;
    if (type === 'coffee') return `${t[entry.coffee_type as keyof typeof t] || entry.coffee_type}${entry.count > 1 ? ` ×${entry.count}` : ''}`;
    return '';
  };

  const getSubtitle = () => {
    if (type === 'food') {
      if (entry.portion_mode === 'grams') return `${entry.grams}g`;
      if (entry.portion_mode === 'portion_size') return t[entry.portion_size as keyof typeof t];
      if (entry.portion_mode === 'units') return `${entry.units_count} ${entry.units_label || t.pieces}`;
    }
    if (type === 'drink') {
      const ml = entry.amount_ml || (entry.amount_container_count * getContainerMl(entry.amount_container_type));
      return `${ml} ml`;
    }
    if (type === 'coffee') {
      const parts = [];
      if (entry.sugar) parts.push(`${entry.sugar_spoons} ${t.sugarSpoons}`);
      if (entry.milk !== 'none') parts.push(t[`${entry.milk}Milk` as keyof typeof t]);
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

function FoodDialog({ children, onSave, t }: { children: React.ReactNode; onSave: (data: any) => void; t: typeof translations.cs }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [portionMode, setPortionMode] = useState<'grams' | 'portion_size' | 'units'>('portion_size');
  const [grams, setGrams] = useState('');
  const [portionSize, setPortionSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [unitsCount, setUnitsCount] = useState('1');
  const [unitsLabel, setUnitsLabel] = useState('ks');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const handleSave = () => {
    if (!description.trim()) return;
    
    onSave({
      entry_time: time,
      description,
      portion_mode: portionMode,
      grams: portionMode === 'grams' ? parseInt(grams) || null : null,
      portion_size: portionMode === 'portion_size' ? portionSize : null,
      units_count: portionMode === 'units' ? parseFloat(unitsCount) || null : null,
      units_label: portionMode === 'units' ? unitsLabel : null,
      note: note || null,
    });

    setDescription('');
    setNote('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
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
          </div>

          <div>
            <Label>{t.description}</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="např. Kuřecí prsa s rýží"
            />
          </div>

          <div>
            <Label>{t.portion}</Label>
            <RadioGroup value={portionMode} onValueChange={(v: any) => setPortionMode(v)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grams" id="grams" />
                <Label htmlFor="grams" className="font-normal">{t.grams}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portion_size" id="portion_size" />
                <Label htmlFor="portion_size" className="font-normal">{t.portionSize}</Label>
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
            <div>
              <Label>{t.portionSize}</Label>
              <Select value={portionSize} onValueChange={(v: any) => setPortionSize(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t.small}</SelectItem>
                  <SelectItem value="medium">{t.medium}</SelectItem>
                  <SelectItem value="large">{t.large}</SelectItem>
                </SelectContent>
              </Select>
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
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DrinkDialog({ children, onSave, t, containerSizes }: { children: React.ReactNode; onSave: (data: any) => void; t: typeof translations.cs; containerSizes: ContainerSizes }) {
  const [open, setOpen] = useState(false);
  const [drinkType, setDrinkType] = useState('water');
  const [drinkName, setDrinkName] = useState('');
  const [amountMode, setAmountMode] = useState<'ml' | 'container'>('container');
  const [amountMl, setAmountMl] = useState('');
  const [containerType, setContainerType] = useState('glass');
  const [containerCount, setContainerCount] = useState('1');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const getContainerMl = (type: string) => {
    const sizes: Record<string, number> = {
      glass: containerSizes.default_glass_ml,
      mug: containerSizes.default_mug_ml,
      bottle: containerSizes.default_bottle_ml,
      can: containerSizes.default_can_ml,
    };
    return sizes[type] || 250;
  };

  const handleSave = () => {
    onSave({
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
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
                <SelectItem value="water">{t.water}</SelectItem>
                <SelectItem value="mineral">{t.mineral}</SelectItem>
                <SelectItem value="cola">{t.cola}</SelectItem>
                <SelectItem value="juice">{t.juice}</SelectItem>
                <SelectItem value="sports">{t.sports}</SelectItem>
                <SelectItem value="tea">{t.tea}</SelectItem>
                <SelectItem value="alcohol">{t.alcohol}</SelectItem>
                <SelectItem value="other">{t.otherDrink}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {drinkType === 'other' && (
            <div>
              <Label>Název</Label>
              <Input value={drinkName} onChange={e => setDrinkName(e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t.amount}</Label>
            <RadioGroup value={amountMode} onValueChange={(v: any) => setAmountMode(v)} className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ml" id="ml" />
                <Label htmlFor="ml" className="font-normal">{t.ml}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="container" id="container" />
                <Label htmlFor="container" className="font-normal">{t.container}</Label>
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
                    <SelectItem value="glass">{t.glass} (250ml)</SelectItem>
                    <SelectItem value="mug">{t.mug} (300ml)</SelectItem>
                    <SelectItem value="bottle">{t.bottle} (500ml)</SelectItem>
                    <SelectItem value="can">{t.can} (330ml)</SelectItem>
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
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave}>{t.save}</Button>
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
  const [milk, setMilk] = useState<'none' | 'little' | 'normal' | 'much'>('none');
  const [note, setNote] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const handleSave = () => {
    onSave({
      entry_time: time,
      coffee_type: coffeeType,
      count: parseInt(count) || 1,
      sugar,
      sugar_spoons: sugar ? parseInt(sugarSpoons) || 0 : 0,
      milk,
      note: note || null,
    });

    setNote('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
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
              <Input type="number" value={count} onChange={e => setCount(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>{t.coffeeType}</Label>
            <Select value={coffeeType} onValueChange={setCoffeeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="espresso">{t.espresso}</SelectItem>
                <SelectItem value="lungo">{t.lungo}</SelectItem>
                <SelectItem value="cappuccino">{t.cappuccino}</SelectItem>
                <SelectItem value="latte">{t.latte}</SelectItem>
                <SelectItem value="filter">{t.filter}</SelectItem>
                <SelectItem value="other">{t.otherCoffee}</SelectItem>
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
              <Input type="number" value={sugarSpoons} onChange={e => setSugarSpoons(e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t.milk}</Label>
            <Select value={milk} onValueChange={(v: any) => setMilk(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noMilk}</SelectItem>
                <SelectItem value="little">{t.littleMilk}</SelectItem>
                <SelectItem value="normal">{t.normalMilk}</SelectItem>
                <SelectItem value="much">{t.muchMilk}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t.note}</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
