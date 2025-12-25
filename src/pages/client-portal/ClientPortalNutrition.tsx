import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientNutritionCampaign } from '@/hooks/useClientPortalData';
import { Apple, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientPortalNutrition() {
  const { clientId } = useClientPortal();
  const { data: campaign, isLoading } = useClientNutritionCampaign(clientId ?? undefined);

  const progressPercent = campaign ? (campaign.daysCompleted / campaign.totalDays) * 100 : 0;

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

                {campaign.isActive && (
                  <Button className="w-full">
                    Vyplnit dnešní záznam
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Entry - placeholder */}
          {campaign.isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rychlý záznam</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Formulář pro rychlé vyplnění jídla, pití a kávy bude zde.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
