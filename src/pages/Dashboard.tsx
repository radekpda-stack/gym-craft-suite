import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import {
  Wallet,
  TrendingUp,
  Dumbbell,
  Users,
  XCircle,
  Clock,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

import { KPICard } from '@/components/dashboard/KPICard';
import { NewRecordButton } from '@/components/dashboard/NewRecordButton';
import { UnifiedFinancialChart, FinancialPeriod } from '@/components/dashboard/UnifiedFinancialChart';
import { ProductSalesChart, SalesPeriod } from '@/components/dashboard/ProductSalesChart';
import { TrainingActivityChart, TrainingPeriod } from '@/components/dashboard/TrainingActivityChart';
import { TopClientsRanking, ClientsPeriod } from '@/components/dashboard/TopClientsRanking';
import { PerformanceMetricsSection, PerformancePeriod } from '@/components/dashboard/PerformanceMetricsSection';
import { DashboardSettingsNew, NewDashboardLayout } from '@/components/dashboard/DashboardSettingsNew';

import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useUnifiedFinancialData } from '@/hooks/useUnifiedFinancialData';
import { useProductSalesData } from '@/hooks/useProductSalesData';
import { useTrainingActivityData } from '@/hooks/useTrainingActivityData';
import { useTopClientsData } from '@/hooks/useTopClientsData';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import { useFinancialStats } from '@/hooks/useFinancialStats';
import { exportFinancialSummaryToCSV, exportFinancialSummaryToPDF, FinancialSummaryData } from '@/lib/export';

const DEFAULT_LAYOUT: NewDashboardLayout = {
  showKPICards: true,
  showFinancialChart: true,
  showProductSales: true,
  showTrainingActivity: true,
  showTopClients: true,
  showPerformanceMetrics: true,
};

