import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { 
  Plus, Utensils, Droplets, Coffee, Check, ChevronLeft, ChevronRight, 
  Globe, X, Download, Share, MoreVertical, Pencil, Trash2, Copy
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTracking } from '@/hooks/useFeatureTracking';

interface SessionData {
  id: string;
  client_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

type Language = 'cs' | 'en';
type RecordType = 'food' | 'drink' | 'coffee' | null;

const t = {
  cs: {
    title: '7denní jídelníček',
    addRecord: 'Přidat záznam',
    selectType: 'Vyber typ',
    food: 'Jídlo',
    drink: 'Pití',
    coffee: 'Káva',
    save: 'Uložit',
    cancel: 'Zpět',
    edit: 'Upravit',
    delete: 'Smazat',
    duplicate: 'Duplikovat',
    quickWater: '+ Voda 300ml',
    // Food
    mealType: 'Typ jídla',
    breakfast: 'Snídaně',
    lunch: 'Oběd',
    dinner: 'Večeře',
    snack: 'Svačina',
    whatDidYouEat: 'Co jsi jedl/a?',
    foodPlaceholder: 'např. kuřecí prsa, rýže, zelenina',
    portionSize: 'Velikost porce',
    portionSmall: 'Malá',
    portionMedium: 'Střední',
    portionLarge: 'Velká',
    portionHint: 'Stačí odhad, nejde o přesnost.',
    quality: 'Jak bys to zpětně ohodnotil/a?',
    qualityHint: 'Bez hodnocení, jen pro lepší zpětnou vazbu trenérovi.',
    qualityGood: 'Dobrá volba',
    qualityNormal: 'Neutrální',
    qualityPoor: 'Spíš špatná volba',
    satiation: 'Byl/a jsi po jídle plný/á?',
    satiationJustRight: 'Akorát',
    satiationStillHungry: 'Stále hlad',
    satiationOverate: 'Přejedení',
    feelingAfter: 'Jak ses cítil/a po jídle?',
    feelingOk: 'V pohodě',
    feelingHeavy: 'Těžké',
    feelingBloated: 'Nafouklý',
    feelingSweet: 'Chuť na sladké',
    feelingLowEnergy: 'Bez energie',
    feelingHighEnergy: 'Více energie',
    // Drink
    drinkType: 'Typ nápoje',
    drinkWater: 'Voda',
    drinkSugary: 'Slazené',
    drinkSports: 'Ionťák',
    drinkAlcohol: 'Alkohol',
    drinkAmount: 'Množství',
    amountLittle: 'Málo',
    amountOk: 'Tak akorát',
    amountLots: 'Hodně',
    // Coffee
    coffeeType: 'Typ',
    coffeeEspresso: 'Espresso',
    coffeeCappuccino: 'Cappuccino',
    coffeeEnergy: 'Energy drink',
    coffeeOther: 'Jiný',
    coffeeCount: 'Počet',
    // Summary
    dayComplete: 'Den hotový',
    meals: 'jídla',
    drinks: 'pití',
    coffees: 'kávy',
    // States
    noEntries: 'Zatím žádné záznamy',
    tapToAdd: 'Klikni + pro přidání',
    saved: 'Hotovo, díky 👍',
    deleted: 'Smazáno',
    justRecord: 'Je to jen záznam, ne test',
    invalidLink: 'Neplatný odkaz',
    completed: 'Log dokončen',
    loading: 'Načítám...',
    // PWA Install
    installApp: 'Přidat na plochu',
    installTitle: 'Přidat na plochu',
    installIOS: 'Klikni na Sdílet (Share) → Přidat na plochu (Add to Home Screen)',
    installClose: 'Zavřít',
  },
  en: {
    title: '7-Day Food Log',
    addRecord: 'Add record',
    selectType: 'Select type',
    food: 'Food',
    drink: 'Drink',
    coffee: 'Coffee',
    save: 'Save',
    cancel: 'Back',
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    quickWater: '+ Water 300ml',
    // Food
    mealType: 'Meal type',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    whatDidYouEat: 'What did you eat?',
    foodPlaceholder: 'e.g. chicken breast, rice, vegetables',
    portionSize: 'Portion size',
    portionSmall: 'Small',
    portionMedium: 'Medium',
    portionLarge: 'Large',
    portionHint: 'Just an estimate is fine.',
    quality: 'How would you rate this meal?',
    qualityHint: 'No judgment, just feedback for your trainer.',
    qualityGood: 'Good choice',
    qualityNormal: 'Neutral',
    qualityPoor: 'Not great',
    satiation: 'Were you full after eating?',
    satiationJustRight: 'Just right',
    satiationStillHungry: 'Still hungry',
    satiationOverate: 'Overate',
    feelingAfter: 'How did you feel after eating?',
    feelingOk: 'Fine',
    feelingHeavy: 'Heavy',
    feelingBloated: 'Bloated',
    feelingSweet: 'Sweet craving',
    feelingLowEnergy: 'Low energy',
    feelingHighEnergy: 'More energy',
    // Drink
    drinkType: 'Drink type',
    drinkWater: 'Water',
    drinkSugary: 'Sugary',
    drinkSports: 'Sports drink',
    drinkAlcohol: 'Alcohol',
    drinkAmount: 'Amount',
    amountLittle: 'Little',
    amountOk: 'Enough',
    amountLots: 'A lot',
    // Coffee
    coffeeType: 'Type',
    coffeeEspresso: 'Espresso',
    coffeeCappuccino: 'Cappuccino',
    coffeeEnergy: 'Energy drink',
    coffeeOther: 'Other',
    coffeeCount: 'Count',
    // Summary
    dayComplete: 'Day complete',
    meals: 'meals',
    drinks: 'drinks',
    coffees: 'coffees',
    // States
    noEntries: 'No entries yet',
    tapToAdd: 'Tap + to add',
    saved: 'Done, thanks 👍',
    deleted: 'Deleted',
    justRecord: 'It\'s just a record, not a test',
    invalidLink: 'Invalid link',
    completed: 'Log completed',
    loading: 'Loading...',
    // PWA Install
    installApp: 'Add to Home Screen',
    installTitle: 'Add to Home Screen',
    installIOS: 'Tap Share → Add to Home Screen',
    installClose: 'Close',
  }
};

// Generate UUID for idempotency
function generateRequestId(): string {
  return crypto.randomUUID();
}

// Format time to HH:MM (always 2 digits)
function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = Math.floor(date.getMinutes() / 30) * 30;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export default function PublicNutritionLogPage() {
  usePageTracking('public_nutrition_log');
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [language, setLanguage] = useState<Language>('cs');
  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [drinkEntries, setDrinkEntries] = useState<any[]>([]);
  const [coffeeEntries, setCoffeeEntries] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>(null);
  const [editingEntry, setEditingEntry] = useState<{ type: RecordType; entry: any } | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  
  const { isInstallable, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const tr = t[language];
  const locale = language === 'cs' ? cs : enUS;

  const handleInstall = async () => {
    if (isIOS) {
      setShowInstallDialog(true);
    } else if (isInstallable) {
      const success = await promptInstall();
      if (success) {
        toast.success(language === 'cs' ? 'Hotovo!' : 'Done!');
      }
    }
  };

  useEffect(() => {
    if (token) loadSession();
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

      // Set initial day to today
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

  const handleAddEntry = async (type: 'food' | 'drink' | 'coffee', data: any, entryId?: string) => {
    if (!session || !selectedDate) return;
    try {
      const requestId = generateRequestId();
      const response = await supabase.functions.invoke('submit-nutrition-entry', {
        body: {
          token,
          type,
          action: entryId ? 'update' : 'create',
          entry_id: entryId,
          entry: {
            ...data,
            client_request_id: requestId,
            session_id: session.id,
            client_id: session.client_id,
            entry_date: format(selectedDate, 'yyyy-MM-dd'),
          }
        }
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      await loadSession();
      toast.success(tr.saved);
      setShowAddDialog(false);
      setRecordType(null);
      setEditingEntry(null);
    } catch (err: any) {
      console.error('Error adding entry:', err);
      toast.error(language === 'cs' ? 'Nepodařilo se uložit' : 'Failed to save');
    }
  };

  const handleDeleteEntry = async (type: 'food' | 'drink' | 'coffee', entryId: string) => {
    if (!session) return;
    try {
      const response = await supabase.functions.invoke('submit-nutrition-entry', {
        body: {
          token,
          type,
          action: 'delete',
          entry_id: entryId,
          entry: {}
        }
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      await loadSession();
      toast.success(tr.deleted);
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      toast.error(language === 'cs' ? 'Nepodařilo se smazat' : 'Failed to delete');
    }
  };

  const handleDuplicateEntry = (type: RecordType, entry: any) => {
    // Open form with pre-filled data (without id)
    const { id, created_at, updated_at, session_id, client_id, client_request_id, ...entryData } = entry;
    setEditingEntry({ type, entry: { ...entryData, _isDuplicate: true } });
    setRecordType(type);
    setShowAddDialog(true);
  };

  const handleQuickWater = async () => {
    if (!session || !selectedDate) return;
    try {
      const requestId = generateRequestId();
      const response = await supabase.functions.invoke('submit-nutrition-entry', {
        body: {
          token,
          type: 'drink',
          action: 'create',
          entry: {
            client_request_id: requestId,
            session_id: session.id,
            client_id: session.client_id,
            entry_date: format(selectedDate, 'yyyy-MM-dd'),
            entry_time: formatTimeHHMM(new Date()),
            drink_type: 'water',
            amount_ml: 300,
          }
        }
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      await loadSession();
      toast.success(tr.saved);
    } catch (err: any) {
      console.error('Error adding quick water:', err);
      toast.error(language === 'cs' ? 'Nepodařilo se přidat' : 'Failed to add');
    }
  };

  if (loading) {
    return (
      <div className="public-page flex items-center justify-center">
        <div className="text-muted-foreground">{tr.loading}</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium text-destructive">{tr.invalidLink}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'completed') {
    return (
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Check className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-lg font-medium">{tr.completed}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayNames = language === 'cs' 
    ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const totalEntries = dayEntries.food.length + dayEntries.drinks.length + dayEntries.coffee.length;
  const dayIsComplete = dayEntries.food.length >= 3;

  return (
    <div className="public-page pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">{tr.title}</h1>
          <div className="flex items-center gap-1">
            {(isInstallable || isIOS) && !isStandalone && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleInstall}
                className="text-primary"
              >
                {isIOS ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setLanguage(l => l === 'cs' ? 'en' : 'cs')}>
              <Globe className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Day Navigation */}
        <div className="flex items-center justify-between px-2 pb-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDayIndex(i => Math.max(0, i - 1))} disabled={selectedDayIndex === 0}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-1 overflow-x-auto">
            {days.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              const dayOfWeek = day.getDay();
              const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasEntries = foodEntries.some(e => e.entry_date === dateStr) || 
                                 drinkEntries.some(e => e.entry_date === dateStr) ||
                                 coffeeEntries.some(e => e.entry_date === dateStr);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDayIndex(index)}
                  className={cn(
                    'flex flex-col items-center px-3 py-2 rounded-xl min-w-[50px] transition-all',
                    selectedDayIndex === index
                      ? 'bg-primary text-primary-foreground scale-105'
                      : isToday ? 'bg-primary/10' : 'hover:bg-muted'
                  )}
                >
                  <span className="text-xs">{dayNames[dayNameIndex]}</span>
                  <span className="text-sm font-bold">{format(day, 'd')}</span>
                  {hasEntries && selectedDayIndex !== index && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDayIndex(i => Math.min(6, i + 1))} disabled={selectedDayIndex === 6}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {selectedDate && (
          <p className="text-center text-muted-foreground text-sm">
            {format(selectedDate, 'EEEE d. MMMM', { locale })}
          </p>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleQuickWater}
            className="gap-1 text-blue-600"
          >
            💧 {tr.quickWater}
          </Button>
        </div>

        {/* Day Status */}
        {dayIsComplete && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">✔️ {tr.dayComplete}</p>
              <p className="text-xs text-muted-foreground">{tr.justRecord}</p>
            </div>
          </motion.div>
        )}

        {/* Quick Summary */}
        {totalEntries > 0 && (
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            {dayEntries.food.length > 0 && (
              <span className="flex items-center gap-1">
                <Utensils className="h-4 w-4 text-orange-500" />
                {dayEntries.food.length} {tr.meals}
              </span>
            )}
            {dayEntries.drinks.length > 0 && (
              <span className="flex items-center gap-1">
                <Droplets className="h-4 w-4 text-blue-500" />
                {dayEntries.drinks.length} {tr.drinks}
              </span>
            )}
            {dayEntries.coffee.length > 0 && (
              <span className="flex items-center gap-1">
                <Coffee className="h-4 w-4 text-amber-700" />
                {dayEntries.coffee.length} {tr.coffees}
              </span>
            )}
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-2">
          {totalEntries === 0 ? (
            <Card className="empty-card">
              <CardContent className="py-10 text-center">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddDialog(true)}
                  className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center mx-auto mb-4"
                >
                  <Plus className="h-8 w-8" />
                </motion.button>
                <p className="text-muted-foreground font-medium">{tr.noEntries}</p>
                <p className="text-sm text-muted-foreground mt-1">{tr.tapToAdd}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {dayEntries.food.map((entry: any) => (
                <FoodEntryCard 
                  key={entry.id} 
                  entry={entry} 
                  language={language}
                  onEdit={() => {
                    setEditingEntry({ type: 'food', entry });
                    setRecordType('food');
                    setShowAddDialog(true);
                  }}
                  onDelete={() => handleDeleteEntry('food', entry.id)}
                  onDuplicate={() => handleDuplicateEntry('food', entry)}
                />
              ))}
              {dayEntries.drinks.map((entry: any) => (
                <DrinkEntryCard 
                  key={entry.id} 
                  entry={entry} 
                  language={language}
                  onEdit={() => {
                    setEditingEntry({ type: 'drink', entry });
                    setRecordType('drink');
                    setShowAddDialog(true);
                  }}
                  onDelete={() => handleDeleteEntry('drink', entry.id)}
                  onDuplicate={() => handleDuplicateEntry('drink', entry)}
                />
              ))}
              {dayEntries.coffee.map((entry: any) => (
                <CoffeeEntryCard 
                  key={entry.id} 
                  entry={entry} 
                  language={language}
                  onEdit={() => {
                    setEditingEntry({ type: 'coffee', entry });
                    setRecordType('coffee');
                    setShowAddDialog(true);
                  }}
                  onDelete={() => handleDeleteEntry('coffee', entry.id)}
                  onDuplicate={() => handleDuplicateEntry('coffee', entry)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* FAB - Add Record */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddDialog(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
      >
        <Plus className="h-7 w-7" />
      </motion.button>

      {/* Add Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setRecordType(null);
          setEditingEntry(null);
        }
      }}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto p-0">
          <AnimatePresence mode="wait">
            {!recordType ? (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-center text-lg">{tr.selectType}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <TypeButton 
                    icon={<Utensils className="h-8 w-8" />}
                    label={tr.food}
                    color="text-orange-500 bg-orange-500/10 border-orange-500/30"
                    onClick={() => setRecordType('food')}
                  />
                  <TypeButton 
                    icon={<Droplets className="h-8 w-8" />}
                    label={tr.drink}
                    color="text-blue-500 bg-blue-500/10 border-blue-500/30"
                    onClick={() => setRecordType('drink')}
                  />
                  <TypeButton 
                    icon={<Coffee className="h-8 w-8" />}
                    label={tr.coffee}
                    color="text-amber-700 bg-amber-700/10 border-amber-700/30"
                    onClick={() => setRecordType('coffee')}
                  />
                </div>
              </motion.div>
            ) : recordType === 'food' ? (
              <FoodForm 
                key="food"
                initialData={editingEntry?.type === 'food' ? editingEntry.entry : undefined}
                onSave={(data) => handleAddEntry('food', data, editingEntry?.type === 'food' && !editingEntry.entry._isDuplicate ? editingEntry.entry.id : undefined)} 
                onBack={() => { setRecordType(null); setEditingEntry(null); }}
                language={language}
              />
            ) : recordType === 'drink' ? (
              <DrinkForm 
                key="drink"
                initialData={editingEntry?.type === 'drink' ? editingEntry.entry : undefined}
                onSave={(data) => handleAddEntry('drink', data, editingEntry?.type === 'drink' && !editingEntry.entry._isDuplicate ? editingEntry.entry.id : undefined)} 
                onBack={() => { setRecordType(null); setEditingEntry(null); }}
                language={language}
              />
            ) : (
              <CoffeeForm 
                key="coffee"
                initialData={editingEntry?.type === 'coffee' ? editingEntry.entry : undefined}
                onSave={(data) => handleAddEntry('coffee', data, editingEntry?.type === 'coffee' && !editingEntry.entry._isDuplicate ? editingEntry.entry.id : undefined)} 
                onBack={() => { setRecordType(null); setEditingEntry(null); }}
                language={language}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* iOS Install Instructions Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{tr.installTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Share className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">{tr.installIOS}</p>
          </div>
          <Button onClick={() => setShowInstallDialog(false)} className="w-full">
            {tr.installClose}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Type Selection Button
function TypeButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105",
        color
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}

// Entry Menu Component
function EntryMenu({ onEdit, onDelete, onDuplicate, language }: { 
  onEdit: () => void; 
  onDelete: () => void; 
  onDuplicate: () => void;
  language: Language;
}) {
  const tr = t[language];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          {tr.edit}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          {tr.duplicate}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          {tr.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Food Entry Card
function FoodEntryCard({ entry, language, onEdit, onDelete, onDuplicate }: { 
  entry: any; 
  language: Language;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const qualityColors: Record<string, string> = {
    good: 'bg-green-500',
    normal: 'bg-yellow-500',
    poor: 'bg-red-500',
  };
  
  const mealIcons: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
  };

  const satiationIcons: Record<string, string> = {
    just_right: '✓',
    still_hungry: '🍽️',
    overate: '😵',
  };

  const feelingIcons: Record<string, string> = {
    ok: '😌',
    heavy: '😴',
    bloated: '🤢',
    sweet: '🍬',
    low_energy: '🔋',
    high_energy: '⚡',
  };

  return (
    <Card>
      <CardContent className="py-3 flex items-center gap-3">
        <div className="text-2xl">{mealIcons[entry.meal_type] || '🍽️'}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{entry.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{entry.entry_time?.slice(0, 5)}</span>
            <span>•</span>
            <span>{entry.portion_size === 'small' ? '🥄' : entry.portion_size === 'large' ? '🍲' : '🍽️'}</span>
            {entry.satiation && (
              <>
                <span>•</span>
                <span>{satiationIcons[entry.satiation]}</span>
              </>
            )}
            {entry.feeling_after && (
              <>
                <span>•</span>
                <span>{feelingIcons[entry.feeling_after]}</span>
              </>
            )}
          </div>
        </div>
        {entry.quality && (
          <div className={cn("w-3 h-3 rounded-full", qualityColors[entry.quality])} />
        )}
        <EntryMenu onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} language={language} />
      </CardContent>
    </Card>
  );
}

// Drink Entry Card
function DrinkEntryCard({ entry, language, onEdit, onDelete, onDuplicate }: { 
  entry: any; 
  language: Language;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const typeIcons: Record<string, string> = {
    water: '💧',
    sugary: '🥤',
    sports: '⚡',
    alcohol: '🍺',
  };

  return (
    <Card>
      <CardContent className="py-3 flex items-center gap-3">
        <div className="text-2xl">{typeIcons[entry.drink_type] || '🥤'}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{t[language][`drink${entry.drink_type.charAt(0).toUpperCase()}${entry.drink_type.slice(1)}` as keyof typeof t.cs] || entry.drink_type}</p>
          <p className="text-xs text-muted-foreground">
            {entry.entry_time?.slice(0, 5)} • {entry.amount_ml}ml
          </p>
        </div>
        <EntryMenu onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} language={language} />
      </CardContent>
    </Card>
  );
}

// Coffee Entry Card
function CoffeeEntryCard({ entry, language, onEdit, onDelete, onDuplicate }: { 
  entry: any; 
  language: Language;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const typeIcons: Record<string, string> = {
    espresso: '☕',
    cappuccino: '🥛',
    energy: '⚡',
    other: '📝',
  };

  return (
    <Card>
      <CardContent className="py-3 flex items-center gap-3">
        <div className="text-2xl">{typeIcons[entry.coffee_type] || '☕'}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{t[language][`coffee${entry.coffee_type.charAt(0).toUpperCase()}${entry.coffee_type.slice(1)}` as keyof typeof t.cs] || entry.coffee_type}</p>
          <p className="text-xs text-muted-foreground">
            {entry.entry_time?.slice(0, 5)} • {entry.count}×
          </p>
        </div>
        <EntryMenu onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} language={language} />
      </CardContent>
    </Card>
  );
}

// Time picker with half-hour intervals - FIXED to always return HH:MM format
function TimeSelect({ value, onChange, language }: { value: string; onChange: (v: string) => void; language: Language }) {
  const times: string[] = [];
  for (let h = 5; h <= 23; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
    times.push(`${h.toString().padStart(2, '0')}:30`);
  }
  times.push('00:00');

  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
      {times.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "px-2.5 py-1.5 text-sm rounded-lg border transition-all",
            value === t
              ? "border-primary bg-primary text-primary-foreground font-medium"
              : "border-border hover:border-primary/50"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// SIMPLIFIED FOOD FORM
function FoodForm({ onSave, onBack, language, initialData }: { 
  onSave: (data: any) => void; 
  onBack: () => void; 
  language: Language;
  initialData?: any;
}) {
  const tr = t[language];
  const [mealType, setMealType] = useState(initialData?.meal_type || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [portionSize, setPortionSize] = useState(initialData?.portion_size || 'medium');
  const [satiation, setSatiation] = useState(initialData?.satiation || '');
  const [feeling, setFeeling] = useState(initialData?.feeling_after || '');
  const [quality, setQuality] = useState(initialData?.quality || '');
  const [time, setTime] = useState(initialData?.entry_time?.slice(0, 5) || formatTimeHHMM(new Date()));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        description,
        entry_time: time,
        meal_type: mealType || null,
        portion_mode: 'portion_size',
        portion_size: portionSize,
        satiation: satiation || null,
        feeling_after: feeling || null,
        quality: quality || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-5"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-orange-500" />
          {tr.food}
        </DialogTitle>
      </DialogHeader>

      {/* Meal Type */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.mealType}</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'breakfast', icon: '🌅', label: tr.breakfast },
            { id: 'lunch', icon: '☀️', label: tr.lunch },
            { id: 'dinner', icon: '🌙', label: tr.dinner },
            { id: 'snack', icon: '🍿', label: tr.snack },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMealType(m.id)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl border-2 transition-all",
                mealType === m.id 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-[10px] mt-1">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{language === 'cs' ? 'Čas' : 'Time'}</Label>
        <TimeSelect value={time} onChange={setTime} language={language} />
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.whatDidYouEat}</Label>
        <Input
          placeholder={tr.foodPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-base"
        />
      </div>

      {/* Portion Size */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.portionSize}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'small', icon: '🥄', label: tr.portionSmall },
            { id: 'medium', icon: '🍽️', label: tr.portionMedium },
            { id: 'large', icon: '🍲', label: tr.portionLarge },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPortionSize(p.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                portionSize === p.id 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{p.icon}</span>
              <span className="text-xs mt-1">{p.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{tr.portionHint}</p>
      </div>

      {/* Satiation */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.satiation}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'just_right', icon: '✓', label: tr.satiationJustRight },
            { id: 'still_hungry', icon: '🍽️', label: tr.satiationStillHungry },
            { id: 'overate', icon: '😵', label: tr.satiationOverate },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSatiation(satiation === s.id ? '' : s.id)}
              className={cn(
                "flex flex-col items-center p-2.5 rounded-xl border-2 transition-all",
                satiation === s.id 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs mt-1">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feeling After */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.feelingAfter}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'ok', icon: '😌', label: tr.feelingOk },
            { id: 'heavy', icon: '😴', label: tr.feelingHeavy },
            { id: 'bloated', icon: '🤢', label: tr.feelingBloated },
            { id: 'sweet', icon: '🍬', label: tr.feelingSweet },
            { id: 'low_energy', icon: '🔋', label: tr.feelingLowEnergy },
            { id: 'high_energy', icon: '⚡', label: tr.feelingHighEnergy },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFeeling(feeling === f.id ? '' : f.id)}
              className={cn(
                "flex flex-col items-center p-2.5 rounded-xl border-2 transition-all",
                feeling === f.id 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-xs mt-1 leading-tight text-center">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" className="flex-1" onClick={onBack}>{tr.cancel}</Button>
        <Button 
          className="flex-1 text-base font-semibold" 
          size="lg"
          onClick={handleSave} 
          disabled={isSaving || !description.trim() || !mealType}
        >
          {isSaving ? '...' : `✓ ${tr.save}`}
        </Button>
      </div>
    </motion.div>
  );
}

// SIMPLIFIED DRINK FORM
function DrinkForm({ onSave, onBack, language, initialData }: { 
  onSave: (data: any) => void; 
  onBack: () => void; 
  language: Language;
  initialData?: any;
}) {
  const tr = t[language];
  const [drinkType, setDrinkType] = useState(initialData?.drink_type || 'water');
  const [amount, setAmount] = useState<'little' | 'ok' | 'lots'>(
    initialData?.amount_ml ? (initialData.amount_ml <= 200 ? 'little' : initialData.amount_ml >= 500 ? 'lots' : 'ok') : 'ok'
  );
  const [time, setTime] = useState(initialData?.entry_time?.slice(0, 5) || formatTimeHHMM(new Date()));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        entry_time: time,
        drink_type: drinkType,
        amount_ml: amount === 'little' ? 200 : amount === 'lots' ? 500 : 300,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-5"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          {tr.drink}
        </DialogTitle>
      </DialogHeader>

      {/* Time */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{language === 'cs' ? 'Čas' : 'Time'}</Label>
        <TimeSelect value={time} onChange={setTime} language={language} />
      </div>

      {/* Drink Type */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.drinkType}</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'water', icon: '💧', label: tr.drinkWater },
            { id: 'sugary', icon: '🥤', label: tr.drinkSugary },
            { id: 'sports', icon: '⚡', label: tr.drinkSports },
            { id: 'alcohol', icon: '🍺', label: tr.drinkAlcohol },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDrinkType(d.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                drinkType === d.id 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border hover:border-blue-500/50"
              )}
            >
              <span className="text-xl">{d.icon}</span>
              <span className="text-[10px] mt-1">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.drinkAmount}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'little', icon: '📉', label: tr.amountLittle },
            { id: 'ok', icon: '✓', label: tr.amountOk },
            { id: 'lots', icon: '📈', label: tr.amountLots },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setAmount(a.id as any)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                amount === a.id 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border hover:border-blue-500/50"
              )}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-xs mt-1">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>{tr.cancel}</Button>
        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '...' : tr.save}
        </Button>
      </div>
    </motion.div>
  );
}

// SIMPLIFIED COFFEE FORM
function CoffeeForm({ onSave, onBack, language, initialData }: { 
  onSave: (data: any) => void; 
  onBack: () => void; 
  language: Language;
  initialData?: any;
}) {
  const tr = t[language];
  const [coffeeType, setCoffeeType] = useState(initialData?.coffee_type || 'espresso');
  const [count, setCount] = useState<'1' | '2' | '3+'>(
    initialData?.count ? (initialData.count >= 3 ? '3+' : String(initialData.count) as '1' | '2') : '1'
  );
  const [time, setTime] = useState(initialData?.entry_time?.slice(0, 5) || formatTimeHHMM(new Date()));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        entry_time: time,
        coffee_type: coffeeType,
        count: count === '3+' ? 3 : parseInt(count),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 space-y-5"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-amber-700" />
          {tr.coffee}
        </DialogTitle>
      </DialogHeader>

      {/* Time */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{language === 'cs' ? 'Čas' : 'Time'}</Label>
        <TimeSelect value={time} onChange={setTime} language={language} />
      </div>

      {/* Coffee Type */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.coffeeType}</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'espresso', icon: '☕', label: tr.coffeeEspresso },
            { id: 'cappuccino', icon: '🥛', label: tr.coffeeCappuccino },
            { id: 'energy', icon: '⚡', label: tr.coffeeEnergy },
            { id: 'other', icon: '📝', label: tr.coffeeOther },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCoffeeType(c.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                coffeeType === c.id 
                  ? "border-amber-600 bg-amber-600/10" 
                  : "border-border hover:border-amber-600/50"
              )}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] mt-1">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">{tr.coffeeCount}</Label>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3+'].map((c) => (
            <button
              key={c}
              onClick={() => setCount(c as any)}
              className={cn(
                "p-4 rounded-xl border-2 text-2xl font-bold transition-all",
                count === c 
                  ? "border-amber-600 bg-amber-600/10 text-amber-700" 
                  : "border-border hover:border-amber-600/50"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>{tr.cancel}</Button>
        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '...' : tr.save}
        </Button>
      </div>
    </motion.div>
  );
}
