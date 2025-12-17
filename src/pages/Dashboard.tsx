import { useState, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useRenderTracker } from '@/hooks/useRenderTracker';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  TrendingUp,
  Dumbbell,
  Users,
  XCircle,
  Clock,
  Download,
  FileText,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { KPIGridSkeleton } from '@/components/ui/chart-skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { KPICard } from '@/components/dashboard/KPICard';
import { KPIDetailModal } from '@/components/dashboard/KPIDetailModal';
import { NewRecordButton } from '@/components/dashboard/NewRecordButton';
import { UnifiedFinancialChart, FinancialPeriod } from '@/components/dashboard/UnifiedFinancialChart';
import { ProductSalesChart, SalesPeriod } from '@/components/dashboard/ProductSalesChart';
import { TrainingActivityChart, TrainingPeriod } from '@/components/dashboard/TrainingActivityChart';
import { TopClientsRanking, ClientsPeriod } from '@/components/dashboard/TopClientsRanking';
import { PerformanceMetricsSection, PerformancePeriod } from '@/components/dashboard/PerformanceMetricsSection';
import { DashboardSettingsNew, NewDashboardLayout } from '@/components/dashboard/DashboardSettingsNew';
import { FeedbackTrendsCard } from '@/components/dashboard/FeedbackTrendsCard';
import { DashboardGlobalFilters } from '@/components/dashboard/DashboardGlobalFilters';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';

import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useUnifiedFinancialData } from '@/hooks/useUnifiedFinancialData';
import { useProductSalesData } from '@/hooks/useProductSalesData';
import { useTrainingActivityData } from '@/hooks/useTrainingActivityData';
import { useTopClientsData } from '@/hooks/useTopClientsData';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import { useFinancialStats } from '@/hooks/useFinancialStats';
import { exportFinancialSummaryToCSV, exportFinancialSummaryToPDF, FinancialSummaryData } from '@/lib/export';
import { formatCurrency, formatPercent } from '@/lib/formatters';

type KPIModalType = 'income' | 'profit' | 'trainings' | 'clients' | 'cancellations' | 'unpaid' | null;

const DEFAULT_LAYOUT: NewDashboardLayout = {
  showKPICards: true,
  showFinancialChart: true,
  showProductSales: true,
  showTrainingActivity: true,
  showTopClients: true,
  showPerformanceMetrics: true,
  showFeedbackTrends: true,
};

// Safe mode storage key
const SAFE_MODE_KEY = 'dashboard-safe-mode';

