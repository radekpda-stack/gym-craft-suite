import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientLoyalty, LP_MILESTONES, getCurrentMilestone, getNextMilestone } from '@/hooks/useClientLoyalty';
import { useIsModuleEnabledForClient } from '@/hooks/useTrainerModuleSettings';
import { Gift, Lock, Coins, Star, Coffee, Dumbbell, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Placeholder rewards - will be configured by trainer later
const PLACEHOLDER_REWARDS = [
  {
    id: 'reward-1',
    name: 'Proteinový shake zdarma',
    description: 'Jeden proteinový shake po tréninku',
    lpCost: 50,
    icon: Coffee,
    available: false,
  },
  {
    id: 'reward-2',
    name: 'Sleva 10% na suplementy',
    description: 'Sleva na jakýkoliv produkt v obchodě',
    lpCost: 100,
    icon: Gift,
    available: false,
  },
  {
    id: 'reward-3',
    name: 'Trénink navíc',
    description: 'Jeden trénink s trenérem zdarma',
    lpCost: 300,
    icon: Dumbbell,
    available: false,
  },
  {
    id: 'reward-4',
    name: 'VIP konzultace',
    description: 'Hodinová konzultace výživy nebo tréninku',
    lpCost: 500,
    icon: Star,
    available: false,
  },
];

export default function ClientPortalRewards() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: loyalty, isLoading } = useClientLoyalty(clientId ?? undefined);
  const isRewardsEnabled = useIsModuleEnabledForClient(clientAccount?.trainer_id, 'rewards_system');

  // If rewards system is disabled, redirect to overview
  if (!isRewardsEnabled) {
    return <Navigate to="/zona" replace />;
  }

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
                <p className="text-3xl font-bold">{loyalty?.points_balance || 0}</p>
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

      {/* Rewards - Coming Soon */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Dostupné odměny
          <Badge variant="secondary">Již brzy</Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLACEHOLDER_REWARDS.map((reward, index) => {
            const canAfford = (loyalty?.points_balance || 0) >= reward.lpCost;
            const Icon = reward.icon;
            
            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden opacity-75">
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Badge variant="secondary" className="text-base">
                      <Lock className="w-4 h-4 mr-1" />
                      Již brzy
                    </Badge>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{reward.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {reward.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500 font-semibold">
                        <Coins className="w-4 h-4" />
                        {reward.lpCost} LP
                      </div>
                      <Button 
                        size="sm" 
                        disabled={!canAfford || !reward.available}
                        variant={canAfford ? 'default' : 'secondary'}
                      >
                        Vyměnit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm text-muted-foreground text-center">
            <p>
              💡 Věrnostní body (LP) získáváš za tréninky, splněné výzvy a další aktivity.
            </p>
            <p>
              Čím víc trénuješ, tím víc bodů získáš! Odměny budou brzy k dispozici.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
