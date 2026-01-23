import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, Plus, Droplets, Coffee, Loader2, Clock, RotateCcw, MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleFoodForm } from '@/components/client-portal/nutrition/SimpleFoodForm';
import { TodayEntries } from '@/components/client-portal/nutrition/TodayEntries';
import { EditEntryDialog } from '@/components/client-portal/nutrition/EditEntryDialog';
import { WeekStrip } from '@/components/client-portal/nutrition/WeekStrip';
import { WaterGoalWidget, calculateDailyWaterIntake } from '@/components/client-portal/nutrition/WaterGoalWidget';
import { CaffeineWindowWidget } from '@/components/client-portal/nutrition/CaffeineWindowWidget';
import { DayNoteInput, DayNoteDisplay } from '@/components/client-portal/nutrition/DayNoteInput';
import { HabitSettingsForm } from '@/components/client-portal/nutrition/HabitSettingsForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { type MealTypeId, QUICK_WATER_AMOUNTS } from '@/components/client-portal/nutrition/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useQuickAddWater, 
  useDeleteNutritionEntryPortal,
  useAddCoffeeEntry,
  useAddFoodEntry,
} from '@/hooks/useClientPortalNutrition';
import { useNutritionXP } from '@/hooks/useNutritionXP';
import { useEffectiveHabitSettings } from '@/hooks/useClientHabitSettings';
import { useDayNote, useUpsertDayNote } from '@/hooks/useNutritionDayNotes';

type EditingEntry = {
  type: 'food' | 'drink' | 'coffee';
  entry: any;
} | null;

// Hook to get or create ongoing nutrition session
function useOngoingNutritionSession(clientId: string | undefined, trainerId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-ongoing-nutrition-session', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data: existingSession, error } = await supabase
        .from('nutrition_log_sessions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return existingSession;
    },
    enabled: !!clientId,
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!clientId || !trainerId) throw new Error('Missing IDs');

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { data, error } = await supabase
        .from('nutrition_log_sessions')
        .insert({
          client_id: clientId,
          user_id: trainerId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status: 'active',
          is_self_service: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ongoing-nutrition-session', clientId] });
    },
  });

  return { session: query.data, isLoading: query.isLoading, createSession };
}

// Hook to get nutrition data for a specific date
function useNutritionByDate(clientId: string | undefined, sessionId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['client-nutrition-by-date', clientId, sessionId, date],
    queryFn: async () => {
      if (!clientId || !sessionId) return { food: [], drinks: [], coffee: [] };

      const [foodResult, drinksResult, coffeeResult] = await Promise.all([
        supabase
          .from('nutrition_food_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', date)
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_drink_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', date)
          .order('entry_time', { ascending: true }),
        supabase
          .from('nutrition_coffee_entries')
          .select('*')
          .eq('session_id', sessionId)
          .eq('entry_date', date)
          .order('entry_time', { ascending: true }),
      ]);

      return {
        food: foodResult.data || [],
        drinks: drinksResult.data || [],
        coffee: coffeeResult.data || [],
      };
    },
    enabled: !!clientId && !!sessionId,
  });
}

// Fixed hook - includes all entry types for completed days
function useCompletedDays(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['client-nutrition-completed-days', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const [foodResult, drinksResult, coffeeResult] = await Promise.all([
        supabase.from('nutrition_food_entries').select('entry_date').eq('session_id', sessionId),
        supabase.from('nutrition_drink_entries').select('entry_date').eq('session_id', sessionId),
        supabase.from('nutrition_coffee_entries').select('entry_date').eq('session_id', sessionId),
      ]);

      const allDates = [
        ...(foodResult.data || []).map(e => e.entry_date),
        ...(drinksResult.data || []).map(e => e.entry_date),
        ...(coffeeResult.data || []).map(e => e.entry_date),
      ];

      return [...new Set(allDates)];
    },
    enabled: !!sessionId,
  });
}

