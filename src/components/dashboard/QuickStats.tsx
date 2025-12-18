import { useState } from 'react';
import { 
  BarChart3,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  AlertTriangle,
  Clock,
  Target,
  UserPlus,
  Ban,
  Package,
  CalendarX,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { StatDetailModal } from './StatDetailModal';

type StatId = 'trainings' | 'clients' | 'income' | 'unpaid' | 'cancellations' | 'products';

export function QuickStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<StatId | null>(null);
  const { data: kpis, isLoading } = useDashboardKPIs();

  const stats = [
    {
      id: 'trainings' as StatId,
      label: 'Tréninky',
      value: kpis?.trainingsThisMonth || 0,
      subValue: `${kpis?.trainingsThisYear || 0} letos`,
      trend: kpis?.trainingsTrend,
      icon: Dumbbell,
      color: 'text-blue-500',
    },
    {
      id: 'clients' as StatId,
      label: 'Klienti',
      value: kpis?.activeClients || 0,
      subValue: `+${kpis?.newClientsThisMonth || 0} nových`,
      icon: Users,
      color: 'text-emerald-500',
    },
    {
      id: 'income' as StatId,
      label: 'Příjem z tréninků',
      value: formatCurrency(kpis?.trainingIncome || 0),
      subValue: `Ø ${formatCurrency(kpis?.incomePerTraining || 0)}/trénink`,
      trend: kpis?.trainingIncomeTrend,
      icon: Wallet,
      color: 'text-primary',
    },
    {
      id: 'unpaid' as StatId,
      label: 'Nezaplaceno',
      value: kpis?.unpaidCount || 0,
      subValue: formatCurrency(kpis?.unpaidAmount || 0),
      icon: AlertTriangle,
      color: (kpis?.unpaidCount || 0) > 0 ? 'text-amber-500' : 'text-muted-foreground',
      warning: (kpis?.unpaidCount || 0) > 0,
    },
    {
      id: 'cancellations' as StatId,
      label: 'Zrušené',
      value: kpis?.totalCancellations || 0,
      subValue: `${kpis?.lateCancellations || 0} pozdě`,
      icon: CalendarX,
      color: (kpis?.lateCancellations || 0) > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
    {
      id: 'products' as StatId,
      label: 'Produkty',
      value: formatCurrency(kpis?.productIncome || 0),
      subValue: `${kpis?.productIncomeShare?.toFixed(0) || 0}% příjmů`,
      icon: Package,
      color: 'text-purple-500',
    },
  ];

  const getTrendIcon = (trend: number | undefined) => {
    if (trend === undefined || trend === 0) return null;
    return trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = (trend: number | undefined) => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-emerald-500' : 'text-red-500';
  };

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between"
          >
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Statistiky
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.map(stat => (
                  <button
                    key={stat.id}
                    onClick={() => setActiveModal(stat.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-4 rounded-lg bg-secondary/30 text-left transition-all hover:bg-secondary/50 hover:scale-[1.02]",
                      stat.warning && "ring-1 ring-amber-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <stat.icon className={cn("w-4 h-4", stat.color)} />
                      {stat.trend !== undefined && stat.trend !== 0 && (
                        <span className={cn("flex items-center gap-0.5 text-xs", getTrendColor(stat.trend))}>
                          {getTrendIcon(stat.trend)}
                          {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-foreground">{stat.value}</span>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className="text-[10px] text-muted-foreground/70">{stat.subValue}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Trainings Modal */}
      <StatDetailModal
        open={activeModal === 'trainings'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Statistiky tréninků"
        icon={Dumbbell}
        mainValue={kpis?.trainingsThisMonth || 0}
        mainLabel="Tréninků tento měsíc"
        stats={[
          { 
            label: 'Celkem letos', 
            value: kpis?.trainingsThisYear || 0,
          },
          { 
            label: 'Minulé období', 
            value: kpis?.trainingsLastMonth || 0,
            trend: kpis?.trainingsTrend,
          },
          { 
            label: 'Průměr účastníků', 
            value: (kpis?.avgParticipants || 1).toFixed(1),
          },
          { 
            label: 'Příjem za trénink', 
            value: formatCurrency(kpis?.incomePerTraining || 0),
            highlight: true,
          },
        ]}
      />

      {/* Clients Modal */}
      <StatDetailModal
        open={activeModal === 'clients'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Statistiky klientů"
        icon={Users}
        mainValue={kpis?.activeClients || 0}
        mainLabel="Aktivních klientů (30 dní)"
        stats={[
          { 
            label: 'Celkem klientů', 
            value: kpis?.totalClients || 0,
          },
          { 
            label: 'Noví tento měsíc', 
            value: kpis?.newClientsThisMonth || 0,
            highlight: (kpis?.newClientsThisMonth || 0) > 0,
          },
          { 
            label: 'Nízký kredit', 
            value: kpis?.lowCreditClients || 0,
          },
          { 
            label: 'Archivovaní', 
            value: kpis?.archivedClients || 0,
          },
        ]}
      />

      {/* Income Modal */}
      <StatDetailModal
        open={activeModal === 'income'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled příjmů"
        icon={Wallet}
        mainValue={formatCurrency(kpis?.trainingIncome || 0)}
        mainLabel="Příjem z tréninků"
        stats={[
          { 
            label: 'Minulé období', 
            value: formatCurrency(kpis?.trainingIncomeLastMonth || 0),
            trend: kpis?.trainingIncomeTrend,
          },
          { 
            label: 'Přijaté platby', 
            value: formatCurrency(kpis?.creditReceived || 0),
            trend: kpis?.creditReceivedTrend,
          },
          { 
            label: 'Produkty', 
            value: formatCurrency(kpis?.productIncome || 0),
          },
          { 
            label: 'Průměr měsíčně', 
            value: formatCurrency(kpis?.avgMonthlyIncome || 0),
            highlight: true,
          },
        ]}
      />

      {/* Unpaid Modal */}
      <StatDetailModal
        open={activeModal === 'unpaid'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Nezaplacené tréninky"
        icon={AlertTriangle}
        mainValue={formatCurrency(kpis?.unpaidAmount || 0)}
        mainLabel={`${kpis?.unpaidCount || 0} nezaplacených tréninků`}
        stats={[
          { 
            label: 'Klientů s dluhem', 
            value: kpis?.unpaidClientsCount || 0,
          },
          { 
            label: 'Průměr na klienta', 
            value: formatCurrency(kpis?.avgUnpaidPerClient || 0),
          },
          { 
            label: 'Nejstarší dluh', 
            value: kpis?.oldestUnpaidDays ? `${kpis.oldestUnpaidDays} dní` : '—',
            highlight: (kpis?.oldestUnpaidDays || 0) > 30,
          },
          { 
            label: 'Starší 30 dní', 
            value: formatCurrency(kpis?.unpaidByAge?.days31plus?.amount || 0),
            highlight: (kpis?.unpaidByAge?.days31plus?.count || 0) > 0,
          },
        ]}
      >
        {/* Age breakdown */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Podle stáří</div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">0-7 dní</span>
              <span className="font-medium">{kpis?.unpaidByAge?.days0to7?.count || 0}× = {formatCurrency(kpis?.unpaidByAge?.days0to7?.amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">8-30 dní</span>
              <span className="font-medium text-amber-500">{kpis?.unpaidByAge?.days8to30?.count || 0}× = {formatCurrency(kpis?.unpaidByAge?.days8to30?.amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">31+ dní</span>
              <span className="font-medium text-red-500">{kpis?.unpaidByAge?.days31plus?.count || 0}× = {formatCurrency(kpis?.unpaidByAge?.days31plus?.amount || 0)}</span>
            </div>
          </div>
        </div>
      </StatDetailModal>

      {/* Cancellations Modal */}
      <StatDetailModal
        open={activeModal === 'cancellations'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Zrušené tréninky"
        icon={CalendarX}
        mainValue={kpis?.totalCancellations || 0}
        mainLabel="Zrušených tréninků"
        stats={[
          { 
            label: 'Pozdní zrušení', 
            value: kpis?.lateCancellations || 0,
            highlight: (kpis?.lateCancellations || 0) > 0,
          },
          { 
            label: 'Minulé období', 
            value: kpis?.lateCancellationsLastMonth || 0,
          },
          { 
            label: 'Míra zrušení', 
            value: `${(kpis?.cancellationRate || 0).toFixed(1)}%`,
          },
          { 
            label: 'Ztráta příjmu', 
            value: formatCurrency(kpis?.cancellationLoss || 0),
            highlight: (kpis?.cancellationLoss || 0) > 0,
          },
        ]}
      />

      {/* Products Modal */}
      <StatDetailModal
        open={activeModal === 'products'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Prodej produktů"
        icon={Package}
        mainValue={formatCurrency(kpis?.productIncome || 0)}
        mainLabel="Příjem z produktů"
        stats={[
          { 
            label: 'Počet prodejů', 
            value: kpis?.productSalesCount || 0,
          },
          { 
            label: 'Náklady', 
            value: formatCurrency(kpis?.productCost || 0),
          },
          { 
            label: 'Zisk z produktů', 
            value: formatCurrency(kpis?.productProfit || 0),
            highlight: true,
          },
          { 
            label: 'Marže', 
            value: `${(kpis?.productMargin || 0).toFixed(1)}%`,
          },
        ]}
      />
    </>
  );
}
