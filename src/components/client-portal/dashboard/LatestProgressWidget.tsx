import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useClientLatestProgress, type LatestPR } from '@/hooks/useClientLatestProgress';
import { cn } from '@/lib/utils';
import { formatTimeSimple, formatDistance } from '@/lib/timeUtils';

const formatDuration = formatTimeSimple;

interface LatestProgressWidgetProps {
  className?: string;
}

export function LatestProgressWidget({ className }: LatestProgressWidgetProps) {
  const { data: latestPR, isLoading } = useClientLatestProgress();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={className}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-warning" />
            </div>
            <Link to="/zona/progress">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Pokrok <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : latestPR ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                  PR!
                </span>
                <span className="text-sm font-medium truncate">
                  {latestPR.exerciseName}
                </span>
              </div>

              {latestPR.type === 'strength' ? (
                <p className="text-4xl font-bold tracking-tight">
                  {latestPR.value} <span className="text-lg font-normal text-muted-foreground">kg</span>
                  {latestPR.reps && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      × {latestPR.reps}
                    </span>
                  )}
                </p>
              ) : (
                <div className="flex items-baseline gap-2">
                  <Timer className="w-5 h-5 text-warning" />
                  <p className="text-4xl font-bold tracking-tight">
                    {formatDuration(latestPR.value)}
                  </p>
                  {latestPR.distance_meters && (
                    <span className="text-base font-normal text-muted-foreground">
                      / {formatDistance(latestPR.distance_meters)}
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-3">
                {format(parseISO(latestPR.date), 'd. MMMM yyyy', { locale: cs })}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-foreground">
                Zatím nemáš žádné rekordy
              </p>
              <p className="text-sm text-muted-foreground">
                Jakmile překonáš svůj výkon, objeví se zde tvůj osobní rekord.
              </p>
              <Link to="/zona/progress">
                <Button variant="secondary" size="sm" className="mt-2">
                  Zobrazit pokrok
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