// Hook to get recent unique food entries for quick re-add
function useRecentFoodEntries(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-recent-food-entries', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .select('description, meal_type, portion_size')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Count frequency and get unique descriptions
      const frequencyMap = new Map<string, { count: number; entry: { description: string; meal_type: string; portion_size: string } }>();
      
      for (const entry of data || []) {
        const key = entry.description.toLowerCase().trim();
        if (frequencyMap.has(key)) {
          frequencyMap.get(key)!.count++;
        } else {
          frequencyMap.set(key, {
            count: 1,
            entry: {
              description: entry.description,
              meal_type: entry.meal_type,
              portion_size: entry.portion_size || 'medium',
            },
          });
        }
      }

      // Sort by frequency and return top 8
      return Array.from(frequencyMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(item => item.entry);
    },
    enabled: !!clientId,
  });
}

export default function ClientPortalNutrition() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  
  const { session, isLoading, createSession } = useOngoingNutritionSession(clientId ?? undefined, trainerId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: dayData, isLoading: dayLoading } = useNutritionByDate(
    clientId ?? undefined, 
    session?.id,
    selectedDateStr
  );
  const { data: completedDays = [] } = useCompletedDays(session?.id);
  const { data: recentFoods = [] } = useRecentFoodEntries(clientId ?? undefined);
  const queryClient = useQueryClient();
  const quickWater = useQuickAddWater();
  const addFood = useAddFoodEntry();
  const deleteEntry = useDeleteNutritionEntryPortal();
  const nutritionXP = useNutritionXP();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');

  // Habit settings and day notes
  const { settings: habitSettings } = useEffectiveHabitSettings(clientId ?? undefined);
  const { data: dayNote } = useDayNote(clientId ?? undefined, selectedDateStr);
  const upsertDayNote = useUpsertDayNote();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [prefilledMealType, setPrefilledMealType] = useState<MealTypeId | undefined>();

  // Calculate water intake for current day
  const waterIntake = dayData?.drinks ? calculateDailyWaterIntake(dayData.drinks) : 0;

  // Prepare caffeine entries for widget - match CaffeineEntry interface
  const caffeineEntriesForWidget = (dayData?.coffee || []).map(c => ({
    id: c.id,
    entry_time: c.occurred_at 
      ? format(new Date(c.occurred_at), 'HH:mm')
      : c.entry_time || '12:00',
    coffee_type: c.coffee_type || 'espresso',
    is_caffeinated: c.is_caffeinated !== false, // default true if not specified
    count: c.count || 1,
  }));

  // Handle saving day note
  const handleSaveDayNote = async (note: string) => {
    if (!clientId) return;
    try {
      await upsertDayNote.mutateAsync({
        clientId,
        date: selectedDateStr,
        clientNote: note,
      });
      toast.success('Poznámka uložena');
    } catch (error) {
      toast.error('Nepodařilo se uložit poznámku');
    }
  };

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const handleQuickWater = async (amount: number = 300) => {
    if (!session || !clientId) return;
    
    try {
      await quickWater.mutateAsync({
        sessionId: session.id,
        clientId,
        amount,
      });
      toast.success(`+${amount} ml vody`);
      trackPortalEvent('client_portal_quick_water', { amount });
      
      // Calculate XP for the entry
      nutritionXP.mutate({ clientId, date: selectedDateStr, entryType: 'drink' });
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    }
  };

  const handleQuickCoffee = async (coffeeType: 'espresso' | 'tea' = 'espresso') => {
    if (!session || !clientId) return;
    
    try {
      const now = new Date();
      const entryDate = format(selectedDate, 'yyyy-MM-dd');
      const entryTime = format(now, 'HH:mm');
      const occurredAt = new Date(`${entryDate}T${entryTime}:00`).toISOString();
      
      const { error } = await supabase
        .from('nutrition_coffee_entries')
        .insert({
          session_id: session.id,
          client_id: clientId,
          entry_date: entryDate,
          entry_time: entryTime,
          occurred_at: occurredAt,
          coffee_type: coffeeType,
          count: 1,
          is_caffeinated: coffeeType !== 'tea', // Tea is typically not caffeinated in this context
          created_from: 'web',
        });
      
      if (error) throw error;
      toast.success(coffeeType === 'tea' ? 'Čaj přidán' : 'Káva přidána');
      trackPortalEvent('client_portal_quick_coffee', { coffeeType });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, session.id] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', session.id] });
      
      // Calculate XP for the entry
      nutritionXP.mutate({ clientId, date: selectedDateStr, entryType: 'coffee' });
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    }
  };

  const handleDeleteEntry = async (type: 'food' | 'drink' | 'coffee', entryId: string) => {
    if (!session || !clientId) return;
    
    try {
      await deleteEntry.mutateAsync({
        type,
        entryId,
        sessionId: session.id,
        clientId,
      });
      toast.success('Smazáno');
      trackPortalEvent('client_portal_delete_entry', { type });
    } catch (error) {
      toast.error('Nepodařilo se smazat');
    }
  };

  const handleQuickMeal = (mealType: MealTypeId) => {
    setPrefilledMealType(mealType);
    setShowAddForm(true);
  };

  // Quick re-add recent food
  const handleQuickReaddFood = async (food: { description: string; meal_type: string; portion_size: string }) => {
    if (!session || !clientId) return;
    
    try {
      await addFood.mutateAsync({
        sessionId: session.id,
        clientId,
        date: selectedDate,
        entry: {
          meal_type: food.meal_type as MealTypeId,
          description: food.description,
          portion_size: food.portion_size as any,
        },
      });
      toast.success(`${food.description} přidáno`);
      trackPortalEvent('client_portal_quick_readd_food');
      
      // Calculate XP for the entry
      nutritionXP.mutate({ clientId, date: selectedDateStr, entryType: 'food' });
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    }
  };

  const handleStartTracking = async () => {
    try {
      await createSession.mutateAsync();
      toast.success('Nutriční deník aktivován');
      trackPortalEvent('client_portal_start_nutrition_tracking');
    } catch (error) {
      toast.error('Nepodařilo se aktivovat deník');
    }
  };

  // Fixed water counting - only exact match for 'water' type
  const waterMl = dayData?.drinks
    ?.filter(d => d.drink_type === 'water')
    .reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0;

  // Count today's entries
  const todayFoodCount = dayData?.food?.length || 0;
  const todayDrinkCount = dayData?.drinks?.length || 0;
  const todayCoffeeCount = dayData?.coffee?.length || 0;

  // Check for trainer comments
  const hasTrainerComments = [
    ...(dayData?.food || []),
    ...(dayData?.drinks || []),
    ...(dayData?.coffee || []),
  ].some(e => e.trainer_comment);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-xl font-bold">Nutriční deník</h1>
        <p className="text-sm text-muted-foreground">Jednoduché sledování stravy</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !session ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Apple className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Začni sledovat stravu</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Zapiš co jíš a piješ. Trenér uvidí záznamy.
            </p>
            <Button 
              onClick={handleStartTracking}
              disabled={createSession.isPending}
              size="lg"
              className="gap-2"
            >
              {createSession.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Apple className="w-4 h-4" />
              )}
              Začít zapisovat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Week Strip */}
          <WeekStrip
            currentDate={selectedDate}
            completedDays={completedDays.map(d => new Date(d))}
            onDaySelect={setSelectedDate}
          />

          {/* Habit Widgets Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Water Goal Widget */}
            <WaterGoalWidget
              currentMl={waterIntake}
              goalMl={habitSettings?.water_goal_ml || 2000}
            />

            {/* Caffeine Window Widget */}
            <CaffeineWindowWidget
              entries={caffeineEntriesForWidget}
              sleepTime={habitSettings?.sleep_time || null}
              cutoffMinutes={habitSettings?.caffeine_cutoff_minutes || 480}
            />
          </div>

          {/* Day Note Section */}
          <div className="flex items-center gap-2">
            <DayNoteInput
              currentNote={dayNote?.client_note || ''}
              onSave={handleSaveDayNote}
              isSaving={upsertDayNote.isPending}
            />
            {dayNote?.trainer_note && (
              <span className="text-xs text-muted-foreground ml-2">
                (Trenér odpověděl)
              </span>
            )}
          </div>

          {/* Day Note Display */}
          {(dayNote?.client_note || dayNote?.trainer_note) && (
            <DayNoteDisplay
              clientNote={dayNote?.client_note || undefined}
              trainerNote={dayNote?.trainer_note || undefined}
              onEditClient={() => {/* handled by DayNoteInput above */}}
            />
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary">{todayFoodCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Jídel</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-500">{waterMl}</div>
              <div className="text-[10px] text-muted-foreground uppercase">ml vody</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{todayCoffeeCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Kávy</div>
            </div>
          </div>

          {/* Trainer Comment Notice */}
          {hasTrainerComments && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm">Trenér komentoval některé záznamy</span>
            </div>
          )}

          {/* Habit Settings Link */}
          <HabitSettingsForm
            clientId={clientId || ''}
            editedBy="client"
            mode="dialog"
            triggerLabel="⚙️ Nastavení návyků"
          />

          {/* Quick Actions - Main Focus */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Quick Meal Buttons - Large and Easy to Tap */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickMeal('breakfast')}
                  className="h-16 flex-col gap-1 text-left"
                >
                  <span className="text-lg">🌅</span>
                  <span className="text-sm font-medium">Snídaně</span>
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickMeal('lunch')}
                  className="h-16 flex-col gap-1 text-left"
                >
                  <span className="text-lg">☀️</span>
                  <span className="text-sm font-medium">Oběd</span>
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickMeal('dinner')}
                  className="h-16 flex-col gap-1 text-left"
                >
                  <span className="text-lg">🌙</span>
                  <span className="text-sm font-medium">Večeře</span>
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickMeal('snack')}
                  className="h-16 flex-col gap-1 text-left"
                >
                  <span className="text-lg">🍎</span>
                  <span className="text-sm font-medium">Svačina</span>
                </Button>
              </div>

              {/* Quick Water Buttons */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Rychlé přidání vody</span>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_WATER_AMOUNTS.map((item) => (
                    <Button 
                      key={item.amount}
                      variant="secondary"
                      size="lg"
                      onClick={() => handleQuickWater(item.amount)}
                      disabled={quickWater.isPending}
                      className="h-14 flex-col gap-1"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-medium">{item.amount} ml</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Coffee/Tea */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={() => handleQuickCoffee('espresso')}
                  className="h-14 gap-2"
                >
                  <Coffee className="w-5 h-5 text-amber-600" />
                  <span className="font-medium">+1 Káva</span>
                </Button>
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={() => handleQuickCoffee('tea')}
                  className="h-14 gap-2"
                >
                  <span className="text-lg">🍵</span>
                  <span className="font-medium">+1 Čaj</span>
                </Button>
              </div>

              {/* Recent/Favorite Foods - Quick Re-add */}
              {recentFoods.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Oblíbená & nedávná jídla</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentFoods.map((food, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickReaddFood(food)}
                        disabled={addFood.isPending}
                        className="h-auto py-1.5 px-3 text-xs bg-muted/50 hover:bg-muted"
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5 text-muted-foreground" />
                        <span className="truncate max-w-[140px]">{food.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Other Button */}
              <Button 
                onClick={() => {
                  setPrefilledMealType(undefined);
                  setShowAddForm(true);
                }} 
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Přidat jiný záznam
              </Button>
            </CardContent>
          </Card>

          {/* Add Form Modal - SimpleFoodForm */}
          <SimpleFoodForm
            open={showAddForm}
            onOpenChange={(open) => {
              setShowAddForm(open);
              if (!open) setPrefilledMealType(undefined);
            }}
            sessionId={session?.id || ''}
            clientId={clientId || ''}
            selectedDate={selectedDate}
            prefilledMealType={prefilledMealType}
          />

          {/* Day's Entries */}
          {dayData && (
            <TodayEntries
              food={dayData.food}
              drinks={dayData.drinks}
              coffee={dayData.coffee}
              isLoading={dayLoading}
              selectedDate={selectedDate}
              onEditFood={(entry) => setEditingEntry({ type: 'food', entry })}
              onEditDrink={(entry) => setEditingEntry({ type: 'drink', entry })}
              onEditCoffee={(entry) => setEditingEntry({ type: 'coffee', entry })}
              onDeleteFood={(id) => handleDeleteEntry('food', id)}
              onDeleteDrink={(id) => handleDeleteEntry('drink', id)}
              onDeleteCoffee={(id) => handleDeleteEntry('coffee', id)}
            />
          )}

          {/* Edit Dialog */}
          {editingEntry && session && clientId && (
            <EditEntryDialog
              open={!!editingEntry}
              onOpenChange={(open) => !open && setEditingEntry(null)}
              type={editingEntry.type}
              entry={editingEntry.entry}
              sessionId={session.id}
              clientId={clientId}
            />
          )}
        </div>
      )}
    </div>
  );
}
