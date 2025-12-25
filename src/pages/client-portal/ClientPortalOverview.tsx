import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Wallet, Calendar, Dumbbell, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientCredit, useClientMonthlyUsage, useClientNextTraining } from '@/hooks/useClientPortalData';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TrendIcon = ({ trend }: { trend: 'up' | 'stable' | 'down' }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

export default function ClientPortalOverview() {
  const { clientId, clientProfile } = useClientPortal();
  const { data: credit, isLoading: creditLoading } = useClientCredit(clientId ?? undefined);
  const { data: monthlyUsage, isLoading: usageLoading } = useClientMonthlyUsage(clientId ?? undefined);
  const { data: nextTraining, isLoading: trainingLoading } = useClientNextTraining(clientId ?? undefined);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          Ahoj, {clientProfile?.name?.split(' ')[0] ?? 'Klienti'}!
        </h1>
        <p className="text-muted-foreground">Zde je tvůj přehled</p>
      </motion.div>

      {/* Credit Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Můj kredit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                {creditLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <p className="text-3xl font-bold">{credit?.toLocaleString('cs-CZ')} Kč</p>
                )}
                {usageLoading ? (
                  <Skeleton className="h-4 w-32 mt-1" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vychozeno tento měsíc: {monthlyUsage?.trainingsThisMonth ?? 0} tréninků
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Training */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Další trénink
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : nextTraining ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {format(parseISO(nextTraining.date), 'EEEE d. MMMM', { locale: cs })}
                  </p>
                  <p className="text-muted-foreground">
                    {nextTraining.time?.slice(0, 5)} • {nextTraining.duration ?? 60} min
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Žádný naplánovaný trénink</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Indicators */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Pokrok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Síla', trend: 'up' as const },
                { label: 'Kondice', trend: 'stable' as const },
                { label: 'Konzistence', trend: 'up' as const },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2",
                    item.trend === 'up' && "bg-success/10",
                    item.trend === 'stable' && "bg-muted",
                    item.trend === 'down' && "bg-destructive/10"
                  )}>
                    <TrendIcon trend={item.trend} />
                  </div>
                  <p className="text-xs font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-accent/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Co teď?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">📝 Vyplň dnešní záznam stravy</p>
            <p className="text-sm">💪 Připrav se na další trénink</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
