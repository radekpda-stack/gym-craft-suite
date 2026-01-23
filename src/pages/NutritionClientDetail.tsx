import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  ArrowLeft,
  Calendar,
  Apple,
  Coffee,
  Droplets,
  ChevronLeft,
  ChevronRight,
  FileDown,
  MessageSquare,
  Send,
  X,
  Loader2,
  Settings,
  Ban,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useClient } from '@/hooks/useClients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, isToday, parseISO, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffectiveHabitSettings, calculateCaffeineCutoff, isCaffeineAfterCutoff } from '@/hooks/useClientHabitSettings';
import { useDayNotes, useUpsertDayNote } from '@/hooks/useNutritionDayNotes';
import { WaterGoalWidget, calculateDailyWaterIntake } from '@/components/client-portal/nutrition/WaterGoalWidget';
import { CaffeineWindowWidget, analyzeCaffeineForPeriod } from '@/components/client-portal/nutrition/CaffeineWindowWidget';
import { DayNoteDisplay } from '@/components/client-portal/nutrition/DayNoteInput';
import { HabitSettingsForm } from '@/components/client-portal/nutrition/HabitSettingsForm';

// Hook to get client's nutrition entries for a date range
function useClientNutritionEntries(clientId: string | undefined, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['trainer-client-nutrition', clientId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!clientId) return { food: [], drinks: [], coffee: [] };

      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');

      const [foodResult, drinksResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('*')
          .eq('client_id', clientId)
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('occurred_at', { ascending: true, nullsFirst: false })
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_drink_entries')
          .select('*')
          .eq('client_id', clientId)
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('occurred_at', { ascending: true, nullsFirst: false })
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_coffee_entries')
          .select('*')
          .eq('client_id', clientId)
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('occurred_at', { ascending: true, nullsFirst: false })
          .order('entry_time', { ascending: true }),
      ]);

      return {
        food: foodResult.data || [],
        drinks: drinksResult.data || [],
        coffee: coffeeResult.data || [],
      };
    },
    enabled: !!clientId,
  });
}

// Hook to add/update trainer comment
function useTrainerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type, 
      entryId, 
      comment 
    }: { 
      type: 'food' | 'drink' | 'coffee'; 
      entryId: string; 
      comment: string;
    }) => {
      const table = type === 'food' 
        ? 'nutrition_food_entries' 
        : type === 'drink' 
          ? 'nutrition_drink_entries' 
          : 'nutrition_coffee_entries';

      const { error } = await supabase
        .from(table)
        .update({ trainer_comment: comment || null })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-client-nutrition'] });
      toast.success('Komentář uložen');
    },
    onError: () => {
      toast.error('Nepodařilo se uložit komentář');
    },
  });
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
};

const drinkTypeLabels: Record<string, string> = {
  water: 'Voda',
  sugary: 'Slazený nápoj',
  sports: 'Sportovní nápoj',
  alcohol: 'Alkohol',
  other: 'Ostatní',
};

const coffeeTypeLabels: Record<string, string> = {
  espresso: 'Espresso',
  cappuccino: 'Cappuccino',
  tea: 'Čaj',
  energy: 'Energetický nápoj',
  other: 'Ostatní',
};

const portionLabels: Record<string, string> = {
  small: 'malá',
  medium: 'střední',
  large: 'velká',
};

interface CommentDialogState {
  open: boolean;
  type: 'food' | 'drink' | 'coffee';
  entryId: string;
  currentComment: string;
}

