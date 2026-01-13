/**
 * Career Stats Section - Executive dashboard with key business metrics
 * Replaces LifetimeStatsSection with enhanced KPIs and visualizations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { useBusinessAnalytics } from "@/hooks/useBusinessAnalytics";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatInfoTooltip } from "./StatInfoTooltip";
import { 
  Trophy, 
  Dumbbell, 
  Clock, 
  Users, 
  Calendar,
  Banknote,
  TrendingUp,
  UserCheck,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// KPI Card component
function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  iconColor = "text-primary",
  iconBg = "bg-primary/10"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: { value: number; label: string };
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
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                trend.value > 0 ? "text-emerald-500" : trend.value < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                <TrendingUp className={cn("h-3 w-3", trend.value < 0 && "rotate-180")} />
                <span>{trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Insights block
function InsightsBlock({ insights }: { insights: { type: 'success' | 'warning' | 'info'; message: string }[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Postřehy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-start gap-2 p-2 rounded-lg text-sm",
              insight.type === 'success' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              insight.type === 'warning' && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              insight.type === 'info' && "bg-blue-500/10 text-blue-700 dark:text-blue-400"
            )}
          >
            {insight.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
            {insight.type === 'info' && <Activity className="h-4 w-4 shrink-0 mt-0.5" />}
            <span>{insight.message}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function CareerStatsSection() {
  const { data: stats, isLoading: statsLoading } = useLifetimeStats();
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics();

  const isLoading = statsLoading || analyticsLoading;

  // Generate insights based on data
  const insights = useMemo(() => {
    if (!stats || !analytics) return [];
    
    const result: { type: 'success' | 'warning' | 'info'; message: string }[] = [];

    // Capacity insight
    if (analytics.capacityUtilization > 85) {
      result.push({ type: 'success', message: `Vysoká vytíženost ${analytics.capacityUtilization}%! Zvažte rozšíření kapacity.` });
    } else if (analytics.capacityUtilization < 50) {
      result.push({ type: 'info', message: `Volná kapacita ${100 - analytics.capacityUtilization}% - prostor pro nové klienty.` });
    }

    // Revenue trend
    if (analytics.vsLastMonth.revenue > 10) {
      result.push({ type: 'success', message: `Příjem vzrostl o ${analytics.vsLastMonth.revenue}% oproti minulému měsíci.` });
    } else if (analytics.vsLastMonth.revenue < -10) {
      result.push({ type: 'warning', message: `Příjem poklesl o ${Math.abs(analytics.vsLastMonth.revenue)}% - zkontrolujte nezaplacené lekce.` });
    }

    // Client trend
    if (analytics.vsLastMonth.clients < -15) {
      result.push({ type: 'warning', message: `Počet aktivních klientů poklesl o ${Math.abs(analytics.vsLastMonth.clients)}%.` });
    }

    // Retention
    if (analytics.retentionRate > 85) {
      result.push({ type: 'success', message: `Skvělá retence klientů: ${analytics.retentionRate}%` });
    }

    return result;
  }, [stats, analytics]);

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

      {/* KPI Grid - 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <KPICard
          icon={Users}
          label="Unikátních klientů"
          value={stats.uniqueClients}
          subValue="se kterými jste trénoval/a"
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
        />
        <KPICard
          icon={UserCheck}
          label="Aktivní klienti (30d)"
          value={analytics?.activeClients30Days || 0}
          trend={analytics?.vsLastMonth ? { value: analytics.vsLastMonth.clients, label: 'vs minulý měsíc' } : undefined}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <KPICard
          icon={Gauge}
          label="Vytíženost kapacity"
          value={`${analytics?.capacityUtilization || 0}%`}
          subValue="max 6h/den"
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
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

      {/* Insights */}
      <InsightsBlock insights={insights} />

      {/* Training types breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Rozdělení podle typu
            <StatInfoTooltip
              title="Typy tréninků"
              description="Distribuce tréninků podle jejich hlavního zaměření."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/10">
              <p className="text-lg font-bold">{stats.strengthTrainings}</p>
              <p className="text-xs text-muted-foreground">Silové</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/10">
              <p className="text-lg font-bold">{stats.cardioTrainings}</p>
              <p className="text-xs text-muted-foreground">Kardio</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/10">
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
