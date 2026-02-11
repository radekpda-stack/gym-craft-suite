/**
 * Career Stats Section - Business Dashboard with key metrics, trends, and forecasts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CareerMilestonesTimeline } from "./CareerMilestonesTimeline";
import { HourlyRateTrendCard } from "./HourlyRateTrendCard";
import { CapacityUtilizationCard } from "./CapacityUtilizationCard";
import { RevenuePerClientCard } from "./RevenuePerClientCard";
import { RevenueForecastCard } from "./RevenueForecastCard";
import { SmartBusinessInsights } from "./SmartBusinessInsights";
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
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
      {/* Smart Insights */}
      <SmartBusinessInsights tab="career" maxItems={2} />

      {/* Business Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HourlyRateTrendCard />
        <RevenuePerClientCard />
        <CapacityUtilizationCard />
        {/* Lifetime summary compact card */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Celkem tréninků</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{stats.totalTrainings.toLocaleString('cs-CZ')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stats.totalHours.toLocaleString('cs-CZ')} h • {stats.uniqueClients} klientů • od {startDate}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast */}
      <RevenueForecastCard />

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
