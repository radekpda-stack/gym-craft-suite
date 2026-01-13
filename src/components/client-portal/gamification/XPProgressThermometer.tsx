import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Trophy, Target, HelpCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClientXPLevel, useClientStreak, getLevelName } from '@/hooks/useClientXPLevel';
import { useClientBadges } from '@/hooks/useClientGamification';
import { useClientPRStats } from '@/hooks/useClientPRs';
import { HowToEarnXPDialog } from '@/components/my-profile/HowToEarnXPDialog';
import { cn } from '@/lib/utils';

interface XPProgressThermometerProps {
  clientId?: string;
}

export function XPProgressThermometer({ clientId }: XPProgressThermometerProps) {
  const [showHowToEarn, setShowHowToEarn] = useState(false);
  
  const { data: xpLevel, isLoading: xpLoading } = useClientXPLevel(clientId);
  const { data: streak, isLoading: streakLoading } = useClientStreak(clientId);
  const { data: clientBadges, isLoading: badgesLoading } = useClientBadges(clientId);
  const { stats: prStats, isLoading: prLoading } = useClientPRStats(clientId);
  
  const isLoading = xpLoading || streakLoading || badgesLoading || prLoading;
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
            </div>
            <div className="h-4 bg-muted animate-pulse rounded-full" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!xpLevel) return null;
  
  const progressPercent = Math.min((xpLevel.level_xp / (xpLevel.level_xp + xpLevel.xp_to_next)) * 100, 100);
  const earnedBadgesCount = clientBadges?.filter(b => b.earned_at)?.length ?? 0;
  const prCount = prStats?.totalPRs ?? 0;
  
  const stats = [
    {
      icon: Flame,
      value: streak?.currentStreak ?? 0,
      label: 'Týdnů v řadě',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      tooltip: 'Streak se počítá jako počet po sobě jdoucích týdnů, kdy jsi alespoň jednou trénoval/a.',
    },
    {
      icon: Zap,
      value: xpLevel.total_xp,
      label: 'Body',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      formatValue: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString(),
    },
    {
      icon: Trophy,
      value: earnedBadgesCount,
      label: 'Odznaky',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: Target,
      value: prCount,
      label: 'Rekordy',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];
  
  return (
    <>
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Zap className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">Level {xpLevel.level}</span>
                    <span className="text-sm text-muted-foreground">—</span>
                    <span className="text-sm font-medium text-primary">{getLevelName(xpLevel.level)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {xpLevel.total_xp.toLocaleString('cs-CZ')} XP celkem
                  </p>
                </div>
              </div>
              
              {/* Help button */}
              <button
                onClick={() => setShowHowToEarn(true)}
                className="p-2 rounded-full hover:bg-muted transition-colors group"
                title="Jak získávám XP?"
              >
                <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
            
            {/* Progress Bar (Thermometer) */}
            <div className="space-y-2">
              <div className="relative">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </motion.div>
                </div>
                
                {/* Progress indicator dot */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full border-2 border-background shadow-lg"
                  initial={{ left: '0%' }}
                  animate={{ left: `calc(${progressPercent}% - 12px)` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ minWidth: 24 }}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{xpLevel.level_xp}</span> XP v tomto levelu
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-primary">{xpLevel.xp_to_next}</span> XP do dalšího
                </span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const displayValue = stat.formatValue ? stat.formatValue(stat.value) : stat.value;
                
                const content = (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl cursor-default",
                      stat.bgColor
                    )}
                  >
                    <Icon className={cn("w-4 h-4 mb-1", stat.color)} />
                    <span className="text-lg font-bold">{displayValue}</span>
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </motion.div>
                );
                
                if (stat.tooltip) {
                  return (
                    <TooltipProvider key={stat.label}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {content}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                          <p>{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return content;
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <HowToEarnXPDialog open={showHowToEarn} onOpenChange={setShowHowToEarn} />
    </>
  );
}
