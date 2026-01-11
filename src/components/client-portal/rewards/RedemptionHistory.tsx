import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRedemptions, RewardRedemption } from '@/hooks/useTrainerRewards';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { History, CheckCircle2, Clock, XCircle, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending: {
    label: 'Čeká na vyřízení',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600',
  },
  fulfilled: {
    label: 'Splněno',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-600',
  },
  cancelled: {
    label: 'Zrušeno',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600',
  },
};

function RedemptionItem({ redemption }: { redemption: RewardRedemption }) {
  const status = STATUS_CONFIG[redemption.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        status.className
      )}>
        <StatusIcon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {redemption.reward?.name || 'Odměna'}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(redemption.redeemed_at), 'd. MMMM yyyy', { locale: cs })}
        </p>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1 text-amber-500 font-medium text-sm">
          <Coins className="w-3 h-3" />
          -{redemption.lp_spent}
        </div>
        <Badge variant="secondary" className={cn("text-xs", status.className)}>
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

export function RedemptionHistory() {
  const { data: redemptions, isLoading } = useMyRedemptions();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!redemptions || redemptions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Historie výměn
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {redemptions.slice(0, 5).map((redemption) => (
          <RedemptionItem key={redemption.id} redemption={redemption} />
        ))}
        
        {redemptions.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            A dalších {redemptions.length - 5} výměn...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
