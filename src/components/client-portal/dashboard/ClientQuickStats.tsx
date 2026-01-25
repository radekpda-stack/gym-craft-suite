/**
 * ClientQuickStats Component
 * 
 * Displays 3 quick metrics in a row:
 * - Trainings this month
 * - Total PRs
 * - Current streak
 */
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAttendanceStats } from '@/hooks/useClientPortalStats';
import { useClientStreak } from '@/hooks/useClientXPLevel';
import { useMyPRs } from '@/hooks/useClientPRs';

interface QuickStatProps {
  icon: typeof Dumbbell;
  label: string;
  value: string | number;
  iconClassName?: string;
  valueClassName?: string;
  isLoading?: boolean;
}

function QuickStat({ icon: Icon, label, value, iconClassName, valueClassName, isLoading }: QuickStatProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-muted/50", iconClassName)}>
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        {isLoading ? (
          <Skeleton className="h-5 w-8" />
        ) : (
          <p className={cn("text-lg font-bold leading-tight", valueClassName)}>{value}</p>
        )}
        <p className="text-[10px] text-muted-foreground text-center leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

export function ClientQuickStats() {
  const { clientId } = useClientPortal();
  
  const { data: attendanceStats, isLoading: attendanceLoading } = useClientAttendanceStats(clientId ?? undefined, 30);
  const { data: streakData, isLoading: streakLoading } = useClientStreak(clientId ?? undefined);
  const { data: prs, isLoading: prsLoading } = useMyPRs();
  
  const trainingsThisMonth = attendanceStats?.trainingsInPeriod ?? 0;
  const currentStreak = streakData?.currentStreak ?? 0;
  const totalPRs = prs?.length ?? 0;
  
  const isLoading = attendanceLoading || streakLoading || prsLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 gap-2"
    >
      <QuickStat
        icon={Dumbbell}
        label="Tréninků"
        value={trainingsThisMonth}
        isLoading={attendanceLoading}
      />
      <QuickStat
        icon={Trophy}
        label="Moje PRs"
        value={totalPRs}
        iconClassName="bg-amber-500/10"
        isLoading={prsLoading}
      />
      <QuickStat
        icon={Flame}
        label={currentStreak === 1 ? 'Týden série' : currentStreak < 5 ? 'Týdny série' : 'Týdnů série'}
        value={currentStreak}
        iconClassName={currentStreak >= 4 ? "bg-orange-500/10" : undefined}
        valueClassName={currentStreak >= 4 ? "text-orange-500" : undefined}
        isLoading={streakLoading}
      />
    </motion.div>
  );
}
