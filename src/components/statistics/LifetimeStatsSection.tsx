import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { 
  Trophy, 
  Dumbbell, 
  Clock, 
  Users, 
  Calendar,
  Banknote,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  UserX,
  Heart,
  Zap,
  XCircle,
  Activity,
  DollarSign
} from "lucide-react";

function StatItem({ 
  icon: Icon, 
  label, 
  value, 
  subValue 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function StatsSection({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-1">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LifetimeStatsSection() {
  const { data: stats, isLoading } = useLifetimeStats();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nepodařilo se načíst statistiky
        </CardContent>
      </Card>
    );
  }

  const startDate = stats.firstTrainingDate 
    ? formatDate(stats.firstTrainingDate, 'long')
    : stats.firstClientDate 
      ? formatDate(stats.firstClientDate, 'long')
      : 'Neznámé';

  return (
    <div className="space-y-4">
      {/* Header with start date */}
      <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Kariérní statistiky</h2>
              <p className="text-sm text-muted-foreground">
                Od {startDate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Stats */}
      <StatsSection title="Tréninky">
        <StatItem
          icon={Dumbbell}
          label="Celkem tréninků"
          value={stats.totalTrainings.toLocaleString('cs-CZ')}
        />
        <StatItem
          icon={Users}
          label="Unikátních klientů"
          value={stats.uniqueClients}
          subValue="se kterými jste trénoval"
        />
        <StatItem
          icon={Clock}
          label="Celkem hodin"
          value={`${stats.totalHours.toLocaleString('cs-CZ')} h`}
          subValue={`${stats.totalMinutes.toLocaleString('cs-CZ')} minut`}
        />
        <StatItem
          icon={Calendar}
          label="Tréninkových dnů"
          value={stats.trainingDays}
          subValue={`Ø ${stats.avgTrainingsPerDay} tréninků/den`}
        />
        <div className="pt-2 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Podle typu:</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Zap className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <p className="text-sm font-semibold">{stats.strengthTrainings}</p>
              <p className="text-xs text-muted-foreground">Silové</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 mx-auto mb-1 text-red-500" />
              <p className="text-sm font-semibold">{stats.cardioTrainings}</p>
              <p className="text-xs text-muted-foreground">Kardio</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-semibold">{stats.conditioningTrainings}</p>
              <p className="text-xs text-muted-foreground">Kondiční</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-semibold">{stats.otherTrainings}</p>
              <p className="text-xs text-muted-foreground">Ostatní</p>
            </div>
          </div>
        </div>
      </StatsSection>

      {/* Finance Stats */}
      <StatsSection title="Finance">
        <StatItem
          icon={Banknote}
          label="Celkem přijato"
          value={formatCurrency(stats.totalIncomeReceived)}
          subValue={`z ${stats.totalPayments} plateb`}
        />
        <StatItem
          icon={TrendingUp}
          label="Hodnota tréninků"
          value={formatCurrency(stats.totalTrainingValue)}
          subValue={`Ø ${formatCurrency(stats.avgPricePerTraining)} za trénink`}
        />
        <StatItem
          icon={DollarSign}
          label="Hodinová sazba"
          value={formatCurrency(stats.avgHourlyRate)}
          subValue="průměrně za hodinu práce"
        />
        <StatItem
          icon={ShoppingBag}
          label="Příjmy z produktů"
          value={formatCurrency(stats.totalProductRevenue)}
          subValue={`${stats.totalProductsSold}× prodáno (${stats.uniqueProductsSold} různých)`}
        />
        <StatItem
          icon={XCircle}
          label="Stornovací poplatky"
          value={formatCurrency(stats.cancellationFees)}
        />
      </StatsSection>

      {/* Client Stats */}
      <StatsSection title="Klienti">
        <StatItem
          icon={Users}
          label="Celkem klientů"
          value={stats.totalClientsEver}
          subValue="za celou dobu"
        />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <UserCheck className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">{stats.activeClients}</p>
              <p className="text-xs text-muted-foreground">Aktivních</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.archivedClients}</p>
              <p className="text-xs text-muted-foreground">Archivovaných</p>
            </div>
          </div>
        </div>
      </StatsSection>
    </div>
  );
}