// Content component that uses the filters context
function DashboardContent() {
  usePageTracking('dashboard');
  useRenderTracker('DashboardContent');
  const { toast } = useToast();

  // Safe mode - disables expensive charts when errors occur
  const [safeMode, setSafeMode] = useState(() => {
    try {
      return localStorage.getItem(SAFE_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [errorCount, setErrorCount] = useState(0);

  // Auto-enable safe mode after multiple errors
  useEffect(() => {
    if (errorCount >= 2 && !safeMode) {
      setSafeMode(true);
      try {
        localStorage.setItem(SAFE_MODE_KEY, 'true');
      } catch {}
      
      // Show toast notification
      toast({
        title: "Bezpečný režim aktivován",
        description: "Grafy byly vypnuty kvůli opakovaným chybám. Klikněte na 'Zkusit znovu' v banneru pro obnovení.",
        duration: 8000,
      });
    }
  }, [errorCount, safeMode, toast]);

  const exitSafeMode = useCallback(() => {
    setSafeMode(false);
    setErrorCount(0);
    try {
      localStorage.removeItem(SAFE_MODE_KEY);
    } catch {}
  }, []);

  const handleChartError = useCallback(() => {
    setErrorCount(prev => prev + 1);
  }, []);

  // Layout state with error handling for malformed localStorage
  const [layout, setLayout] = useState<NewDashboardLayout>(() => {
    try {
      const stored = localStorage.getItem('dashboard-layout-v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the parsed object has expected structure
        if (typeof parsed === 'object' && parsed !== null && 'showKPICards' in parsed) {
          return { ...DEFAULT_LAYOUT, ...parsed };
        }
      }
      return DEFAULT_LAYOUT;
    } catch {
      // Clear corrupted data
      try {
        localStorage.removeItem('dashboard-layout-v2');
      } catch {}
      return DEFAULT_LAYOUT;
    }
  });

  // Modal state
  const [activeModal, setActiveModal] = useState<KPIModalType>(null);

  // Period states
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>('30days');
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('30days');
  const [trainingPeriod, setTrainingPeriod] = useState<TrainingPeriod>('6months');
  const [clientsPeriod, setClientsPeriod] = useState<ClientsPeriod>('30days');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('6months');

  // Data hooks - now safely inside the provider
  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useDashboardKPIs();
  
  // Only fetch chart data if not in safe mode
  const { data: financialData = [], isLoading: financialLoading, isError: financialError } = useUnifiedFinancialData(financialPeriod);
  const { data: salesData, isLoading: salesLoading, isError: salesError } = useProductSalesData(salesPeriod);
  const { data: trainingData = [], isLoading: trainingLoading, isError: trainingError } = useTrainingActivityData(trainingPeriod);
  const { data: topClients = [], isLoading: clientsLoading, isError: clientsError } = useTopClientsData(clientsPeriod, 10);
  const { data: performanceData, isLoading: performanceLoading, isError: performanceError } = usePerformanceMetricsData(performancePeriod);
  const { data: financialStats } = useFinancialStats();

  // Track errors from chart queries
  useEffect(() => {
    if (financialError || salesError || trainingError || clientsError || performanceError) {
      handleChartError();
    }
  }, [financialError, salesError, trainingError, clientsError, performanceError, handleChartError]);

  // Memoize callbacks to prevent unnecessary re-renders
  const toggleSection = useCallback((key: keyof NewDashboardLayout) => {
    setLayout(prev => {
      const newLayout = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard-layout-v2', JSON.stringify(newLayout));
      return newLayout;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(DEFAULT_LAYOUT));
  }, []);

  // Memoize export data to prevent recalculation on every render
  const exportData = useMemo(() => {
    if (!financialStats) return null;
    return {
      totalIncome: financialStats.totalIncome,
      incomeThisMonth: financialStats.incomeThisMonth,
      productIncome: financialStats.productIncome,
      trainingIncome: financialStats.trainingIncome,
      totalCredit: financialStats.totalCredit,
      clientsWithLowCredit: financialStats.clientsWithLowCredit,
      incomeByMonth: financialStats.incomeByMonth,
      productBreakdown: financialStats.productBreakdown,
    } as FinancialSummaryData;
  }, [financialStats]);

  // Check if charts should be shown (not in safe mode)
  const showCharts = !safeMode;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Safe Mode Banner */}
      {safeMode && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <ShieldAlert className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-500">Bezpečný režim</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground">
              Grafy byly vypnuty kvůli chybám. Zobrazují se pouze KPI metriky.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={exitSafeMode}
              className="gap-2 w-fit"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Global Filters */}
      {!safeMode && <DashboardGlobalFilters />}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
            {safeMode && (
              <span className="ml-2 text-sm font-normal text-orange-500">(bezpečný režim)</span>
            )}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {exportData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportFinancialSummaryToCSV(exportData)}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFinancialSummaryToPDF(exportData)}>
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
        kpisLoading ? (
          <KPIGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:gap-4">
            <KPICard
              title="Příjem"
              value={formatCurrency(kpis?.incomeThisMonth || 0)}
              icon={<Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              trend={kpis?.incomeTrend}
              trendLabel="vs minulý měsíc"
              onClick={() => setActiveModal('income')}
              variant="success"
            />
            <KPICard
              title="Čistý zisk"
              value={formatCurrency(kpis?.netProfitThisMonth || 0)}
              icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              trend={kpis?.profitTrend}
              onClick={() => setActiveModal('profit')}
              variant="success"
            />
            <KPICard
              title="Tréninky"
              value={kpis?.trainingsThisMonth || 0}
              subtitle="tento měsíc"
              icon={<Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              trend={kpis?.trainingsTrend}
              onClick={() => setActiveModal('trainings')}
            />
            <KPICard
              title="Aktivní klienti"
              value={kpis?.activeClients || 0}
              subtitle="posledních 30 dní"
              icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              onClick={() => setActiveModal('clients')}
            />
            <KPICard
              title="Pozdní zrušení"
              value={kpis?.lateCancellations || 0}
              subtitle="tento měsíc"
              icon={<XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              onClick={() => setActiveModal('cancellations')}
              variant={kpis?.lateCancellations ? 'destructive' : 'default'}
            />
            <KPICard
              title="Nezaplaceno"
              value={kpis?.unpaidCount || 0}
              subtitle={formatCurrency(kpis?.unpaidAmount || 0)}
              icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              onClick={() => setActiveModal('unpaid')}
              variant={kpis?.unpaidCount ? 'warning' : 'default'}
            />
          </div>
        )
      )}

      {/* KPI Detail Modals */}
      <KPIDetailModal
        open={activeModal === 'income'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled příjmů"
        icon={<Wallet className="w-4 h-4" />}
        mainValue={formatCurrency(kpis?.incomeThisMonth || 0)}
        mainLabel="Příjem tento měsíc"
        stats={[
          { label: 'Minulý měsíc', value: formatCurrency(kpis?.incomeLastMonth || 0), trend: kpis?.incomeTrend },
          { label: 'Průměr za měsíc', value: formatCurrency(kpis?.avgMonthlyIncome || 0) },
          { label: 'Tréninky', value: formatCurrency(kpis?.trainingIncome || 0) },
          { label: 'Produkty', value: formatCurrency(kpis?.productIncome || 0) },
          { label: 'Příjem/trénink', value: formatCurrency(Math.round(kpis?.incomePerTraining || 0)) },
          { label: 'Podíl produktů', value: formatPercent(kpis?.productIncomeShare || 0, 1) },
        ]}
      />

      <KPIDetailModal
        open={activeModal === 'profit'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled zisku"
        icon={<TrendingUp className="w-4 h-4" />}
        mainValue={formatCurrency(kpis?.netProfitThisMonth || 0)}
        mainLabel="Čistý zisk tento měsíc"
        stats={[
          { label: 'Příjmy celkem', value: formatCurrency(kpis?.incomeThisMonth || 0) },
          { label: 'Náklady', value: formatCurrency(kpis?.expensesThisMonth || 0) },
          { label: 'Marže', value: formatPercent(kpis?.profitMargin || 0) },
          { label: 'Trend', value: `${kpis?.profitTrend || 0 > 0 ? '+' : ''}${formatPercent(kpis?.profitTrend || 0)}`, trend: kpis?.profitTrend },
        ]}
      />

      <KPIDetailModal
        open={activeModal === 'trainings'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled tréninků"
        icon={<Dumbbell className="w-4 h-4" />}
        mainValue={kpis?.trainingsThisMonth || 0}
        mainLabel="Tréninků tento měsíc"
        stats={[
          { label: 'Minulý měsíc', value: kpis?.trainingsLastMonth || 0, trend: kpis?.trainingsTrend },
          { label: 'Průměr za týden', value: ((kpis?.trainingsThisMonth || 0) / 4).toFixed(1) },
          { label: 'Celkem letos', value: kpis?.trainingsThisYear || 0 },
          { label: 'Průměr účastníků', value: (kpis?.avgParticipants || 1).toFixed(1) },
        ]}
      />

      <KPIDetailModal
        open={activeModal === 'clients'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled klientů"
        icon={<Users className="w-4 h-4" />}
        mainValue={kpis?.activeClients || 0}
        mainLabel="Aktivních klientů (30 dní)"
        stats={[
          { label: 'Celkem klientů', value: kpis?.totalClients || 0 },
          { label: 'Noví tento měsíc', value: kpis?.newClientsThisMonth || 0 },
          { label: 'S nízkým kreditem', value: kpis?.lowCreditClients || 0 },
          { label: 'Archivovaných', value: kpis?.archivedClients || 0 },
        ]}
      />

      <KPIDetailModal
        open={activeModal === 'cancellations'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Pozdní zrušení"
        icon={<XCircle className="w-4 h-4" />}
        mainValue={kpis?.lateCancellations || 0}
        mainLabel="Pozdních zrušení tento měsíc"
        stats={[
          { label: 'Celkem zrušených', value: kpis?.totalCancellations || 0 },
          { label: '% ze všech', value: formatPercent(kpis?.cancellationRate || 0, 1) },
          { label: 'Minulý měsíc', value: kpis?.lateCancellationsLastMonth || 0 },
          { label: 'Ztráta příjmu', value: formatCurrency(kpis?.cancellationLoss || 0) },
        ]}
      />

      <KPIDetailModal
        open={activeModal === 'unpaid'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Neuhrazené tréninky"
        icon={<Clock className="w-4 h-4" />}
        mainValue={kpis?.unpaidCount || 0}
        mainLabel="Neuhrazených tréninků"
        stats={[
          { label: 'Celková částka', value: formatCurrency(kpis?.unpaidAmount || 0) },
          { label: 'Počet klientů', value: kpis?.unpaidClientsCount || 0 },
          { label: '0-7 dní', value: `${kpis?.unpaidByAge?.days0to7.count || 0}× (${formatCurrency(kpis?.unpaidByAge?.days0to7.amount || 0)})` },
          { label: '8-30 dní', value: `${kpis?.unpaidByAge?.days8to30.count || 0}× (${formatCurrency(kpis?.unpaidByAge?.days8to30.amount || 0)})` },
          { label: '31+ dní', value: `${kpis?.unpaidByAge?.days31plus.count || 0}× (${formatCurrency(kpis?.unpaidByAge?.days31plus.amount || 0)})` },
          { label: 'Nejstarší', value: kpis?.oldestUnpaidDays ? `${kpis.oldestUnpaidDays} dní` : '-' },
        ]}
      />
      {/* Charts Grid - hidden in safe mode */}
      {showCharts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
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
              allProducts={salesData?.allProducts || []}
              paymentMethods={salesData?.paymentMethods || []}
              totalMargin={salesData?.totalMargin}
              totalRevenue={salesData?.totalRevenue}
              marginPercent={salesData?.marginPercent}
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

          {/* Feedback Trends Card */}
          {layout.showFeedbackTrends && (
            <FeedbackTrendsCard />
          )}
        </div>
      )}

      {/* Performance Metrics Section - hidden in safe mode */}
      {showCharts && layout.showPerformanceMetrics && (
        <PerformanceMetricsSection
          topExercises={performanceData?.topExercises || []}
          personalRecords={performanceData?.personalRecords || []}
          prTimeline={performanceData?.prTimeline || []}
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

// Wrapper component that provides the context
export default function Dashboard() {
  return (
    <DashboardFiltersProvider>
      <DashboardContent />
    </DashboardFiltersProvider>
  );
}
