import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, Plus, Droplets, Coffee, Loader2, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FoodLogForm } from '@/components/client-portal/nutrition/FoodLogForm';
import { TodayEntries } from '@/components/client-portal/nutrition/TodayEntries';
import { EditEntryDialog } from '@/components/client-portal/nutrition/EditEntryDialog';
import { WeekStrip } from '@/components/client-portal/nutrition/WeekStrip';
import { WaterGoalWidget, calculateDailyWaterIntake } from '@/components/client-portal/nutrition/WaterGoalWidget';
import { CaffeineWindowWidget } from '@/components/client-portal/nutrition/CaffeineWindowWidget';
import { QuickAddTimeDialog } from '@/components/client-portal/nutrition/QuickAddTimeDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { type MealTypeId } from '@/components/client-portal/nutrition/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useDeleteNutritionEntryPortal,
} from '@/hooks/useClientPortalNutrition';
import { useNutritionXP } from '@/hooks/useNutritionXP';
import { useEffectiveHabitSettings } from '@/hooks/useClientHabitSettings';

type EditingEntry = {
  type: 'food' | 'drink' | 'coffee';
  entry: any;
} | null;

type QuickAddDialogState = {
  open: boolean;
  type: 'water' | 'coffee';
  value: number | string;
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

export default function ClientPortalNutritionTab() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const { session, isLoading, createSession } = useOngoingNutritionSession(clientId ?? undefined, trainerId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: dayData, isLoading: dayLoading } = useNutritionByDate(
    clientId ?? undefined, 
    session?.id,
    selectedDateStr
  );
  const { data: completedDays = [] } = useCompletedDays(session?.id);
  const deleteEntry = useDeleteNutritionEntryPortal();
  const nutritionXP = useNutritionXP();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');
  
  // Habit settings for widgets
  const { settings: habitSettings } = useEffectiveHabitSettings(clientId ?? undefined);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [prefilledMealType, setPrefilledMealType] = useState<MealTypeId | undefined>();
  const [quickAddDialog, setQuickAddDialog] = useState<QuickAddDialogState>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Calculate water intake for widget
  const waterIntake = dayData?.drinks ? calculateDailyWaterIntake(dayData.drinks) : 0;

  // Prepare caffeine entries for widget
  const caffeineEntriesForWidget = (dayData?.coffee || []).map(c => ({
    id: c.id,
    entry_time: c.occurred_at 
      ? format(new Date(c.occurred_at), 'HH:mm')
      : c.entry_time || '12:00',
    coffee_type: c.coffee_type || 'espresso',
    is_caffeinated: c.is_caffeinated !== false,
    count: c.count || 1,
  }));

  // Handle URL action parameter - auto-open add form
  useEffect(() => {
    const actionParam = searchParams.get('action');
    if (actionParam === 'add-food' && session) {
      setShowAddForm(true);
      // Clean up URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, session]);

  // Open dialog for quick water add
  const handleQuickWaterClick = (amount: number = 300) => {
    setQuickAddDialog({ open: true, type: 'water', value: amount });
  };

  // Open dialog for quick coffee add
  const handleQuickCoffeeClick = (coffeeType: 'espresso' | 'tea' = 'espresso') => {
    setQuickAddDialog({ open: true, type: 'coffee', value: coffeeType });
  };

  // Confirm quick add with selected time
  const handleQuickAddConfirm = async (time: string) => {
    if (!session || !clientId || !quickAddDialog) return;
    
    setIsQuickAdding(true);
    try {
      const entryDate = selectedDateStr;
      const occurredAt = new Date(`${entryDate}T${time}:00`).toISOString();

      if (quickAddDialog.type === 'water') {
        const { error } = await supabase
          .from('nutrition_drink_entries')
          .insert({
            session_id: session.id,
            client_id: clientId,
            entry_date: entryDate,
            entry_time: time,
            occurred_at: occurredAt,
            drink_type: 'water',
            amount_ml: quickAddDialog.value as number,
            created_from: 'web',
          });
        
        if (error) throw error;
        toast.success(`+${quickAddDialog.value} ml vody`);
        trackPortalEvent('client_portal_quick_water', { amount: quickAddDialog.value });
        nutritionXP.mutate({ clientId, date: selectedDateStr, entryType: 'drink' });
      } else {
        const coffeeType = quickAddDialog.value as string;
        const { error } = await supabase
          .from('nutrition_coffee_entries')
          .insert({
            session_id: session.id,
            client_id: clientId,
            entry_date: entryDate,
            entry_time: time,
            occurred_at: occurredAt,
            coffee_type: coffeeType,
            count: 1,
            is_caffeinated: coffeeType !== 'tea',
            created_from: 'web',
          });
        
        if (error) throw error;
        toast.success(coffeeType === 'tea' ? 'Čaj přidán' : 'Káva přidána');
        trackPortalEvent('client_portal_quick_coffee', { coffeeType });
        nutritionXP.mutate({ clientId, date: selectedDateStr, entryType: 'coffee' });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date', clientId, session.id] });
      queryClient.invalidateQueries({ queryKey: ['client-nutrition-completed-days', session.id] });
      
      setQuickAddDialog(null);
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    } finally {
      setIsQuickAdding(false);
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
  const todayCoffeeCount = dayData?.coffee?.length || 0;

  // Check for trainer comments
  const hasTrainerComments = [
    ...(dayData?.food || []),
    ...(dayData?.drinks || []),
    ...(dayData?.coffee || []),
  ].some(e => e.trainer_comment);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!session) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      {/* Week Strip */}
      <WeekStrip
        currentDate={selectedDate}
        completedDays={completedDays.map(d => new Date(d))}
        onDaySelect={setSelectedDate}
      />

      {/* Habit Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <WaterGoalWidget
          currentMl={waterIntake}
          goalMl={habitSettings?.water_goal_ml || 2000}
          compact
        />
        <CaffeineWindowWidget
          entries={caffeineEntriesForWidget}
          sleepTime={habitSettings?.sleep_time || null}
          cutoffMinutes={habitSettings?.caffeine_cutoff_minutes || 480}
          compact
        />
      </div>

      {/* Single Add Button - ONE clear CTA */}
      <Button 
        onClick={() => {
          setPrefilledMealType(undefined);
          setShowAddForm(true);
        }}
        className="w-full gap-2 h-11"
        size="lg"
      >
        <Plus className="w-5 h-5" />
        Přidat jídlo nebo nápoj
      </Button>

      {/* Quick Add - Inline water/coffee buttons - NOW WITH TIME PROMPT */}
      <div className="flex gap-2">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => handleQuickWaterClick(300)}
          className="flex-1 h-9 gap-1.5"
        >
          <Droplets className="w-4 h-4 text-blue-500" />
          <span className="text-xs">+300ml</span>
        </Button>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => handleQuickCoffeeClick('espresso')}
          className="flex-1 h-9 gap-1.5"
        >
          <Coffee className="w-4 h-4 text-amber-600" />
          <span className="text-xs">+1 Káva</span>
        </Button>
      </div>

      {/* Quick Add Time Dialog */}
      {quickAddDialog && (
        <QuickAddTimeDialog
          open={quickAddDialog.open}
          onOpenChange={(open) => !open && setQuickAddDialog(null)}
          type={quickAddDialog.type}
          value={quickAddDialog.value}
          onConfirm={handleQuickAddConfirm}
          isPending={isQuickAdding}
        />
      )}

      {/* Trainer Comment Notice */}
      {hasTrainerComments && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 text-primary">
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="text-sm">Trenér komentoval záznamy</span>
        </div>
      )}

      {/* Day's Entries with stats in header */}
      <Card>
        <CardContent className="p-3">
          {/* Stats row - compact header */}
          <div className="flex items-center gap-3 mb-3 pb-2 border-b text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Apple className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">{todayFoodCount}</span>
              <span>jídel</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-foreground">{waterMl}</span>
              <span>ml</span>
            </div>
            <div className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium text-foreground">{todayCoffeeCount}</span>
            </div>
          </div>

          {/* Entries list */}
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
  );
}