export default function NutritionClientDetail() {
  usePageTracking('nutrition_client_detail');
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  
  // Period selection: 7 or 10 days
  const [periodDays, setPeriodDays] = useState<7 | 10>(7);
  
  // Calculate date range based on period
  const today = new Date();
  const periodStart = subDays(today, periodDays - 1);
  const periodEnd = today;
  
  // Generate array of days in the period (most recent first)
  const periodDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < periodDays; i++) {
      dates.push(subDays(today, i));
    }
    return dates;
  }, [periodDays]);

  const { data: entries, isLoading: entriesLoading } = useClientNutritionEntries(
    clientId,
    periodStart,
    periodEnd
  );

  // Habit settings for this client
  const { settings: habitSettings, isLoading: habitSettingsLoading } = useEffectiveHabitSettings(clientId);
  
  // Day notes for the period
  const { data: dayNotes, isLoading: notesLoading } = useDayNotes(
    clientId,
    format(periodStart, 'yyyy-MM-dd'),
    format(periodEnd, 'yyyy-MM-dd')
  );
  const upsertDayNote = useUpsertDayNote();

  const trainerComment = useTrainerComment();

  const [commentDialog, setCommentDialog] = useState<CommentDialogState>({
    open: false,
    type: 'food',
    entryId: '',
    currentComment: '',
  });
  const [commentText, setCommentText] = useState('');

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, { food: any[]; drinks: any[]; coffee: any[] }>();
    periodDates.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map.set(dateStr, { food: [], drinks: [], coffee: [] });
    });

    entries?.food.forEach(f => {
      const existing = map.get(f.entry_date);
      if (existing) existing.food.push(f);
    });
    entries?.drinks.forEach(d => {
      const existing = map.get(d.entry_date);
      if (existing) existing.drinks.push(d);
    });
    entries?.coffee.forEach(c => {
      const existing = map.get(c.entry_date);
      if (existing) existing.coffee.push(c);
    });

    return map;
  }, [periodDates, entries]);

  // Calculate period stats
  const periodStats = useMemo(() => {
    const waterByDay: Record<string, number> = {};
    const coffeeByDay: Record<string, any[]> = {};
    let totalWaterMl = 0;
    let daysWithWaterGoalMet = 0;
    
    periodDates.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entriesByDate.get(dateStr);
      
      // Water
      const dayWater = dayEntries?.drinks
        .filter(d => d.drink_type === 'water')
        .reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0;
      waterByDay[dateStr] = dayWater;
      totalWaterMl += dayWater;
      if (dayWater >= habitSettings.water_goal_ml) {
        daysWithWaterGoalMet++;
      }
      
      // Coffee
      coffeeByDay[dateStr] = dayEntries?.coffee?.map(c => ({
        id: c.id,
        entry_time: c.entry_time || (c.occurred_at ? format(parseISO(c.occurred_at), 'HH:mm') : '12:00'),
        coffee_type: c.coffee_type,
        is_caffeinated: c.is_caffeinated !== false,
        count: c.count,
      })) || [];
    });

    const avgWaterMl = Math.round(totalWaterMl / periodDays);
    
    // Caffeine analysis
    const caffeineAnalysis = analyzeCaffeineForPeriod(
      coffeeByDay,
      habitSettings.sleep_time,
      habitSettings.caffeine_cutoff_minutes
    );

    return {
      totalFood: entries?.food.length || 0,
      totalDrinks: entries?.drinks.length || 0,
      totalCoffee: entries?.coffee.length || 0,
      totalWaterMl,
      avgWaterMl,
      daysWithWaterGoalMet,
      waterByDay,
      coffeeByDay,
      caffeineAnalysis,
    };
  }, [entries, periodDates, entriesByDate, habitSettings, periodDays]);

  // Get day note for a specific date
  const getDayNote = (dateStr: string) => {
    return dayNotes?.find(n => n.date === dateStr);
  };

  const openCommentDialog = (type: 'food' | 'drink' | 'coffee', entryId: string, currentComment: string) => {
    setCommentDialog({ open: true, type, entryId, currentComment });
    setCommentText(currentComment || '');
  };

  const saveComment = async () => {
    await trainerComment.mutateAsync({
      type: commentDialog.type,
      entryId: commentDialog.entryId,
      comment: commentText.trim(),
    });
    setCommentDialog({ ...commentDialog, open: false });
  };

  // PDF Export
  const exportToPDF = () => {
    if (!client || !entries) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Deník návyků - ${client.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Období: ${format(periodStart, 'd.M.', { locale: cs })} - ${format(periodEnd, 'd.M.yyyy', { locale: cs })}`, 14, 28);
    doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 34);
    
    // Summary
    const summaryData = [
      ['Celkem jídel', periodStats.totalFood.toString()],
      ['Celkem nápojů', periodStats.totalDrinks.toString()],
      ['Celkem kávy', periodStats.totalCoffee.toString()],
      ['Voda celkem', `${periodStats.totalWaterMl} ml`],
      ['Průměr vody/den', `${periodStats.avgWaterMl} ml`],
      ['Dní se splněným cílem vody', `${periodStats.daysWithWaterGoalMet}/${periodDays}`],
      ['Dní s pozdním kofeinem', `${periodStats.caffeineAnalysis.daysWithLateCaffeine}/${periodDays}`],
    ];
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Souhrn (${periodDays} dní)`, 14, 46);
    
    autoTable(doc, {
      body: summaryData,
      startY: 52,
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
      theme: 'plain',
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    periodDates.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entriesByDate.get(dateStr);
      if (!dayEntries || (dayEntries.food.length === 0 && dayEntries.drinks.length === 0 && dayEntries.coffee.length === 0)) return;

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${dayNames[day.getDay()]} ${format(day, 'd.M.yyyy', { locale: cs })}`, 14, currentY);
      currentY += 6;

      if (dayEntries.food.length > 0) {
        const foodData = dayEntries.food.map(e => [
          e.entry_time?.slice(0, 5) || '-',
          mealTypeLabels[e.meal_type] || e.meal_type,
          e.description,
          portionLabels[e.portion_size] || e.portion_size || '-',
          e.trainer_comment || '-',
        ]);

        autoTable(doc, {
          head: [['Čas', 'Typ', 'Popis', 'Porce', 'Komentář']],
          body: foodData,
          startY: currentY,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 153, 51] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 5;
      }

      if (dayEntries.drinks.length > 0) {
        const drinkData = dayEntries.drinks.map(e => [
          e.entry_time?.slice(0, 5) || '-',
          drinkTypeLabels[e.drink_type] || e.drink_type,
          `${e.amount_ml || 0} ml`,
          e.trainer_comment || '-',
        ]);

        autoTable(doc, {
          head: [['Čas', 'Typ', 'Množství', 'Komentář']],
          body: drinkData,
          startY: currentY,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [51, 153, 255] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 5;
      }

      if (dayEntries.coffee.length > 0) {
        const coffeeData = dayEntries.coffee.map(e => [
          e.entry_time?.slice(0, 5) || '-',
          coffeeTypeLabels[e.coffee_type] || e.coffee_type,
          e.count > 1 ? `×${e.count}` : '1',
          e.trainer_comment || '-',
        ]);

        autoTable(doc, {
          head: [['Čas', 'Typ', 'Počet', 'Komentář']],
          body: coffeeData,
          startY: currentY,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [139, 90, 43] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    });

    doc.save(`denik-navyku_${client.name.replace(/\s+/g, '_')}_${format(periodStart, 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportováno');
  };

  // Helper to get entry time for display
  const getEntryTime = (entry: any): string => {
    if (entry.occurred_at) {
      try {
        return format(parseISO(entry.occurred_at), 'HH:mm');
      } catch {}
    }
    if (entry.entry_time) {
      return entry.entry_time.slice(0, 5);
    }
    return '--:--';
  };

  if (clientLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Klient nenalezen</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/nutrition')}>
              Zpět na přehled
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/nutrition')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {client.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Nutriční deník
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
          <FileDown className="w-4 h-4" />
          <span className="hidden sm:inline">Export PDF</span>
        </Button>
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-warning/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-warning">{periodStats.totalFood}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Jídel</div>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-500">
            {periodStats.daysWithWaterGoalMet}/{periodDays}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">Dní s cílem vody</div>
        </div>
        <div className="bg-accent/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-accent">Ø {Math.round(periodStats.avgWaterMl / 100) / 10}l</div>
          <div className="text-[10px] text-muted-foreground uppercase">Vody/den</div>
        </div>
        <div className={cn(
          "rounded-xl p-3 text-center",
          periodStats.caffeineAnalysis.daysWithLateCaffeine > 0 
            ? "bg-amber-500/10" 
            : "bg-green-500/10"
        )}>
          <div className={cn(
            "text-xl font-bold",
            periodStats.caffeineAnalysis.daysWithLateCaffeine > 0 
              ? "text-amber-500" 
              : "text-green-500"
          )}>
            {periodStats.caffeineAnalysis.daysWithLateCaffeine}/{periodDays}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase">Pozdní kofein</div>
        </div>
      </div>

      {/* Period Toggle + Settings */}
      <div className="flex items-center justify-between gap-3">
        <Tabs value={periodDays.toString()} onValueChange={(v) => setPeriodDays(parseInt(v) as 7 | 10)}>
          <TabsList>
            <TabsTrigger value="7">7 dní</TabsTrigger>
            <TabsTrigger value="10">10 dní</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(periodStart, 'd.M.', { locale: cs })} - {format(periodEnd, 'd.M.yyyy', { locale: cs })}
          </span>
          <HabitSettingsForm
            clientId={clientId!}
            editedBy="trainer"
            triggerLabel="Nastavení"
          />
        </div>
      </div>

      {/* Days */}
      {entriesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {periodDates.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate.get(dateStr);
            const hasEntries = dayEntries && (dayEntries.food.length > 0 || dayEntries.drinks.length > 0 || dayEntries.coffee.length > 0);
            const isTodays = isToday(day);

            return (
              <Card key={dateStr} className={cn(
                isTodays && "border-primary/50",
                !hasEntries && "opacity-60"
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(day, 'EEEE d. M.', { locale: cs })}
                    {isTodays && <Badge variant="outline" className="text-[10px]">Dnes</Badge>}
                    {!hasEntries && <span className="text-muted-foreground font-normal">(prázdné)</span>}
                  </CardTitle>
                </CardHeader>
                
                {hasEntries && (
                  <CardContent className="pt-0 space-y-3">
                    {/* Food entries */}
                    {dayEntries.food.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Apple className="w-3 h-3" /> Jídlo
                        </p>
                        {dayEntries.food.map(f => (
                          <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 group">
                            <span className="text-xs text-muted-foreground shrink-0 w-10">
                              {getEntryTime(f)}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {mealTypeLabels[f.meal_type] || f.meal_type}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{f.description}</p>
                              {f.portion_size && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Porce: {portionLabels[f.portion_size] || f.portion_size}
                                </p>
                              )}
                              {f.trainer_comment && (
                                <div className="flex items-start gap-1 mt-1 p-1.5 rounded bg-primary/10 text-xs text-primary">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{f.trainer_comment}</span>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openCommentDialog('food', f.id, f.trainer_comment)}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drinks */}
                    {dayEntries.drinks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Nápoje
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dayEntries.drinks.map(d => (
                            <div key={d.id} className="group relative flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {getEntryTime(d)}
                              </span>
                              <Badge variant="secondary" className="text-xs pr-6">
                                {d.drink_name || drinkTypeLabels[d.drink_type] || d.drink_type}
                                {d.amount_ml && ` ${d.amount_ml}ml`}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                                onClick={() => openCommentDialog('drink', d.id, d.trainer_comment)}
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coffee */}
                    {dayEntries.coffee.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Coffee className="w-3 h-3" /> Kofein
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dayEntries.coffee.map(c => {
                            const isCaffeinated = c.is_caffeinated !== false;
                            return (
                              <div key={c.id} className="group relative flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {getEntryTime(c)}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs pr-6", !isCaffeinated && "opacity-60")}
                                >
                                  {!isCaffeinated && <Ban className="w-2.5 h-2.5 mr-0.5" />}
                                  {coffeeTypeLabels[c.coffee_type] || c.coffee_type}
                                  {c.count > 1 && ` ×${c.count}`}
                                  {c.coffee_amount_ml && ` ${c.coffee_amount_ml}ml`}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                                  onClick={() => openCommentDialog('coffee', c.id, c.trainer_comment)}
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Comment Dialog */}
      <Dialog open={commentDialog.open} onOpenChange={(open) => setCommentDialog({ ...commentDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Komentář k záznamu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Napište komentář pro klienta..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCommentDialog({ ...commentDialog, open: false })}
              >
                Zrušit
              </Button>
              <Button 
                onClick={saveComment} 
                disabled={trainerComment.isPending}
                className="gap-2"
              >
                {trainerComment.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
