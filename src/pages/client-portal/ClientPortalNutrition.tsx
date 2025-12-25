import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientNutritionCampaign, useClientTodayNutrition } from '@/hooks/useClientPortalData';
import { useQuickAddWater } from '@/hooks/useClientPortalNutrition';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Apple, CheckCircle2, AlertCircle, Clock, Plus, Droplets } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FoodLogForm } from '@/components/client-portal/nutrition/FoodLogForm';
import { TodayEntries } from '@/components/client-portal/nutrition/TodayEntries';
import { toast } from 'sonner';

export default function ClientPortalNutrition() {
  const { clientId } = useClientPortal();
  const { data: campaign, isLoading } = useClientNutritionCampaign(clientId ?? undefined);
  const { data: todayData, isLoading: todayLoading } = useClientTodayNutrition(
    clientId ?? undefined, 
    campaign?.id
  );
  const quickWater = useQuickAddWater();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_nutrition');

  const [showAddForm, setShowAddForm] = useState(false);

  const progressPercent = campaign ? (campaign.daysCompleted / campaign.totalDays) * 100 : 0;

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  // Track campaign view
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
      toast.success('Voda přidána');
      trackPortalEvent('client_portal_quick_water');
    } catch (error) {
      toast.error('Nepodařilo se přidat');
    }
  };

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
            <p className="text-sm text-muted-foreground">
              Kontaktuj svého trenéra pro nastavení sledování stravy.
            </p>
          </CardContent>
        </Card>
      ) : (
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

          {/* Quick Actions */}
          {campaign.isActive && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="flex-1 gap-2"
              >
                <Plus className="w-4 h-4" />
                Přidat záznam
              </Button>
              <Button 
                variant="outline" 
                onClick={handleQuickWater}
                disabled={quickWater.isPending}
                className="gap-2"
              >
                <Droplets className="w-4 h-4" />
                + Voda
              </Button>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && campaign.isActive && clientId && (
            <FoodLogForm
              sessionId={campaign.id}
              clientId={clientId}
              onClose={() => setShowAddForm(false)}
            />
          )}

          {/* Today's Entries */}
          {campaign.isActive && todayData && (
            <TodayEntries
              food={todayData.food}
              drinks={todayData.drinks}
              coffee={todayData.coffee}
              isLoading={todayLoading}
            />
          )}
        </>
      )}
    </div>
  );
}
