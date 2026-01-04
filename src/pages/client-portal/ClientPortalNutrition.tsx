import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, Plus, Droplets, UtensilsCrossed, History, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodLogForm } from '@/components/client-portal/nutrition/FoodLogForm';
import { TodayEntries } from '@/components/client-portal/nutrition/TodayEntries';
import { EditEntryDialog } from '@/components/client-portal/nutrition/EditEntryDialog';
import { NutritionDailySummary } from '@/components/client-portal/nutrition/NutritionDailySummary';
import { WeekStrip } from '@/components/client-portal/nutrition/WeekStrip';
import { NutritionHistory } from '@/components/client-portal/nutrition/NutritionHistory';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { type MealTypeId } from '@/components/client-portal/nutrition/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useQuickAddWater, 
  useDeleteNutritionEntryPortal 
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

      // First check if there's an active session
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

      // Create ongoing session (1 year duration, effectively unlimited)
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

// Hook to get completed days
function useCompletedDays(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['client-nutrition-completed-days', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('nutrition_food_entries')
        .select('entry_date')
        .eq('session_id', sessionId);

      if (error) throw error;
      return [...new Set((data || []).map(e => e.entry_date))];
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
  const deleteEntry = useDeleteNutritionEntryPortal();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [prefilledMealType, setPrefilledMealType] = useState<MealTypeId | undefined>();
  const [activeTab, setActiveTab] = useState('today');

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
      toast.success('Voda přidána (+300 ml)');
      trackPortalEvent('client_portal_quick_water');
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
      toast.success('Záznam smazán');
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

  // Calculate water from drinks
  const waterMl = dayData?.drinks
    ?.filter(d => d.drink_type?.toLowerCase().includes('water') || d.drink_type === 'water')
    .reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0;

  // Count entries for stats
  const totalEntries = completedDays.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutriční deník</h1>
        <p className="text-muted-foreground">Zapisuj svůj jídelníček</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !session ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Apple className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Začni sledovat svou stravu</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Zapisuj co jíš a piješ. Trenér uvidí tvé záznamy.
            </p>
            <Button 
              onClick={handleStartTracking}
              disabled={createSession.isPending}
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="today" className="flex-1 gap-2">
              <Calendar className="h-4 w-4" />
              Dnešní zápis
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-2">
              <History className="h-4 w-4" />
              Historie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 mt-4">
            {/* Week Strip Navigation */}
            <WeekStrip
              currentDate={selectedDate}
              completedDays={completedDays.map(d => new Date(d))}
              onDaySelect={setSelectedDate}
            />

            {/* Daily Summary */}
            {dayData && (
              <NutritionDailySummary
                foodCount={dayData.food?.length || 0}
                drinkCount={dayData.drinks?.length || 0}
                coffeeCount={dayData.coffee?.length || 0}
                waterMl={waterMl}
                campaignProgress={totalEntries}
                campaignTotal={0}
              />
            )}

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="w-full gap-2"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                Přidat záznam
              </Button>
              
              <div className="grid grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickMeal('breakfast')}
                  className="flex-col h-auto py-2 gap-1"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="text-xs">Snídaně</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickMeal('lunch')}
                  className="flex-col h-auto py-2 gap-1"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="text-xs">Oběd</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickMeal('dinner')}
                  className="flex-col h-auto py-2 gap-1"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="text-xs">Večeře</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleQuickWater}
                  disabled={quickWater.isPending}
                  className="flex-col h-auto py-2 gap-1"
                >
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs">+300ml</span>
                </Button>
              </div>
            </div>

            {/* Add Form */}
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
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historie záznamů</CardTitle>
              </CardHeader>
              <CardContent>
                {completedDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Zatím nemáš žádné záznamy
                  </p>
                ) : (
                  <div className="space-y-2">
                    {completedDays.sort().reverse().slice(0, 14).map((dateStr) => (
                      <button
                        key={dateStr}
                        onClick={() => {
                          setSelectedDate(new Date(dateStr));
                          setActiveTab('today');
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                      >
                        <span className="text-sm font-medium">
                          {format(new Date(dateStr), 'd. M. yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Zobrazit →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
