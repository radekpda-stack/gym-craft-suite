import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useClient } from '@/hooks/useClients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
          .order('entry_date', { ascending: false })
          .order('entry_time', { ascending: false }),
        supabase
          .from('nutrition_drink_entries')
          .select('*')
          .eq('client_id', clientId)
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('entry_date', { ascending: false })
          .order('entry_time', { ascending: false }),
        supabase
          .from('nutrition_coffee_entries')
          .select('*')
          .eq('client_id', clientId)
          .gte('entry_date', start)
          .lte('entry_date', end)
          .order('entry_date', { ascending: false })
          .order('entry_time', { ascending: false }),
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
  
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: entries, isLoading: entriesLoading } = useClientNutritionEntries(
    clientId,
    weekStart,
    weekEnd
  );

  const trainerComment = useTrainerComment();

  const [commentDialog, setCommentDialog] = useState<CommentDialogState>({
    open: false,
    type: 'food',
    entryId: '',
    currentComment: '',
  });
  const [commentText, setCommentText] = useState('');

  const goToPreviousWeek = () => setWeekStart(subDays(weekStart, 7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Group entries by date
  const entriesByDate = new Map<string, { food: any[]; drinks: any[]; coffee: any[] }>();
  weekDays.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    entriesByDate.set(dateStr, { food: [], drinks: [], coffee: [] });
  });

  entries?.food.forEach(f => {
    const existing = entriesByDate.get(f.entry_date);
    if (existing) existing.food.push(f);
  });
  entries?.drinks.forEach(d => {
    const existing = entriesByDate.get(d.entry_date);
    if (existing) existing.drinks.push(d);
  });
  entries?.coffee.forEach(c => {
    const existing = entriesByDate.get(c.entry_date);
    if (existing) existing.coffee.push(c);
  });

  const isCurrentWeek = isToday(weekStart) || (new Date() >= weekStart && new Date() <= weekEnd);

  // Calculate week stats
  const weekStats = {
    totalFood: entries?.food.length || 0,
    totalDrinks: entries?.drinks.length || 0,
    totalCoffee: entries?.coffee.length || 0,
    waterMl: entries?.drinks.filter(d => d.drink_type === 'water').reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0,
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
    doc.text(`Nutriční deník - ${client.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Období: ${format(weekStart, 'd.M.', { locale: cs })} - ${format(weekEnd, 'd.M.yyyy', { locale: cs })}`, 14, 28);
    doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 34);
    
    // Summary
    const summaryData = [
      ['Celkem jídel', weekStats.totalFood.toString()],
      ['Celkem nápojů', weekStats.totalDrinks.toString()],
      ['Celkem kávy', weekStats.totalCoffee.toString()],
      ['Voda celkem', `${weekStats.waterMl} ml`],
    ];
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Souhrn týdne', 14, 46);
    
    autoTable(doc, {
      body: summaryData,
      startY: 52,
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
      theme: 'plain',
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    weekDays.forEach(day => {
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

    doc.save(`nutricni-denik_${client.name.replace(/\s+/g, '_')}_${format(weekStart, 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportováno');
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

      {/* Week Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-orange-500/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-orange-500">{weekStats.totalFood}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Jídel</div>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-500">{weekStats.totalDrinks}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Nápojů</div>
        </div>
        <div className="bg-cyan-500/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-cyan-500">{Math.round(weekStats.waterMl / 1000 * 10) / 10}l</div>
          <div className="text-[10px] text-muted-foreground uppercase">Vody</div>
        </div>
        <div className="bg-amber-600/10 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{weekStats.totalCoffee}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Kávy</div>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <p className="font-medium">
                {format(weekStart, 'd. M.', { locale: cs })} - {format(weekEnd, 'd. M. yyyy', { locale: cs })}
              </p>
              {!isCurrentWeek && (
                <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={goToCurrentWeek}>
                  Aktuální týden
                </Button>
              )}
            </div>
            
            <Button variant="ghost" size="icon" onClick={goToNextWeek} disabled={isCurrentWeek}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      {entriesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map(day => {
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
                              {f.note && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">
                                  {f.note}
                                </p>
                              )}
                              {f.trainer_comment && (
                                <div className="flex items-start gap-1 mt-1 p-1.5 rounded bg-primary/10 text-xs text-primary">
                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                  <span>{f.trainer_comment}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {f.entry_time?.slice(0, 5)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => openCommentDialog('food', f.id, f.trainer_comment)}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            </div>
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
                            <div key={d.id} className="group relative">
                              <Badge variant="secondary" className="text-xs pr-6">
                                {drinkTypeLabels[d.drink_type] || d.drink_type}
                                {d.amount_ml && ` ${d.amount_ml} ml`}
                                {d.trainer_comment && <MessageSquare className="w-2.5 h-2.5 ml-1 text-primary" />}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                          {dayEntries.coffee.map(c => (
                            <div key={c.id} className="group relative">
                              <Badge variant="secondary" className="text-xs pr-6">
                                {coffeeTypeLabels[c.coffee_type] || c.coffee_type}
                                {c.count > 1 && ` × ${c.count}`}
                                {c.trainer_comment && <MessageSquare className="w-2.5 h-2.5 ml-1 text-primary" />}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => openCommentDialog('coffee', c.id, c.trainer_comment)}
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ))}
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
