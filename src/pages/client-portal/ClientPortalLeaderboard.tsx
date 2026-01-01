import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Zap, Dumbbell, Crown, ShieldCheck, Users } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useLeaderboard, useLeaderboardSettings, LeaderboardEntry } from '@/hooks/useClientGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function LeaderboardRow({ entry, currentClientId }: { entry: LeaderboardEntry; currentClientId?: string }) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-all",
        isCurrentUser 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-muted/50",
        entry.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
      )}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {getRankIcon(entry.rank)}
      </div>
      
      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
          entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
          entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
          "bg-muted text-muted-foreground"
        )}>
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isCurrentUser && "text-primary"
            )}>
              {entry.nickname}
            </span>
            
            {isCurrentUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                Ty
              </Badge>
            )}
            
            {entry.is_verified && (
              <Tooltip>
                <TooltipTrigger>
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Verified – 70%+ tréninků s trenérem</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      
      {/* Score */}
      <div className="text-right shrink-0">
        <span className="font-bold text-lg">{entry.xp || entry.workout_count}</span>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">
          Zatím tu nikdo není
        </p>
        <p className="text-sm text-muted-foreground">
          Buď první, kdo se zapojí!
        </p>
      </CardContent>
    </Card>
  );
}

export default function ClientPortalLeaderboard() {
  const { clientId } = useClientPortal();
  const [activeTab, setActiveTab] = useState<'xp_month' | 'workouts_month' | 'workouts_alltime'>('xp_month');
  
  const { data: xpMonthData, isLoading: xpLoading } = useLeaderboard('xp_month');
  const { data: workoutsMonthData, isLoading: workoutsMonthLoading } = useLeaderboard('workouts_month');
  const { data: allTimeData, isLoading: allTimeLoading } = useLeaderboard('workouts_alltime');
  const { data: settings } = useLeaderboardSettings(clientId ?? undefined);
  
  const isLoading = activeTab === 'xp_month' ? xpLoading : 
                    activeTab === 'workouts_month' ? workoutsMonthLoading : 
                    allTimeLoading;
  
  const data = activeTab === 'xp_month' ? xpMonthData :
               activeTab === 'workouts_month' ? workoutsMonthData :
               allTimeData;
  
  // Find current user's rank
  const currentUserEntry = data?.find(e => e.client_id === clientId);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Žebříčky</h1>
          <p className="text-sm text-muted-foreground">
            Porovnej se s ostatními
          </p>
        </div>
      </div>
      
      {/* User's position summary */}
      {currentUserEntry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">#{currentUserEntry.rank}</span>
              </div>
              <div>
                <p className="font-medium">Tvoje pozice</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'xp_month' ? `${currentUserEntry.xp} XP tento měsíc` :
                   activeTab === 'workouts_month' ? `${currentUserEntry.workout_count} tréninků tento měsíc` :
                   `${currentUserEntry.workout_count} tréninků celkem`
                  }
                </p>
              </div>
            </div>
            {currentUserEntry.is_verified && (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Visibility warning */}
      {settings && !settings.leaderboard_visible && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Jsi skrytý v žebříčku. Můžeš to změnit v nastavení.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="xp_month" className="gap-1.5">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">XP</span>
          </TabsTrigger>
          <TabsTrigger value="workouts_month" className="gap-1.5">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Měsíc</span>
          </TabsTrigger>
          <TabsTrigger value="workouts_alltime" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Celkem</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : data?.length === 0 ? (
            <EmptyState />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {activeTab === 'xp_month' && (
                    <>
                      <Zap className="w-4 h-4" />
                      XP tento měsíc
                    </>
                  )}
                  {activeTab === 'workouts_month' && (
                    <>
                      <Dumbbell className="w-4 h-4" />
                      Tréninky tento měsíc
                    </>
                  )}
                  {activeTab === 'workouts_alltime' && (
                    <>
                      <Trophy className="w-4 h-4" />
                      Celkový počet tréninků
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data?.map((entry) => (
                  <LeaderboardRow 
                    key={entry.client_id} 
                    entry={entry} 
                    currentClientId={clientId ?? undefined}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>Verified = 70%+ tréninků s trenérem</span>
        </div>
      </div>
    </div>
  );
}
