/**
 * Career Stats Section - Executive dashboard with key business metrics
 * Uses periodRange for period-based stats + lifetime milestones
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatInfoTooltip } from "./StatInfoTooltip";
import { PeriodComparisonCard } from "./PeriodComparisonCard";
import { CareerMilestonesTimeline } from "./CareerMilestonesTimeline";
import { 
  Trophy, 
  Dumbbell, 
  Clock, 
  Users, 
  Calendar,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatsPeriodRange } from "./StatsPeriodSelector";

interface CareerStatsSectionProps {
  periodRange?: StatsPeriodRange;
}

// KPI Card component
function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  iconColor = "text-primary",
  iconBg = "bg-primary/10"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function CareerStatsSection({ periodRange }: CareerStatsSectionProps) {
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
      {/* Header */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <CardContent className="relative py-5">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/20 shadow-lg shadow-primary/10">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Kariérní přehled</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Od {startDate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison - respects global periodRange */}
      <PeriodComparisonCard periodRange={periodRange} />

      {/* Lifetime KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Dumbbell}
          label="Celkem tréninků"
          value={stats.totalTrainings.toLocaleString('cs-CZ')}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <KPICard
          icon={Clock}
          label="Celkem hodin"
          value={`${stats.totalHours.toLocaleString('cs-CZ')} h`}
          iconColor="text-accent"
          iconBg="bg-accent/10"
        />
        <KPICard
          icon={Users}
          label="Unikátních klientů"
          value={stats.uniqueClients}
          subValue="se kterými jste trénoval/a"
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <KPICard
          icon={Banknote}
          label="Hodinová sazba"
          value={formatCurrency(stats.avgHourlyRate)}
          subValue="průměrně"
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
      </div>

      {/* Career Milestones Timeline */}
      <CareerMilestonesTimeline />

      {/* Training types breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Rozdělení podle typu (celkem)
            <StatInfoTooltip
              title="Typy tréninků"
              description="Distribuce všech tréninků podle jejich hlavního zaměření."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/10">
              <p className="text-lg font-bold">{stats.strengthTrainings}</p>
              <p className="text-xs text-muted-foreground">Silové</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/10">
              <p className="text-lg font-bold">{stats.cardioTrainings}</p>
              <p className="text-xs text-muted-foreground">Kardio</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10">
              <p className="text-lg font-bold">{stats.conditioningTrainings}</p>
              <p className="text-xs text-muted-foreground">Kondiční</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-lg font-bold">{stats.otherTrainings}</p>
              <p className="text-xs text-muted-foreground">Ostatní</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
