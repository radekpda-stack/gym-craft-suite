import { motion } from 'framer-motion';
import { Zap, Flame, Trophy, Award, Crown, Medal, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientXPLevel, useClientStreak, getLevelName } from '@/hooks/useClientXPLevel';
import { useXPLeaderboard, XPLeaderboardEntry } from '@/hooks/useXPLeaderboard';
import { useClientBadges } from '@/hooks/useClientGamification';

interface GamificationProfileCardProps {
  clientId: string | undefined;
}

function XPLeaderboardRow({ entry, currentClientId, rank }: { entry: XPLeaderboardEntry; currentClientId?: string; rank: number }) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = () => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-amber-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Medal className="w-4 h-4 text-amber-700" />;
      default: return <span className="text-xs font-medium text-muted-foreground">{rank}</span>;
    }
  };
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg transition-all",
      isCurrentUser 
        ? "bg-warning/10 border border-warning/20" 
        : "hover:bg-muted/30",
      rank <= 3 && "bg-gradient-to-r from-warning/5 to-transparent"
    )}>
      <div className="w-6 flex items-center justify-center shrink-0">
        {getRankIcon()}
      </div>
      
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        rank === 1 ? "bg-amber-500/20 text-amber-600" :
        rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
        rank === 3 ? "bg-amber-700/20 text-amber-700" :
        "bg-muted text-muted-foreground"
      )}>
        {entry.nickname.charAt(0).toUpperCase()}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-xs font-medium truncate",
            isCurrentUser && "text-warning",
            entry.is_anonymous && "italic text-muted-foreground"
          )}>
            {entry.nickname}
            {isCurrentUser && <span className="text-[10px] ml-1 opacity-70">(Ty)</span>}
          </span>
        </div>
      </div>
      
      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 gap-0.5">
        <Zap className="w-2.5 h-2.5 text-warning" />
        {entry.total_xp}
      </Badge>
    </div>
  );
}

export function GamificationProfileCard({ clientId }: GamificationProfileCardProps) {
  const { data: xpLevel, isLoading: xpLoading } = useClientXPLevel(clientId);
  const { data: streakData, isLoading: streakLoading } = useClientStreak(clientId);
  const { data: xpLeaderboard, isLoading: leaderboardLoading } = useXPLeaderboard();
  const { data: badges } = useClientBadges(clientId);
  
  const earnedBadges = badges?.filter(b => b.earned_at) || [];
  const isLoading = xpLoading || streakLoading;
  
  if (isLoading) {
    return (
      <Card className="border-warning/20 bg-gradient-to-br from-warning/5 via-background to-warning/10">
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-16 flex-1" />
              <Skeleton className="h-16 flex-1" />
              <Skeleton className="h-16 flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const level = xpLevel?.level || 1;
  const levelName = getLevelName(level);
  const totalXP = xpLevel?.total_xp || 0;
  const levelXP = xpLevel?.level_xp || 0;
  const xpToNext = xpLevel?.xp_to_next || 100;
  const progressPercent = Math.min(100, (levelXP / (levelXP + xpToNext)) * 100);
  const currentStreak = streakData?.currentStreak || 0;
  
  // Get current user's rank
  const clientRank = xpLeaderboard?.clientRank || 0;
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-warning" />
        </div>
        <h2 className="text-lg font-semibold">Tvůj profil</h2>
      </div>
      
      <Card className="border-warning/20 bg-gradient-to-br from-warning/5 via-background to-warning/10 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Level info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning font-bold">
                  Level {level}
                </Badge>
                <span className="text-sm font-semibold">{levelName}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalXP.toLocaleString()} XP celkem
              </span>
            </div>
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{levelXP} / {levelXP + xpToNext} XP</span>
                <span>Do dalšího: {xpToNext} XP</span>
              </div>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
            <div className="text-center p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold">{currentStreak}</div>
              <div className="text-[10px] text-muted-foreground">týdnů v řadě</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/5 border border-warning/10">
              <Trophy className="w-5 h-5 text-warning mx-auto mb-1" />
              <div className="text-lg font-bold">#{clientRank || '—'}</div>
              <div className="text-[10px] text-muted-foreground">pořadí XP</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
              <Award className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold">{earnedBadges.length}</div>
              <div className="text-[10px] text-muted-foreground">odznaků</div>
            </div>
          </div>
          
          {/* Mini XP leaderboard */}
          {!leaderboardLoading && xpLeaderboard?.leaderboard && xpLeaderboard.leaderboard.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">TOP 5 XP</span>
              </div>
              <div className="space-y-1">
                {xpLeaderboard.leaderboard.slice(0, 5).map((entry, index) => (
                  <XPLeaderboardRow 
                    key={entry.client_id}
                    entry={entry}
                    currentClientId={clientId}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}
