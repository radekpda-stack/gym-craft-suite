/**
 * ClientQuickStats Component
 * 
 * Displays 3 quick metrics in a row:
 * - Trainings this month
 * - Total PRs
 * - Current weight with trend
 */
import { motion } from 'framer-motion';
import { Dumbbell, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalAttendanceStats } from '@/hooks/useClientPortalStats';
import { useMyPRs } from '@/hooks/useClientPRs';
import { useClientExercisePRs } from '@/hooks/useClientExercisePRs';
import { useNavigate } from 'react-router-dom';
import { WeightStatCard } from './WeightStatCard';

interface QuickStatProps {
  icon: typeof Dumbbell;
  label: string;
  value: string | number;
  iconClassName?: string;
  valueClassName?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

function QuickStat({ icon: Icon, label, value, iconClassName, valueClassName, isLoading, onClick }: QuickStatProps) {
  return (
    <Card 
      className="bg-card/50 border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
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
  const navigate = useNavigate();
  
  const { data: attendanceStats, isLoading: attendanceLoading } = useClientPortalAttendanceStats(clientId ?? undefined, 30);
  const { data: definedPrs, isLoading: definedPrsLoading } = useMyPRs();
  const { data: exercisePrs, isLoading: exercisePrsLoading } = useClientExercisePRs(clientId);
  
  const trainingsThisMonth = attendanceStats?.trainingsInPeriod ?? 0;
  
  // Combine PRs from both sources: defined PRs (client_prs table) + exercise PRs (exercise_entries)
  const totalPRs = (definedPrs?.length ?? 0) + (exercisePrs?.length ?? 0);
  const prsLoading = definedPrsLoading || exercisePrsLoading;

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
        onClick={() => navigate('/zona/diary')}
      />
      <QuickStat
        icon={Trophy}
        label="Moje PRs"
        value={totalPRs}
        iconClassName="bg-amber-500/10"
        isLoading={prsLoading}
        onClick={() => navigate('/zona/progress')}
      />
      <WeightStatCard />
    </motion.div>
  );
}
