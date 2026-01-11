import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientLoyalty, LP_MILESTONES, getCurrentMilestone, getNextMilestone } from '@/hooks/useClientLoyalty';
import { useIsModuleEnabledForClient } from '@/hooks/useTrainerModuleSettings';
import { useAvailableRewards } from '@/hooks/useTrainerRewards';
import { RewardCard } from '@/components/client-portal/rewards/RewardCard';
import { RedemptionHistory } from '@/components/client-portal/rewards/RedemptionHistory';
import { Gift, Coins, Sparkles, ArrowLeft, PackageOpen } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ClientPortalRewards() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: loyalty, isLoading: loyaltyLoading } = useClientLoyalty(clientId ?? undefined);
  const { data: rewards, isLoading: rewardsLoading } = useAvailableRewards();
  const isRewardsEnabled = useIsModuleEnabledForClient(clientAccount?.trainer_id, 'rewards_system');

  // If rewards system is disabled, redirect to overview
  if (!isRewardsEnabled) {
    return <Navigate to="/zona" replace />;
  }

  const isLoading = loyaltyLoading || rewardsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const currentMilestone = getCurrentMilestone(loyalty?.lifetime_points || 0);
  const nextMilestone = getNextMilestone(loyalty?.lifetime_points || 0);
  const lpBalance = loyalty?.points_balance || 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/zona">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-500" />
            Odměny
          </h1>
          <p className="text-sm text-muted-foreground">
            Vyměň své věrnostní body za odměny
          </p>
        </div>
      </div>

      {/* LP Balance Card */}
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
                <Coins className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{lpBalance}</p>
                <p className="text-sm text-muted-foreground">Dostupné LP</p>
              </div>
            </div>
            {currentMilestone && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-base px-3 py-1">
                {currentMilestone.icon} {currentMilestone.name}
              </Badge>
            )}
          </div>
          
          {nextMilestone && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Další úroveň: {nextMilestone.icon} {nextMilestone.name}
                </span>
                <span>{loyalty?.lifetime_points || 0} / {nextMilestone.points} LP</span>
              </div>
              <Progress value={nextMilestone.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Věrnostní úrovně
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LP_MILESTONES.map((milestone) => {
            const achieved = (loyalty?.lifetime_points || 0) >= milestone.points;
            return (
              <motion.div
                key={milestone.points}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: milestone.points / 1000 * 0.3 }}
              >
                <Card className={`text-center ${achieved ? 'border-amber-500/50 bg-amber-500/5' : 'opacity-60'}`}>
                  <CardContent className="pt-4 pb-3">
                    <span className="text-2xl">{milestone.icon}</span>
                    <p className="font-medium mt-1">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">{milestone.points} LP</p>
                    {achieved && (
                      <Badge className="mt-2 bg-amber-500 text-white">Dosaženo</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Available Rewards */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Dostupné odměny
        </h2>
        
        {rewards && rewards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward, index) => (
              <RewardCard 
                key={reward.id} 
                reward={reward} 
                lpBalance={lpBalance}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center">
              <PackageOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Trenér zatím nenastavil žádné odměny.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sbírej body a brzy tu budou odměny!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Redemption History */}
      <RedemptionHistory />

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm text-muted-foreground text-center">
            <p>
              💡 Věrnostní body (LP) získáváš za tréninky, splněné výzvy a další aktivity.
            </p>
            <p>
              Čím víc trénuješ, tím víc bodů získáš!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