export default function Dashboard() {
  usePageTracking('dashboard');

  // Layout state
  const [layout, setLayout] = useState<NewDashboardLayout>(() => {
    try {
      const stored = localStorage.getItem('dashboard-layout-v2');
      return stored ? JSON.parse(stored) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  // Period states
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>('30days');
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('30days');
  const [trainingPeriod, setTrainingPeriod] = useState<TrainingPeriod>('6months');
  const [clientsPeriod, setClientsPeriod] = useState<ClientsPeriod>('30days');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('6months');

  // Data hooks
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: financialData = [], isLoading: financialLoading } = useUnifiedFinancialData(financialPeriod);
  const { data: salesData, isLoading: salesLoading } = useProductSalesData(salesPeriod);
  const { data: trainingData = [], isLoading: trainingLoading } = useTrainingActivityData(trainingPeriod);
  const { data: topClients = [], isLoading: clientsLoading } = useTopClientsData(clientsPeriod, 10);
  const { data: performanceData, isLoading: performanceLoading } = usePerformanceMetricsData(performancePeriod);
  const { data: financialStats } = useFinancialStats();

  const toggleSection = (key: keyof NewDashboardLayout) => {
    const newLayout = { ...layout, [key]: !layout[key] };
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(newLayout));
  };

  const resetDefaults = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(DEFAULT_LAYOUT));
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {financialStats && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const data: FinancialSummaryData = {
                    totalIncome: financialStats.totalIncome,
                    incomeThisMonth: financialStats.incomeThisMonth,
                    productIncome: financialStats.productIncome,
                    trainingIncome: financialStats.trainingIncome,
                    totalCredit: financialStats.totalCredit,
                    clientsWithLowCredit: financialStats.clientsWithLowCredit,
                    incomeByMonth: financialStats.incomeByMonth,
                    productBreakdown: financialStats.productBreakdown,
                  };
                  exportFinancialSummaryToCSV(data);
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const data: FinancialSummaryData = {
                    totalIncome: financialStats.totalIncome,
                    incomeThisMonth: financialStats.incomeThisMonth,
                    productIncome: financialStats.productIncome,
                    trainingIncome: financialStats.trainingIncome,
                    totalCredit: financialStats.totalCredit,
                    clientsWithLowCredit: financialStats.clientsWithLowCredit,
                    incomeByMonth: financialStats.incomeByMonth,
                    productBreakdown: financialStats.productBreakdown,
                  };
                  exportFinancialSummaryToPDF(data);
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DashboardSettingsNew
            layout={layout}
            onToggleSection={toggleSection}
            onResetDefaults={resetDefaults}
          />
          <NewRecordButton />
        </div>
      </div>

      {/* KPI Cards */}
      {layout.showKPICards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {kpisLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : (
            <>
              <KPICard
                title="Příjem"
                value={`${(kpis?.incomeThisMonth || 0).toLocaleString('cs-CZ')} Kč`}
                icon={<Wallet className="w-4 h-4" />}
                trend={kpis?.incomeTrend}
                trendLabel="vs minulý měsíc"
                href="/sales"
                variant="success"
              />
              <KPICard
                title="Čistý zisk"
                value={`${(kpis?.netProfitThisMonth || 0).toLocaleString('cs-CZ')} Kč`}
                icon={<TrendingUp className="w-4 h-4" />}
                trend={kpis?.profitTrend}
                href="/sales"
                variant="success"
              />
              <KPICard
                title="Tréninky"
                value={kpis?.trainingsThisMonth || 0}
                subtitle="tento měsíc"
                icon={<Dumbbell className="w-4 h-4" />}
                trend={kpis?.trainingsTrend}
                href="/trainings"
              />
              <KPICard
                title="Aktivní klienti"
                value={kpis?.activeClients || 0}
                subtitle="posledních 30 dní"
                icon={<Users className="w-4 h-4" />}
                href="/clients"
              />
              <KPICard
                title="Pozdní zrušení"
                value={kpis?.lateCancellations || 0}
                subtitle="tento měsíc"
                icon={<XCircle className="w-4 h-4" />}
                href="/canceled"
                variant={kpis?.lateCancellations ? 'destructive' : 'default'}
              />
              <KPICard
                title="Nezaplaceno"
                value={kpis?.unpaidCount || 0}
                subtitle={`${(kpis?.unpaidAmount || 0).toLocaleString('cs-CZ')} Kč`}
                icon={<Clock className="w-4 h-4" />}
                href="/trainings?filter=unpaid"
                variant={kpis?.unpaidCount ? 'warning' : 'default'}
              />
            </>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Financial Chart */}
        {layout.showFinancialChart && (
          <UnifiedFinancialChart
            data={financialData}
            isLoading={financialLoading}
            period={financialPeriod}
            onPeriodChange={setFinancialPeriod}
          />
        )}

        {/* Product Sales Chart */}
        {layout.showProductSales && (
          <ProductSalesChart
            trendData={salesData?.trendData || []}
            topProducts={salesData?.topProducts || []}
            paymentMethods={salesData?.paymentMethods || []}
            isLoading={salesLoading}
            period={salesPeriod}
            onPeriodChange={setSalesPeriod}
          />
        )}

        {/* Training Activity Chart */}
        {layout.showTrainingActivity && (
          <TrainingActivityChart
            data={trainingData}
            isLoading={trainingLoading}
            period={trainingPeriod}
            onPeriodChange={setTrainingPeriod}
          />
        )}

        {/* Top Clients Ranking */}
        {layout.showTopClients && (
          <TopClientsRanking
            clients={topClients}
            isLoading={clientsLoading}
            period={clientsPeriod}
            onPeriodChange={setClientsPeriod}
          />
        )}
      </div>

      {/* Performance Metrics Section */}
      {layout.showPerformanceMetrics && (
        <PerformanceMetricsSection
          topExercises={performanceData?.topExercises || []}
          personalRecords={performanceData?.personalRecords || []}
          strengthData={performanceData?.strengthData || []}
          top3Exercises={performanceData?.top3Exercises || []}
          isLoading={performanceLoading}
          period={performancePeriod}
          onPeriodChange={setPerformancePeriod}
        />
      )}
    </div>
  );
}
