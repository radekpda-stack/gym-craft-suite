import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, CalendarDays, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientCreditStats, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientNextTraining } from '@/hooks/useClientPortalData';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface HeroStatsRowProps {
  period?: PeriodDays;
}

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) return 'Dnes';
  if (isTomorrow(date)) return 'Zítra';
  
  const daysDiff = differenceInDays(date, new Date());
  if (daysDiff <= 6) {
    return format(date, 'EEEE', { locale: cs });
  }
  
  return format(date, 'd. MMMM', { locale: cs });
}

export function HeroStatsRow({ period = 30 }: HeroStatsRowProps) {
  const { clientId } = useClientPortal();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';
  
  const { data: creditStats, isLoading: creditLoading } = useClientCreditStats(clientId ?? undefined, period);
  const { data: nextTraining, isLoading: trainingLoading } = useClientNextTraining(clientId ?? undefined);
  
  const creditTrend = creditStats?.netChange ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-3"
    >
      {/* Credit Card */}
      <Link to={`${basePath}/credit`}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kredit</p>
                {creditLoading ? (
                  <Skeleton className="h-7 w-20 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold">
                    {creditStats?.balance.toLocaleString('cs-CZ') ?? 0} Kč
                  </p>
                )}
              </div>
              {/* Trend badge */}
              {!creditLoading && creditTrend !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium w-fit",
                  creditTrend > 0 ? "text-success" : "text-destructive"
                )}>
                  {creditTrend > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {creditTrend > 0 ? '+' : ''}{creditTrend.toLocaleString('cs-CZ')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Next Training Card */}
      <Link to={`${basePath}/attendance`}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 hover:border-success/40 transition-colors cursor-pointer h-full">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <CalendarDays className="w-4.5 h-4.5 text-success" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Další trénink</p>
                {trainingLoading ? (
                  <Skeleton className="h-7 w-24 mt-0.5" />
                ) : nextTraining ? (
                  <div>
                    <p className="text-lg font-bold">
                      {formatRelativeDate(nextTraining.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(nextTraining.date), 'HH:mm', { locale: cs })}
                      {nextTraining.training_type && ` · ${nextTraining.training_type}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Zatím není naplánován
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
