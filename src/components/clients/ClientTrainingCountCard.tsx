import { Dumbbell, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientTrainingPeriodStats } from '@/hooks/useClientTrainingPeriodStats';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientTrainingCountCardProps {
  clientId: string;
}

interface StatBoxProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function StatBox({ label, value, highlight }: StatBoxProps) {
  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-secondary/50'}`}>
      <div className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function ClientTrainingCountCard({ clientId }: ClientTrainingCountCardProps) {
  const { stats, isLoading } = useClientTrainingPeriodStats(clientId);
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          {t.clients.trainingCounts}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total trainings - large display */}
        <div className="text-center py-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl">
          <div className="text-5xl font-bold text-primary mb-1">
            {stats.total}
          </div>
          <div className="text-sm text-muted-foreground">
            {t.clients.totalTrainings}
          </div>
        </div>

        {/* Period statistics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label={t.clients.thisMonth} value={stats.thisMonth} highlight />
          <StatBox label={t.clients.last3Months} value={stats.last3Months} />
          <StatBox label={t.clients.last6Months} value={stats.last6Months} />
          <StatBox label={t.clients.thisYear} value={stats.thisYear} />
        </div>

        {/* Additional stats row */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
          {stats.lastYear > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{t.clients.lastYear}: <strong className="text-foreground">{stats.lastYear}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{t.clients.averagePerMonth}: <strong className="text-foreground">{stats.averagePerMonth}</strong></span>
          </div>
          {stats.firstTrainingDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{t.clients.firstTraining}: <strong className="text-foreground">{format(stats.firstTrainingDate, 'd. M. yyyy', { locale: cs })}</strong></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
