import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientNutritionCampaign, useClientTodayNutrition, useClientNutritionCompletedDays, useClientNutritionSessions } from '@/hooks/useClientPortalData';
import { useQuickAddWater, useDeleteNutritionEntryPortal } from '@/hooks/useClientPortalNutrition';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, CheckCircle2, AlertCircle, Clock, Plus, Droplets, UtensilsCrossed, History } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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

type EditingEntry = {
  type: 'food' | 'drink' | 'coffee';
  entry: any;
} | null;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;

export default function ClientPortalNutrition() {
  const { clientId } = useClientPortal();
  const { data: campaign, isLoading } = useClientNutritionCampaign(clientId ?? undefined);
  const { data: allSessions, isLoading: sessionsLoading } = useClientNutritionSessions(clientId ?? undefined);
  const { data: todayData, isLoading: todayLoading } = useClientTodayNutrition(
    clientId ?? undefined, 
    campaign?.id
  );
  const { data: completedDays = [] } = useClientNutritionCompletedDays(campaign?.id);
  const quickWater = useQuickAddWater();
  const deleteEntry = useDeleteNutritionEntryPortal();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [prefilledMealType, setPrefilledMealType] = useState<MealType>(null);
  const [activeTab, setActiveTab] = useState('current');

  const progressPercent = campaign ? (campaign.daysCompleted / campaign.totalDays) * 100 : 0;

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  useEffect(() => {
    if (campaign) {
      trackPortalEvent('client_portal_view_campaign', { 
        is_active: campaign.isActive,
        progress_percent: progressPercent
      });
    }
  }, [campaign, progressPercent, trackPortalEvent]);

  const handleQuickWater = async () => {
    if (!campaign || !clientId) return;
    
    try {
      await quickWater.mutateAsync({
        sessionId: campaign.id,
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
    if (!campaign || !clientId) return;
    
    try {
      await deleteEntry.mutateAsync({
        type,
        entryId,
        sessionId: campaign.id,
        clientId,
      });
      toast.success('Záznam smazán');
      trackPortalEvent('client_portal_delete_entry', { type });
    } catch (error) {
      toast.error('Nepodařilo se smazat');
    }
  };

  const handleQuickMeal = (mealType: MealType) => {
    setPrefilledMealType(mealType);
    setShowAddForm(true);
  };

  // Calculate water from drinks
  const waterMl = todayData?.drinks
    ?.filter(d => d.drink_type?.toLowerCase().includes('voda') || d.drink_type?.toLowerCase().includes('water'))
    .reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0;

  const hasHistory = allSessions && allSessions.length > 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Strava</h1>
        <p className="text-muted-foreground">Nutriční deník</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !campaign ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Apple className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Nemáš aktivní nutriční kampaň</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Kontaktuj svého trenéra pro nastavení sledování stravy.
            </p>
            <Button variant="outline" size="sm">
              Kontaktovat trenéra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs for Current/History when there's history */}
          {hasHistory ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="current" className="flex-1 gap-2">
                  <Apple className="h-4 w-4" />
                  Aktuální kampaň
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 gap-2">
                  <History className="h-4 w-4" />
                  Historie
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-6 mt-4">
                {renderCurrentCampaign()}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <NutritionHistory 
                  sessions={allSessions || []} 
                  isLoading={sessionsLoading}
                  currentSessionId={campaign?.id}
                />
              </TabsContent>
            </Tabs>
          ) : (
            renderCurrentCampaign()
          )}
        </>
      )}
    </div>
  );

  function renderCurrentCampaign() {
    if (!campaign) return null;

    return (
      <>
        {/* Campaign Status */}
        <Card className={cn(
          campaign.isActive && "border-success/50 bg-success/5",
          campaign.isExpired && "border-warning/50 bg-warning/5"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {campaign.isActive ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : campaign.isExpired ? (
                <AlertCircle className="w-4 h-4 text-warning" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
              {campaign.isActive ? 'Aktivní kampaň' : campaign.isExpired ? 'Kampaň vypršela' : 'Dokončeno'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Vyplněno</span>
                  <span className="font-medium">{campaign.daysCompleted} / {campaign.totalDays} dní</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Strip Navigation */}
        {campaign.isActive && (
          <WeekStrip
            currentDate={selectedDate}
            completedDays={completedDays}
            onDaySelect={setSelectedDate}
          />
        )}

        {/* Daily Summary */}
        {campaign.isActive && todayData && (
          <NutritionDailySummary
            foodCount={todayData.food?.length || 0}
            drinkCount={todayData.drinks?.length || 0}
            coffeeCount={todayData.coffee?.length || 0}
            waterMl={waterMl}
            campaignProgress={campaign.daysCompleted}
            campaignTotal={campaign.totalDays}
          />
        )}

        {/* Quick Actions */}
        {campaign.isActive && (
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
        )}

        {/* Add Form */}
        {showAddForm && campaign.isActive && clientId && (
          <FoodLogForm
            sessionId={campaign.id}
            clientId={clientId}
            onClose={() => {
              setShowAddForm(false);
              setPrefilledMealType(null);
            }}
          />
        )}

        {/* Today's Entries */}
        {campaign.isActive && todayData && (
          <TodayEntries
            food={todayData.food}
            drinks={todayData.drinks}
            coffee={todayData.coffee}
            isLoading={todayLoading}
            onEditFood={(entry) => setEditingEntry({ type: 'food', entry })}
            onEditDrink={(entry) => setEditingEntry({ type: 'drink', entry })}
            onEditCoffee={(entry) => setEditingEntry({ type: 'coffee', entry })}
            onDeleteFood={(id) => handleDeleteEntry('food', id)}
            onDeleteDrink={(id) => handleDeleteEntry('drink', id)}
            onDeleteCoffee={(id) => handleDeleteEntry('coffee', id)}
          />
        )}

        {/* Edit Dialog */}
        {editingEntry && campaign && clientId && (
          <EditEntryDialog
            open={!!editingEntry}
            onOpenChange={(open) => !open && setEditingEntry(null)}
            type={editingEntry.type}
            entry={editingEntry.entry}
            sessionId={campaign.id}
            clientId={clientId}
          />
        )}
      </>
    );
  }
}
