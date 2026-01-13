import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Dumbbell, Trophy, Crown, Medal, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLeaderboard, useLeaderboardSettings, LeaderboardEntry } from '@/hooks/useClientGamification';
import { useXPLeaderboard, XPLeaderboardEntry } from '@/hooks/useXPLeaderboard';

interface GamificationSectionProps {
  clientId: string | undefined;
}

function LeaderboardRow({ entry, currentClientId }: { entry: LeaderboardEntry; currentClientId?: string }) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-amber-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-amber-700" />;
      default: return <span className="text-xs font-medium text-muted-foreground">{rank}</span>;
    }
  };
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-all",
      isCurrentUser 
        ? "bg-primary/10 border border-primary/20" 
        : "hover:bg-muted/50",
      entry.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
    )}>
      <div className="w-6 flex items-center justify-center shrink-0">
        {getRankIcon(entry.rank)}
      </div>
      
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
        entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
        entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
        "bg-muted text-muted-foreground"
      )}>
        {entry.nickname.charAt(0).toUpperCase()}
      </div>
      
      <div className="min-w-0 flex-1">
        <span className={cn(
          "text-sm font-medium truncate block",
          isCurrentUser && "text-primary",
          entry.is_anonymous && "italic text-muted-foreground"
        )}>
          {entry.nickname}
          {isCurrentUser && <span className="text-xs ml-1 opacity-70">(Ty)</span>}
        </span>
      </div>
      
      <span className="font-bold text-sm shrink-0">{entry.workout_count}</span>
    </div>
  );
}

function XPLeaderboardRow({ entry, currentClientId }: { entry: XPLeaderboardEntry; currentClientId?: string }) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-amber-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-amber-700" />;
      default: return <span className="text-xs font-medium text-muted-foreground">{rank}</span>;
    }
  };
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-all",
      isCurrentUser 
        ? "bg-warning/10 border border-warning/20" 
        : "hover:bg-muted/50",
      entry.rank <= 3 && "bg-gradient-to-r from-warning/5 to-transparent"
    )}>
      <div className="w-6 flex items-center justify-center shrink-0">
        {getRankIcon(entry.rank)}
      </div>
      
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
        entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
        entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
        "bg-muted text-muted-foreground"
      )}>
        {entry.nickname.charAt(0).toUpperCase()}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-sm font-medium truncate",
            isCurrentUser && "text-yellow-600",
            entry.is_anonymous && "italic text-muted-foreground"
          )}>
            {entry.nickname}
            {isCurrentUser && <span className="text-xs ml-1 opacity-70">(Ty)</span>}
          </span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
            Lvl {entry.level}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        <Zap className="w-3 h-3 text-yellow-500" />
        <span className="font-bold text-sm">{entry.total_xp}</span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="py-6 text-center">
      <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        {message || 'Zatím tu nikdo není'}
      </p>
    </div>
  );
}

export default function GamificationSection({ clientId }: GamificationSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: xpData, isLoading: xpLoading } = useXPLeaderboard();
  const { data: workoutsMonthData, isLoading: workoutsMonthLoading } = useLeaderboard('workouts_month');
  const { data: allTimeData, isLoading: allTimeLoading } = useLeaderboard('workouts_alltime');
  const { data: settings } = useLeaderboardSettings(clientId ?? undefined);

  const currentXPEntry = xpData?.leaderboard.find(e => e.client_id === clientId);
  const currentMonthEntry = workoutsMonthData?.find(e => e.client_id === clientId);
  const currentAllTimeEntry = allTimeData?.find(e => e.client_id === clientId);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Gamifikace & Aktivita</CardTitle>
                  <p className="text-xs text-muted-foreground">XP, tréninky, celkové pořadí</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick stats badges */}
                {currentXPEntry && (
                  <Badge variant="outline" className="gap-1 text-warning border-warning/30 bg-warning/5">
                    <Zap className="w-3 h-3" />
                    #{currentXPEntry.rank}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Visibility warning */}
            {(!settings || !settings.leaderboard_visible) && (
              <div className="p-2 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs text-accent">
                  📛 Jsi anonymní. Změň to v nastavení.
                </p>
              </div>
            )}
            
            {/* XP Leaderboard */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-medium">XP Žebříček</h4>
                {xpData?.clientRank && (
                  <Badge variant="secondary" className="text-xs">
                    Tvoje pozice: #{xpData.clientRank}
                  </Badge>
                )}
              </div>
              
              {xpLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !xpData?.leaderboard.length ? (
                <EmptyState />
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {xpData.leaderboard.slice(0, 10).map((entry) => (
                    <XPLeaderboardRow 
                      key={entry.client_id} 
                      entry={entry} 
                      currentClientId={clientId ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Monthly workouts */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-medium">Tréninky tento měsíc</h4>
                {currentMonthEntry && (
                  <Badge variant="secondary" className="text-xs">
                    #{currentMonthEntry.rank} • {currentMonthEntry.workout_count} tréninků
                  </Badge>
                )}
              </div>
              
              {workoutsMonthLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !workoutsMonthData?.length ? (
                <EmptyState />
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {workoutsMonthData.slice(0, 10).map((entry) => (
                    <LeaderboardRow 
                      key={entry.client_id} 
                      entry={entry} 
                      currentClientId={clientId ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* All-time workouts */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium">Celkem tréninků</h4>
                {currentAllTimeEntry && (
                  <Badge variant="secondary" className="text-xs">
                    #{currentAllTimeEntry.rank} • {currentAllTimeEntry.workout_count} tréninků
                  </Badge>
                )}
              </div>
              
              {allTimeLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !allTimeData?.length ? (
                <EmptyState />
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {allTimeData.slice(0, 10).map((entry) => (
                    <LeaderboardRow 
                      key={entry.client_id} 
                      entry={entry} 
                      currentClientId={clientId ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
