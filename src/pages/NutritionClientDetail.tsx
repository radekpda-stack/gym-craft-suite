import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Utensils, 
  ArrowLeft,
  Calendar,
  Apple,
  Coffee,
  Droplets,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useClient } from '@/hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export default function NutritionClientDetail() {
  usePageTracking('nutrition_client_detail');
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: entries, isLoading: entriesLoading } = useClientNutritionEntries(
    clientId,
    weekStart,
    weekEnd
  );

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
            Nutriční deník klienta
          </p>
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
                          <div key={f.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {mealTypeLabels[f.meal_type] || f.meal_type}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{f.description}</p>
                              {f.portion_size && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Porce: {f.portion_size === 'small' ? 'malá' : f.portion_size === 'large' ? 'velká' : 'střední'}
                                </p>
                              )}
                              {f.note && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">
                                  {f.note}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {f.entry_time?.slice(0, 5)}
                            </span>
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
                            <Badge key={d.id} variant="secondary" className="text-xs">
                              {drinkTypeLabels[d.drink_type] || d.drink_type}
                              {d.amount_ml && ` ${d.amount_ml} ml`}
                            </Badge>
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
                            <Badge key={c.id} variant="secondary" className="text-xs">
                              {coffeeTypeLabels[c.coffee_type] || c.coffee_type}
                              {c.count > 1 && ` × ${c.count}`}
                            </Badge>
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
    </div>
  );
}
