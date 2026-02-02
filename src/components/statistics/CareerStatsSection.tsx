/**
 * Career Stats Section - Executive dashboard with key business metrics
 * Uses periodRange for period-based stats + lifetime milestones
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatInfoTooltip } from "./StatInfoTooltip";
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

// KPI Card component with floating style
function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  borderColor = "border-primary/20"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  iconColor?: string;
  iconBg?: string;
  borderColor?: string;
}) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200",
      "bg-card/80 backdrop-blur-md",
      "hover:shadow-md hover:-translate-y-0.5",
      "border shadow-sm",
      borderColor
    )}>
      {/* Background gradient */}
      <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br to-transparent", iconBg)} />
      
      <CardContent className="relative p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl shrink-0 shadow-sm", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{label}</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
            {subValue && (
              <p className="text-[10px] text-muted-foreground">{subValue}</p>
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
      <Card className={cn(
        "relative overflow-hidden",
        "bg-card/80 backdrop-blur-md",
        "border-primary/20 shadow-lg shadow-primary/5"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <CardContent className="relative py-5">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/20 shadow-lg shadow-primary/20 ring-1 ring-primary/30">
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

      {/* Lifetime KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Dumbbell}
          label="Celkem tréninků"
          value={stats.totalTrainings.toLocaleString('cs-CZ')}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          borderColor="border-primary/20"
        />
        <KPICard
          icon={Clock}
          label="Celkem hodin"
          value={`${stats.totalHours.toLocaleString('cs-CZ')} h`}
          iconColor="text-accent"
          iconBg="bg-accent/10"
          borderColor="border-accent/20"
        />
        <KPICard
          icon={Users}
          label="Unikátních klientů"
          value={stats.uniqueClients}
          subValue="se kterými jste trénoval/a"
          iconColor="text-primary"
          iconBg="bg-primary/10"
          borderColor="border-primary/20"
        />
        <KPICard
          icon={Banknote}
          label="Hodinová sazba"
          value={formatCurrency(stats.avgHourlyRate)}
          subValue="průměrně"
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          borderColor="border-emerald-500/20"
        />
      </div>

      {/* Career Milestones Timeline */}
      <CareerMilestonesTimeline />

      {/* Training types breakdown */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            Rozdělení podle typu (celkem)
            <StatInfoTooltip
              title="Typy tréninků"
              description="Distribuce všech tréninků podle jejich hlavního zaměření."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 border border-warning/20 shadow-sm">
              <p className="text-lg font-bold tabular-nums">{stats.strengthTrainings}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Silové</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/20 shadow-sm">
              <p className="text-lg font-bold tabular-nums">{stats.cardioTrainings}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kardio</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 shadow-sm">
              <p className="text-lg font-bold tabular-nums">{stats.conditioningTrainings}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kondiční</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30 border border-border shadow-sm">
              <p className="text-lg font-bold tabular-nums">{stats.otherTrainings}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ostatní</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
