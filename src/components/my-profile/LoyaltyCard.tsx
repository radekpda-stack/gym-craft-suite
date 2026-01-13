import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  useClientLoyalty, 
  useLoyaltyHistory, 
  getNextMilestone, 
  getCurrentMilestone 
} from '@/hooks/useClientLoyalty';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Star, ShoppingBag, Gift, RefreshCcw, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useIsModuleEnabledForClient } from '@/hooks/useTrainerModuleSettings';

interface LoyaltyCardProps {
  clientId: string;
}

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  purchase: {
    icon: ShoppingBag,
    label: 'Nákup',
    color: 'text-accent',
  },
  refund: {
    icon: RefreshCcw,
    label: 'Vrácení',
    color: 'text-destructive',
  },
  bonus: {
    icon: Gift,
    label: 'Bonus',
    color: 'text-success',
  },
  redemption: {
    icon: Star,
    label: 'Využití',
    color: 'text-warning',
  },
};

const DEFAULT_SOURCE = {
  icon: Coins,
  label: 'LP',
  color: 'text-primary',
};

export function LoyaltyCard({ clientId }: LoyaltyCardProps) {
  const { clientAccount } = useClientPortal();
  const { data: loyalty, isLoading: loyaltyLoading } = useClientLoyalty(clientId);
  const { data: history, isLoading: historyLoading } = useLoyaltyHistory(clientId, 10);
  const isRewardsEnabled = useIsModuleEnabledForClient(clientAccount?.trainer_id, 'rewards_system');

  if (loyaltyLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!loyalty) {
    return null;
  }

  const nextMilestone = getNextMilestone(loyalty.lifetime_points);
  const currentMilestone = getCurrentMilestone(loyalty.lifetime_points);

  return (
    <Card className="relative overflow-hidden border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
      <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="w-5 h-5 text-warning" />
            Věrnostní body (LP)
          </CardTitle>
          {currentMilestone && (
            <Badge variant="secondary" className="bg-warning/10 text-warning">
              {currentMilestone.icon} {currentMilestone.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-warning/10 border-2 border-warning flex items-center justify-center">
            <span className="text-xl font-bold text-warning">{loyalty.points_balance}</span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold">LP k využití</p>
            <p className="text-sm text-muted-foreground">
              Celkem získáno: {loyalty.lifetime_points.toLocaleString('cs-CZ')} LP
            </p>
          </div>
        </div>

        {/* Next Milestone Progress */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Další úroveň: {nextMilestone.icon} {nextMilestone.name}
              </span>
              <span className="font-medium">
                {loyalty.lifetime_points} / {nextMilestone.points} LP
              </span>
            </div>
            <Progress value={nextMilestone.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Zbývá {nextMilestone.remaining} LP
            </p>
          </div>
        )}

        {/* History Preview */}
        {!historyLoading && history && history.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Poslední transakce</p>
            <div className="space-y-1">
              {history.slice(0, 3).map((entry) => {
                const config = SOURCE_CONFIG[entry.source_type] || DEFAULT_SOURCE;
                const Icon = config.icon;
                
                return (
                  <div key={entry.id} className="flex items-center gap-2 text-sm">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="flex-1 truncate">{config.label}</span>
                    <span className={entry.points > 0 ? 'text-success' : 'text-destructive'}>
                      {entry.points > 0 ? '+' : ''}{entry.points} LP
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { 
                        addSuffix: true, 
                        locale: cs 
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link to Rewards - only show if rewards system is enabled */}
        {isRewardsEnabled && (
          <Link to="/zona/odmeny">
            <Button variant="outline" className="w-full mt-2" size="sm">
              <Gift className="w-4 h-4 mr-2" />
              Zobrazit odměny
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
