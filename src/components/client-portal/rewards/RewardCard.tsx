import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TrainerReward } from '@/hooks/useTrainerRewards';
import { useRedeemReward } from '@/hooks/useRedeemReward';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Gift, 
  Coffee, 
  Dumbbell, 
  Star, 
  Coins, 
  Sparkles,
  Percent,
  Trophy,
  Heart,
  Zap,
  Package,
  Crown
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  gift: Gift,
  coffee: Coffee,
  dumbbell: Dumbbell,
  star: Star,
  sparkles: Sparkles,
  percent: Percent,
  trophy: Trophy,
  heart: Heart,
  zap: Zap,
  package: Package,
  crown: Crown,
};

interface RewardCardProps {
  reward: TrainerReward;
  lpBalance: number;
  index?: number;
}

export function RewardCard({ reward, lpBalance, index = 0 }: RewardCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { redeemReward, isRedeeming, canAfford } = useRedeemReward();
  
  const Icon = ICON_MAP[reward.icon_key] || Gift;
  const affordable = canAfford(reward.lp_cost);
  const quantityLeft = reward.quantity_available !== null 
    ? reward.quantity_available - reward.quantity_redeemed 
    : null;

  const handleRedeem = () => {
    redeemReward({
      rewardId: reward.id,
      lpCost: reward.lp_cost,
      rewardName: reward.name,
    });
    setShowConfirm(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className={cn(
          "relative overflow-hidden transition-all hover:shadow-lg",
          !affordable && "opacity-60"
        )}>
          {quantityLeft !== null && quantityLeft <= 3 && (
            <Badge 
              className="absolute top-2 right-2 bg-orange-500 text-white"
              variant="secondary"
            >
              Zbývá {quantityLeft}
            </Badge>
          )}
          
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                affordable 
                  ? "bg-primary/10" 
                  : "bg-muted"
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  affordable ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{reward.name}</CardTitle>
                {reward.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {reward.description}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Coins className="w-4 h-4" />
                {reward.lp_cost} LP
              </div>
              <Button 
                size="sm" 
                disabled={!affordable || isRedeeming}
                variant={affordable ? 'default' : 'secondary'}
                onClick={() => setShowConfirm(true)}
              >
                {isRedeeming ? 'Vyměňuji...' : 'Vyměnit'}
              </Button>
            </div>
            
            {!affordable && (
              <p className="text-xs text-muted-foreground mt-2">
                Chybí ti ještě {reward.lp_cost - lpBalance} LP
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrdit výměnu</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chceš vyměnit <strong>{reward.lp_cost} LP</strong> za{' '}
              <strong>{reward.name}</strong>?
              <br /><br />
              Po výměně ti zbude {lpBalance - reward.lp_cost} LP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleRedeem}>
              Vyměnit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
