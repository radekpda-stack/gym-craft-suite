import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, Plus, Droplets, UtensilsCrossed, Coffee, Loader2, Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FoodLogForm } from '@/components/client-portal/nutrition/FoodLogForm';
import { TodayEntries } from '@/components/client-portal/nutrition/TodayEntries';
import { EditEntryDialog } from '@/components/client-portal/nutrition/EditEntryDialog';
import { WeekStrip } from '@/components/client-portal/nutrition/WeekStrip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { type MealTypeId, type DrinkTypeId, type CoffeeTypeId } from '@/components/client-portal/nutrition/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useQuickAddWater, 
  useDeleteNutritionEntryPortal,
  useAddDrinkEntry,
  useAddCoffeeEntry,
} from '@/hooks/useClientPortalNutrition';

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
  const quickWater = useQuickAddWater();
  const addDrink = useAddDrinkEntry();
  const addCoffee = useAddCoffeeEntry();
  const deleteEntry = useDeleteNutritionEntryPortal();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [prefilledMealType, setPrefilledMealType] = useState<MealTypeId | undefined>();

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const handleQuickWater = async () => {
    if (!session || !clientId) return;
    
    try {
      await quickWater.mutateAsync({
        sessionId: session.id,
        clientId,
        amount: 300,
      });
      toast.success('+300 ml vody');
      trackPortalEvent('client_portal_quick_water');
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    }
  };

  const handleQuickCoffee = async () => {
    if (!session || !clientId) return;
    
    try {
      await addCoffee.mutateAsync({
        sessionId: session.id,
        clientId,
        entry: {
          coffee_type: 'espresso',
          count: 1,
        },
      });
      toast.success('Káva přidána');
      trackPortalEvent('client_portal_quick_coffee');
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

              {/* Quick Add Row - One Tap Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleQuickWater}
                  disabled={quickWater.isPending}
                  className="h-14 gap-2"
                >
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">+300ml vody</span>
                </Button>
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleQuickCoffee}
                  disabled={addCoffee.isPending}
                  className="h-14 gap-2"
                >
                  <Coffee className="w-5 h-5 text-amber-600" />
                  <span className="font-medium">+1 Káva</span>
                </Button>
              </div>

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

          {/* Add Form Modal */}
          {showAddForm && session && clientId && (
            <FoodLogForm
              sessionId={session.id}
              clientId={clientId}
              selectedDate={selectedDate}
              prefilledMealType={prefilledMealType}
              campaignStartDate={session.start_date}
              campaignEndDate={session.end_date}
              onClose={() => {
                setShowAddForm(false);
                setPrefilledMealType(undefined);
              }}
            />
          )}

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
