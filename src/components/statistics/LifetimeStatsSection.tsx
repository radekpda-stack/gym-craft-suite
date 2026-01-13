import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifetimeStats } from "@/hooks/useLifetimeStats";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatInfoTooltip } from "./StatInfoTooltip";
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
  Activity,
  DollarSign,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

// Modern stat item component
function StatItem({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  tooltip,
  iconColor = "text-primary",
  iconBg = "bg-primary/10"
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  tooltip?: { description: string; calculation?: string };
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {tooltip && (
            <StatInfoTooltip
              title={label}
              description={tooltip.description}
              calculation={tooltip.calculation}
            />
          )}
        </div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function StatsSection({ 
  title, 
  icon: Icon,
  children,
  headerTooltip
}: { 
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  headerTooltip?: { description: string; calculation?: string };
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {headerTooltip && (
            <StatInfoTooltip
              title={title}
              description={headerTooltip.description}
              calculation={headerTooltip.calculation}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2">
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
          <CardContent className="pt-0 space-y-2">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-16 w-full rounded-xl" />
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
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <CardContent className="relative py-5">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/20 shadow-lg shadow-primary/10">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Kariérní statistiky</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Od {startDate}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Stats */}
      <StatsSection 
        title="Tréninky" 
        icon={Dumbbell}
        headerTooltip={{
          description: "Kompletní přehled všech vašich tréninkových aktivit od začátku kariéry.",
          calculation: "Data z tabulky training_sessions se statusem 'completed'."
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <StatItem
            icon={Dumbbell}
            label="Celkem tréninků"
            value={stats.totalTrainings.toLocaleString('cs-CZ')}
            tooltip={{
              description: "Celkový počet dokončených tréninků za celou vaši kariéru.",
              calculation: "Počet všech tréninků se statusem 'completed'."
            }}
          />
          <StatItem
            icon={Users}
            label="Unikátních klientů"
            value={stats.uniqueClients}
            subValue="se kterými jste trénoval/a"
            tooltip={{
              description: "Počet různých klientů, se kterými jste měl/a alespoň jeden trénink.",
              calculation: "Počet unikátních client_id v dokončených trénincích."
            }}
          />
          <StatItem
            icon={Clock}
            label="Celkem hodin"
            value={`${stats.totalHours.toLocaleString('cs-CZ')} h`}
            subValue={`${stats.totalMinutes.toLocaleString('cs-CZ')} minut`}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            tooltip={{
              description: "Celkový čas strávený trénováním klientů.",
              calculation: "Součet délky všech dokončených tréninků (duration)."
            }}
          />
          <StatItem
            icon={Calendar}
            label="Tréninkových dnů"
            value={stats.trainingDays}
            subValue={`Ø ${stats.avgTrainingsPerDay} tréninků/den`}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
            tooltip={{
              description: "Počet dní, kdy proběhl alespoň jeden trénink.",
              calculation: "Počet unikátních kalendářních dní s alespoň jedním tréninkem."
            }}
          />
        </div>
        
        {/* Training types */}
        <div className="pt-3 mt-3 border-t border-border">
          <div className="flex items-center gap-1 mb-3">
            <p className="text-xs text-muted-foreground font-medium">Podle typu tréninku</p>
            <StatInfoTooltip
              title="Rozdělení podle typu"
              description="Distribuce tréninků podle jejich hlavního zaměření."
              calculation="Silové = 'strength'. Kardio = 'cardio', 'hiit', 'running'. Kondiční = 'conditioning', 'functional', 'mobility'. Ostatní = zbývající typy."
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/10">
              <Zap className="h-5 w-5 mx-auto mb-1.5 text-warning" />
              <p className="text-lg font-bold">{stats.strengthTrainings}</p>
              <p className="text-xs text-muted-foreground">Silové</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/10">
              <Heart className="h-5 w-5 mx-auto mb-1.5 text-destructive" />
              <p className="text-lg font-bold">{stats.cardioTrainings}</p>
              <p className="text-xs text-muted-foreground">Kardio</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10">
              <Activity className="h-5 w-5 mx-auto mb-1.5 text-accent" />
              <p className="text-lg font-bold">{stats.conditioningTrainings}</p>
              <p className="text-xs text-muted-foreground">Kondiční</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border">
              <Dumbbell className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.otherTrainings}</p>
              <p className="text-xs text-muted-foreground">Ostatní</p>
            </div>
          </div>
        </div>
      </StatsSection>

      {/* Finance Stats */}
      <StatsSection 
        title="Finance" 
        icon={Banknote}
        headerTooltip={{
          description: "Finanční přehled vaší kariéry včetně příjmů z tréninků, produktů a dalších zdrojů.",
          calculation: "Data z tabulky credit_transactions."
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <StatItem
            icon={Banknote}
            label="Celkem přijato"
            value={formatCurrency(stats.totalIncomeReceived)}
            subValue={`z ${stats.totalPayments} plateb`}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
            tooltip={{
              description: "Celková částka přijatá od klientů formou plateb a manuálních dobití.",
              calculation: "Součet kladných částek z transakcí typu 'payment', 'manual' a 'transfer'."
            }}
          />
          <StatItem
            icon={TrendingUp}
            label="Hodnota tréninků"
            value={formatCurrency(stats.totalTrainingValue)}
            subValue={`Ø ${formatCurrency(stats.avgPricePerTraining)} za trénink`}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            tooltip={{
              description: "Celková hodnota poskytnutých služeb (tréninky + storno poplatky).",
              calculation: "Součet absolutních hodnot z transakcí typu 'training' a 'canceled_training'."
            }}
          />
          <StatItem
            icon={DollarSign}
            label="Hodinová sazba"
            value={formatCurrency(stats.avgHourlyRate)}
            subValue="průměrně za hodinu práce"
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            tooltip={{
              description: "Průměrná částka, kterou vyděláte za jednu hodinu trénování.",
              calculation: "Hodnota tréninků ÷ celkový počet odtrénovaných hodin."
            }}
          />
          <StatItem
            icon={ShoppingBag}
            label="Příjmy z produktů"
            value={formatCurrency(stats.totalProductRevenue)}
            subValue={`${stats.totalProductsSold}× prodáno (${stats.uniqueProductsSold} různých)`}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
            tooltip={{
              description: "Celkové příjmy z prodaných produktů a doplňků stravy.",
              calculation: "Součet absolutních hodnot z transakcí typu 'product'."
            }}
          />
        </div>
      </StatsSection>

      {/* Client Stats */}
      <StatsSection 
        title="Klienti" 
        icon={Users}
        headerTooltip={{
          description: "Statistiky o vašich klientech za celou kariéru.",
          calculation: "Data z tabulky clients."
        }}
      >
        <StatItem
          icon={Users}
          label="Celkem klientů"
          value={stats.totalClientsEver}
          subValue="za celou dobu"
          tooltip={{
            description: "Celkový počet klientů, které jste kdy měl/a v systému.",
            calculation: "Počet všech klientů v databázi (včetně archivovaných)."
          }}
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeClients}</p>
              <p className="text-xs text-muted-foreground">Aktivních</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
            <div className="p-2 rounded-lg bg-muted">
              <UserX className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.archivedClients}</p>
              <p className="text-xs text-muted-foreground">Archivovaných</p>
            </div>
          </div>
        </div>
      </StatsSection>
    </div>
  );
}
