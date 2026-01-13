import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Target,
  Zap,
  Award
} from 'lucide-react';
import { usePeerChallengeXPStats, useClientXP } from '@/hooks/usePeerChallengeXPStats';
import { cn } from '@/lib/utils';

export function XPBettingStats() {
  const { data: stats, isLoading: loadingStats } = usePeerChallengeXPStats();
  const { data: clientXP, isLoading: loadingXP } = useClientXP();

  const isLoading = loadingStats || loadingXP;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalXP = clientXP?.total_xp || 0;
  const winRate = stats && stats.total_bets > 0 
    ? Math.round((stats.wins / stats.total_bets) * 100) 
    : 0;
  const netXP = stats ? stats.total_won - stats.total_lost : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Tvoje XP statistiky
          </CardTitle>
          <Badge variant="outline" className="text-lg font-bold">
            {totalXP.toLocaleString()} XP
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!stats || stats.total_bets === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Zatím žádné sázky</p>
            <p className="text-xs mt-1">Vsaď XP na výzvu a poraz ostatní!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="flex items-center justify-center gap-1 text-green-500 font-bold text-lg">
                  <TrendingUp className="h-4 w-4" />
                  {stats.wins}
                </div>
                <div className="text-xs text-muted-foreground">Výhry</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="flex items-center justify-center gap-1 text-red-500 font-bold text-lg">
                  <TrendingDown className="h-4 w-4" />
                  {stats.losses}
                </div>
                <div className="text-xs text-muted-foreground">Prohry</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className={cn(
                  "font-bold text-lg",
                  winRate >= 50 ? "text-green-500" : "text-red-500"
                )}>
                  {winRate}%
                </div>
                <div className="text-xs text-muted-foreground">Úspěšnost</div>
              </div>
            </div>

            {/* XP balance */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <span className="text-sm text-muted-foreground">Celková bilance XP</span>
              <span className={cn(
                "font-bold",
                netXP > 0 ? "text-green-500" : netXP < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {netXP > 0 ? '+' : ''}{netXP.toLocaleString()} XP
              </span>
            </div>

            {/* Streak & records */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                <Flame className={cn(
                  "h-5 w-5",
                  stats.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"
                )} />
                <div>
                  <div className="text-sm font-medium">{stats.current_streak} 🔥</div>
                  <div className="text-xs text-muted-foreground">Aktuální série</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                <Award className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">{stats.best_streak}</div>
                  <div className="text-xs text-muted-foreground">Nejlepší série</div>
                </div>
              </div>
            </div>

            {/* Record wins/losses */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Největší výhra: <span className="text-green-500 font-medium">+{stats.biggest_win} XP</span>
              </span>
              <span>
                Největší prohra: <span className="text-red-500 font-medium">-{stats.biggest_loss} XP</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
