import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Flame, Target, Zap, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  type: string;
  earnedAt: string;
  data?: Record<string, any>;
}

interface AchievementsBadgesProps {
  achievements: Achievement[];
  streakCount: number;
  prCount: number;
  isLoading?: boolean;
}

const achievementConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  'challenge_completed': { icon: Trophy, label: 'Výzva dokončena', color: 'text-warning' },
  'pr_set': { icon: Zap, label: 'Osobní rekord', color: 'text-primary' },
  'streak_7': { icon: Flame, label: '7 dní v řadě', color: 'text-warning' },
  'streak_30': { icon: Flame, label: '30 dní v řadě', color: 'text-destructive' },
  'first_measurement': { icon: Target, label: 'První měření', color: 'text-success' },
  'first_challenge': { icon: Star, label: 'První výzva', color: 'text-accent' },
};

export function AchievementsBadges({ 
  achievements, 
  streakCount, 
  prCount,
  isLoading 
}: AchievementsBadgesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4" />
            Statistiky a odznaky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="w-4 h-4" />
          Statistiky a odznaky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-warning/10">
            <Flame className="w-6 h-6 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold">{streakCount}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary/10">
            <Zap className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{prCount}</p>
            <p className="text-xs text-muted-foreground">PR</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-warning/10">
            <Trophy className="w-6 h-6 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold">{achievements.filter(a => a.type === 'challenge_completed').length}</p>
            <p className="text-xs text-muted-foreground">Výzvy</p>
          </div>
        </div>

        {/* Achievement Badges */}
        {achievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Získané odznaky
            </p>
            <div className="flex flex-wrap gap-2">
              {achievements.slice(0, 8).map((achievement) => {
                const config = achievementConfig[achievement.type] || {
                  icon: Award,
                  label: achievement.type,
                  color: 'text-muted-foreground'
                };
                const Icon = config.icon;
                
                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-muted"
                    title={config.label}
                  >
                    <Icon className={cn("w-4 h-4", config.color)} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {achievements.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Zatím nemáš žádné odznaky
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Přidej měření nebo se zapoj do výzvy!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
