import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientXPLevel, useClientStreak, getLevelName } from '@/hooks/useClientXPLevel';
import { Flame, Zap, TrendingUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { HowToEarnXPDialog } from './HowToEarnXPDialog';

interface XPLevelCardProps {
  clientId: string;
}

export function XPLevelCard({ clientId }: XPLevelCardProps) {
  const { data: xpLevel, isLoading: xpLoading } = useClientXPLevel(clientId);
  const { data: streak, isLoading: streakLoading } = useClientStreak(clientId);
  const [showHowToEarn, setShowHowToEarn] = useState(false);

  if (xpLoading || streakLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!xpLevel) {
    return null;
  }

  const progressPercent = xpLevel.xp_to_next > 0 
    ? Math.min((xpLevel.level_xp / xpLevel.xp_to_next) * 100, 100) 
    : 0;

  return (
    <>
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              XP & Level
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowHowToEarn(true)}
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Level Display */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{xpLevel.level}</span>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">{getLevelName(xpLevel.level)}</p>
              <p className="text-sm text-muted-foreground">
                {xpLevel.total_xp.toLocaleString('cs-CZ')} XP celkem
              </p>
            </div>
          </div>

          {/* Progress to Next Level */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pokrok k Level {xpLevel.level + 1}</span>
              <span className="font-medium">{xpLevel.level_xp} / {xpLevel.xp_to_next} XP</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
              <Flame className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Série</p>
                <p className="font-semibold text-orange-500">
                  {streak?.currentStreak || 0} {streak?.currentStreak === 1 ? 'týden' : streak?.currentStreak && streak.currentStreak >= 2 && streak.currentStreak <= 4 ? 'týdny' : 'týdnů'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Nejdelší série</p>
                <p className="font-semibold text-green-500">
                  {streak?.longestStreak || 0} {streak?.longestStreak === 1 ? 'týden' : streak?.longestStreak && streak.longestStreak >= 2 && streak.longestStreak <= 4 ? 'týdny' : 'týdnů'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <HowToEarnXPDialog open={showHowToEarn} onOpenChange={setShowHowToEarn} />
    </>
  );
}
