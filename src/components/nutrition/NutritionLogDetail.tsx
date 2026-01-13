import { useState, useMemo } from 'react';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ArrowLeft, Copy, RotateCcw, Check, Download, FileText, Utensils, Coffee, Droplets, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  useNutritionLogSession, 
  useNutritionEntries, 
  useUpdateNutritionLogSession, 
  useRegenerateToken,
  useDeleteNutritionEntry,
  calculateDrinkMl,
  NutritionFoodEntry,
  NutritionDrinkEntry,
  NutritionCoffeeEntry
} from '@/hooks/useNutritionLog';
import { exportNutritionLogToPDF, generateNutritionSummaryText } from '@/lib/nutritionExport';
import { NutritionStats } from './NutritionStats';

interface NutritionLogDetailProps {
  sessionId: string;
  clientName: string;
  onBack: () => void;
}

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export function NutritionLogDetail({ sessionId, clientName, onBack }: NutritionLogDetailProps) {
  const { data: session, isLoading: sessionLoading } = useNutritionLogSession(sessionId);
  const { food, drinks, coffee, isLoading: entriesLoading } = useNutritionEntries(sessionId);
  const updateSession = useUpdateNutritionLogSession();
  const regenerateToken = useRegenerateToken();
  const deleteEntry = useDeleteNutritionEntry();

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'days' | 'stats'>('days');

  const days = useMemo(() => {
    if (!session) return [];
    const start = parseISO(session.start_date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [session]);

  const selectedDate = days[selectedDayIndex];

  const dayEntries = useMemo(() => {
    if (!selectedDate) return { food: [], drinks: [], coffee: [] };
    return {
      food: food.filter(e => isSameDay(parseISO(e.entry_date), selectedDate)),
      drinks: drinks.filter(e => isSameDay(parseISO(e.entry_date), selectedDate)),
      coffee: coffee.filter(e => isSameDay(parseISO(e.entry_date), selectedDate)),
    };
  }, [food, drinks, coffee, selectedDate]);

  const daySummary = useMemo(() => {
    const totalDrinksMl = dayEntries.drinks.reduce((sum, d) => sum + calculateDrinkMl(d), 0);
    const totalCoffees = dayEntries.coffee.reduce((sum, c) => sum + c.count, 0);
    return {
      meals: dayEntries.food.length,
      drinksMl: totalDrinksMl,
      coffees: totalCoffees,
    };
  }, [dayEntries]);

  const weekSummary = useMemo(() => {
    const totalDrinksMl = drinks.reduce((sum, d) => sum + calculateDrinkMl(d), 0);
    const totalCoffees = coffee.reduce((sum, c) => sum + c.count, 0);
    const daysWithEntries = new Set([
      ...food.map(e => e.entry_date),
      ...drinks.map(e => e.entry_date),
      ...coffee.map(e => e.entry_date),
    ]).size;

    return {
      totalEntries: food.length + drinks.length + coffee.length,
      avgDrinksMl: daysWithEntries > 0 ? Math.round(totalDrinksMl / daysWithEntries) : 0,
      avgCoffees: daysWithEntries > 0 ? (totalCoffees / daysWithEntries).toFixed(1) : '0',
      daysWithEntries,
    };
  }, [food, drinks, coffee]);

  const handleToggleStatus = async () => {
    if (!session) return;
    const newStatus = session.status === 'active' ? 'completed' : 'active';
    try {
      await updateSession.mutateAsync({ sessionId, status: newStatus });
      toast.success(newStatus === 'completed' ? 'Log označen jako dokončený' : 'Log znovu otevřen');
    } catch (error) {
      toast.error('Nepodařilo se změnit stav');
    }
  };

  const handleRegenerateToken = async () => {
    try {
      await regenerateToken.mutateAsync(sessionId);
      toast.success('Token byl obnoven');
    } catch (error) {
      toast.error('Nepodařilo se obnovit token');
    }
  };

  const handleCopyLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/nutrition-log/${session.token}`;
    navigator.clipboard.writeText(url);
    toast.success('Odkaz zkopírován');
  };

  const handleExportPDF = () => {
    if (!session) return;
    exportNutritionLogToPDF({
      clientName,
      session,
      food,
      drinks,
      coffee,
    });
    toast.success('PDF vygenerováno');
  };

  const handleGenerateSummary = () => {
    if (!session) return;
    const summary = generateNutritionSummaryText({
      clientName,
      session,
      food,
      drinks,
      coffee,
    });
    navigator.clipboard.writeText(summary);
    toast.success('Souhrn zkopírován do schránky');
  };

  const handleDeleteEntry = async (type: 'food' | 'drink' | 'coffee', id: string) => {
    try {
      await deleteEntry.mutateAsync({ type, id, sessionId });
      toast.success('Záznam smazán');
    } catch (error) {
      toast.error('Nepodařilo se smazat záznam');
    }
  };

  if (sessionLoading || entriesLoading) {
    return <div className="text-center py-8">Načítám...</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Session nenalezena</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold">
              {format(parseISO(session.start_date), 'd.M.', { locale: cs })} – {format(parseISO(session.end_date), 'd.M.yyyy', { locale: cs })}
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                {session.status === 'active' ? 'Aktivní' : 'Dokončeno'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Odkaz
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerateToken}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Nový token
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleStatus}>
            <Check className="h-4 w-4 mr-2" />
            {session.status === 'active' ? 'Dokončit' : 'Znovu otevřít'}
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button 
          variant={viewMode === 'days' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('days')}
        >
          <Utensils className="h-4 w-4 mr-2" />
          Po dnech
        </Button>
        <Button 
          variant={viewMode === 'stats' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('stats')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Statistiky
        </Button>
      </div>

      {viewMode === 'stats' ? (
        <NutritionStats 
          food={food} 
          drinks={drinks} 
          coffee={coffee} 
          startDate={session.start_date} 
          endDate={session.end_date} 
        />
      ) : (
        <>
          {/* Week Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{weekSummary.totalEntries}</div>
                <div className="text-sm text-muted-foreground">Celkem záznamů</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{weekSummary.daysWithEntries}/7</div>
                <div className="text-sm text-muted-foreground">Dní se záznamy</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{weekSummary.avgDrinksMl} ml</div>
                <div className="text-sm text-muted-foreground">Ø tekutiny/den</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{weekSummary.avgCoffees}</div>
                <div className="text-sm text-muted-foreground">Ø kávy/den</div>
              </CardContent>
            </Card>
          </div>

          {/* Day Tabs */}
          <Tabs value={selectedDayIndex.toString()} onValueChange={(v) => setSelectedDayIndex(parseInt(v))}>
        <TabsList className="w-full justify-start">
          {days.map((day, index) => {
            const dayFood = food.filter(e => isSameDay(parseISO(e.entry_date), day)).length;
            const dayDrinks = drinks.filter(e => isSameDay(parseISO(e.entry_date), day)).length;
            const dayCoffee = coffee.filter(e => isSameDay(parseISO(e.entry_date), day)).length;
            const hasEntries = dayFood + dayDrinks + dayCoffee > 0;

            return (
              <TabsTrigger key={index} value={index.toString()} className="relative">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground">{DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}</span>
                  <span>{format(day, 'd.M.')}</span>
                </div>
                {hasEntries && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {days.map((day, index) => (
          <TabsContent key={index} value={index.toString()} className="space-y-4">
            {/* Day Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Utensils className="h-4 w-4" /> {daySummary.meals} jídel
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-4 w-4" /> {daySummary.drinksMl} ml tekutin
              </span>
              <span className="flex items-center gap-1">
                <Coffee className="h-4 w-4" /> {daySummary.coffees} káv
              </span>
            </div>

            {/* Entries */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Food */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Jídlo ({dayEntries.food.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {dayEntries.food.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries.food.map((entry) => (
                          <FoodEntryCard 
                            key={entry.id} 
                            entry={entry} 
                            onDelete={() => handleDeleteEntry('food', entry.id)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Drinks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Pití ({dayEntries.drinks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {dayEntries.drinks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries.drinks.map((entry) => (
                          <DrinkEntryCard 
                            key={entry.id} 
                            entry={entry}
                            onDelete={() => handleDeleteEntry('drink', entry.id)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Coffee */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    Káva ({dayEntries.coffee.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {dayEntries.coffee.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Žádné záznamy</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEntries.coffee.map((entry) => (
                          <CoffeeEntryCard 
                            key={entry.id} 
                            entry={entry}
                            onDelete={() => handleDeleteEntry('coffee', entry.id)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

          {/* Export Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateSummary}>
              <FileText className="h-4 w-4 mr-2" />
              Kopírovat souhrn
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function FoodEntryCard({ entry, onDelete }: { entry: NutritionFoodEntry; onDelete: () => void }) {
  const portionText = () => {
    if (entry.portion_mode === 'grams' && entry.grams) return `${entry.grams}g`;
    if (entry.portion_mode === 'portion_size' && entry.portion_size) {
      const sizes = { small: 'malá', medium: 'střední', large: 'velká' };
      return sizes[entry.portion_size] || entry.portion_size;
    }
    if (entry.portion_mode === 'units' && entry.units_count) {
      return `${entry.units_count} ${entry.units_label || 'ks'}`;
    }
    return '';
  };

  const qualityLabels: Record<string, { text: string; color: string }> = {
    good: { text: 'Dobrá volba', color: 'text-success' },
    normal: { text: 'Neutrální', color: 'text-warning' },
    poor: { text: 'Špatná volba', color: 'text-destructive' },
  };

  const satiationLabels: Record<string, string> = {
    just_right: 'Akorát',
    still_hungry: 'Hlad',
    overate: 'Přejedení',
  };

  const feelingLabels: Record<string, string> = {
    ok: 'V pohodě',
    heavy: 'Těžké',
    bloated: 'Nafouklý',
    sweet: 'Chuť na sladké',
    low_energy: 'Bez energie',
    high_energy: 'Více energie',
  };

  return (
    <div className="p-2 rounded-lg bg-muted/50 text-sm group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">{entry.description}</div>
          <div className="text-xs text-muted-foreground">
            {entry.entry_time.slice(0, 5)} · {portionText()}
          </div>
          {/* Quality, Satiation, Feeling badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.quality && (
              <span className={`text-xs px-1.5 py-0.5 rounded bg-muted ${qualityLabels[entry.quality]?.color || ''}`}>
                {qualityLabels[entry.quality]?.text || entry.quality}
              </span>
            )}
            {entry.satiation && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {satiationLabels[entry.satiation] || entry.satiation}
              </span>
            )}
            {entry.feeling_after && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {feelingLabels[entry.feeling_after] || entry.feeling_after}
              </span>
            )}
          </div>
          {entry.note && <div className="text-xs text-muted-foreground mt-1">{entry.note}</div>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
              <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Smazat</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function DrinkEntryCard({ entry, onDelete }: { entry: NutritionDrinkEntry; onDelete: () => void }) {
  const ml = calculateDrinkMl(entry);
  const drinkTypes: Record<string, string> = {
    water: 'Voda', mineral: 'Minerálka', cola: 'Cola', juice: 'Džus',
    sports: 'Ionťák', tea: 'Čaj', alcohol: 'Alkohol', other: 'Jiné'
  };

  return (
    <div className="p-2 rounded-lg bg-muted/50 text-sm group">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">
            {drinkTypes[entry.drink_type] || entry.drink_type}
            {entry.drink_name && ` (${entry.drink_name})`}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.entry_time.slice(0, 5)} · {ml} ml
          </div>
          {entry.note && <div className="text-xs text-muted-foreground mt-1">{entry.note}</div>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
              <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Smazat</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function CoffeeEntryCard({ entry, onDelete }: { entry: NutritionCoffeeEntry; onDelete: () => void }) {
  const coffeeTypes: Record<string, string> = {
    espresso: 'Espresso', lungo: 'Lungo', cappuccino: 'Cappuccino',
    latte: 'Latte', filter: 'Filtrovaná', other: 'Jiné'
  };
  const milkLabels: Record<string, string> = {
    none: 'bez mléka', little: 'trochu mléka', normal: 'mléko', much: 'hodně mléka'
  };

  return (
    <div className="p-2 rounded-lg bg-muted/50 text-sm group">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">
            {coffeeTypes[entry.coffee_type] || entry.coffee_type}
            {entry.count > 1 && ` ×${entry.count}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {entry.entry_time.slice(0, 5)}
            {entry.sugar && ` · ${entry.sugar_spoons} lžičky cukru`}
            {entry.milk !== 'none' && ` · ${milkLabels[entry.milk]}`}
          </div>
          {entry.note && <div className="text-xs text-muted-foreground mt-1">{entry.note}</div>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
              <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Smazat</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
