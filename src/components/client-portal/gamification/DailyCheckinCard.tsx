import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Zap, CheckCircle2, AlertCircle, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMyLoginStreak, useDailyCheckin, getStreakStatus } from '@/hooks/useDailyCheckin';
import { format, subDays, parseISO, isToday, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface DailyCheckinCardProps {
  className?: string;
}

export function DailyCheckinCard({ className }: DailyCheckinCardProps) {
  const { streak, checkedInToday, recentCheckins, isLoading } = useMyLoginStreak();
  const checkinMutation = useDailyCheckin();
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastResult, setLastResult] = useState<{ xp: number; streak: number; milestone: boolean } | null>(null);
  
  const status = getStreakStatus(streak, checkedInToday);
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  
  const handleCheckin = async () => {
    try {
      const result = await checkinMutation.mutateAsync();
      
      if (result.success) {
        setLastResult({
          xp: result.xp_awarded ?? 2,
          streak: result.current_streak ?? 1,
          milestone: result.is_milestone ?? false,
        });
        setShowCelebration(true);
        
        // Fire confetti
        confetti({
          particleCount: result.is_milestone ? 150 : 50,
          spread: result.is_milestone ? 100 : 60,
          origin: { y: 0.6 },
          colors: ['#f97316', '#eab308', '#22c55e'],
        });
        
        setTimeout(() => setShowCelebration(false), 3000);
      } else if (result.already_checked_in) {
        toast.info('Již jsi dnes přihlášen!');
      }
    } catch (error) {
      toast.error('Nepodařilo se zaznamenat přihlášení');
    }
  };
  
  // Generate last 7 days for streak visualization
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isChecked = recentCheckins.includes(dateStr);
    const isCurrentDay = isToday(date);
    
    return {
      date,
      dateStr,
      isChecked,
      isCurrentDay,
      dayLabel: format(date, 'EEEEE', { locale: cs }).toUpperCase(),
    };
  });
  
  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      checkedInToday 
        ? "bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30" 
        : status.streakAtRisk
          ? "bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30"
          : "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30",
      className
    )}>
      <CardContent className="p-4">
        <AnimatePresence mode="wait">
          {showCelebration && lastResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-4 text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {lastResult.milestone ? (
                  <Trophy className="w-12 h-12 text-yellow-500 mb-2" />
                ) : (
                  <Flame className="w-12 h-12 text-orange-500 mb-2" />
                )}
              </motion.div>
              <p className="text-lg font-bold">
                {lastResult.milestone ? '🎉 Milestone!' : 'Check-in úspěšný!'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-warning/20 text-warning border-warning/30">
                  <Zap className="w-3 h-3 mr-1" />
                  +{lastResult.xp} XP
                </Badge>
                <Badge className="bg-warning/20 text-warning border-warning/30">
                  <Flame className="w-3 h-3 mr-1" />
                  {lastResult.streak} {lastResult.streak === 1 ? 'den' : lastResult.streak < 5 ? 'dny' : 'dní'}
                </Badge>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    checkedInToday ? "bg-green-500/20" : "bg-orange-500/20"
                  )}>
                    {checkedInToday ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Flame className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Denní přihlášení</p>
                    <p className="text-xs text-muted-foreground">
                      {checkedInToday 
                        ? 'Dnes splněno!' 
                        : status.streakAtRisk 
                          ? 'Přihlas se, aby streak pokračoval!'
                          : 'Přihlas se a získej XP'}
                    </p>
                  </div>
                </div>
                
                {currentStreak > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="gap-1 bg-warning/10 text-warning border-warning/30"
                  >
                    <Flame className="w-3 h-3" />
                    {currentStreak} {currentStreak === 1 ? 'den' : currentStreak < 5 ? 'dny' : 'dní'}
                  </Badge>
                )}
              </div>
              
              {/* 7-day streak visualization */}
              <div className="flex items-center justify-between gap-1">
                {last7Days.map((day, i) => (
                  <div key={day.dateStr} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                        day.isChecked 
                          ? "bg-green-500 text-white" 
                          : day.isCurrentDay && !checkedInToday
                            ? "bg-orange-500/20 border-2 border-orange-500 border-dashed text-orange-500"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {day.isChecked ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        format(day.date, 'd')
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>
              
              {/* Check-in button */}
              {!checkedInToday && (
                <Button
                  onClick={handleCheckin}
                  disabled={checkinMutation.isPending}
                  className={cn(
                    "w-full gap-2",
                    status.streakAtRisk 
                      ? "bg-orange-500 hover:bg-orange-600" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                  size="sm"
                >
                  {checkinMutation.isPending ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Zapisuji...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Přihlásit se (+2 XP)
                      {status.streakAtRisk && (
                        <AlertCircle className="w-3 h-3 ml-1" />
                      )}
                    </>
                  )}
                </Button>
              )}
              
              {/* Stats row for checked in state */}
              {checkedInToday && longestStreak > 0 && (
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    Nejdelší: {longestStreak} {longestStreak === 1 ? 'den' : longestStreak < 5 ? 'dny' : 'dní'}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Celkem: {streak?.total_checkins ?? 0}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
