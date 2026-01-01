import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, ChevronRight, Clock, CalendarOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useClientNextTraining } from '@/hooks/useClientPortalData';
import { useClientPortal } from '@/contexts/ClientPortalContext';

interface NextTrainingWidgetProps {
  className?: string;
}

function formatRelativeDate(date: string): string {
  const parsed = parseISO(date);
  if (isToday(parsed)) return 'Dnes';
  if (isTomorrow(parsed)) return 'Zítra';
  
  const daysAway = differenceInDays(parsed, new Date());
  if (daysAway <= 7) return format(parsed, 'EEEE', { locale: cs });
  
  return format(parsed, 'd. MMMM', { locale: cs });
}

export function NextTrainingWidget({ className }: NextTrainingWidgetProps) {
  const { clientId, clientProfile } = useClientPortal();
  const { data: nextTraining, isLoading } = useClientNextTraining(clientId ?? undefined);

  // Trainer contact not available in current context - show generic CTA

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={className}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <CalendarClock className="w-6 h-6 text-blue-500" />
            </div>
            <Link to="/client/attendance">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Docházka <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : nextTraining ? (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Další trénink
              </p>
              <p className="text-3xl font-bold tracking-tight text-blue-500">
                {formatRelativeDate(nextTraining.date)}
              </p>
              
              <div className="mt-3 space-y-1.5">
                <p className="text-sm font-medium">
                  {format(parseISO(nextTraining.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
                
                {nextTraining.training_type && (
                  <p className="text-sm text-muted-foreground">
                    {nextTraining.training_type}
                  </p>
                )}
                
                {nextTraining.duration && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {nextTraining.duration} min
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarOff className="w-5 h-5" />
                <p className="text-lg font-semibold text-foreground">
                  Nemáš naplánovaný trénink
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Dohodněte s trenérem další termín.
              </p>
              <Link to="/client/attendance">
                <Button variant="secondary" size="sm" className="mt-2">
                  Zobrazit docházku
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
