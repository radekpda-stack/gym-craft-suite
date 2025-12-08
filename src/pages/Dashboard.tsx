import { useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Users,
  Dumbbell,
  TrendingUp,
  XCircle,
  Plus,
  Calendar,
  ChevronRight,
  CreditCard,
  Wallet,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  Activity,
  Stethoscope,
  GripVertical,
  Pencil,
  Check,
  CalendarDays,
  BarChart3,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SessionCard } from '@/components/ui/session-card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { useDashboardStats, useTodaySessions } from '@/hooks/useDashboardStats';
import { useFinancialStats, useClientCredits } from '@/hooks/useFinancialStats';
import { useIncomeByPeriod } from '@/hooks/useIncomeByPeriod';
import { useTrainingTrend } from '@/hooks/useTrainingTrend';
import { useTopClients } from '@/hooks/useTopClients';
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { useCreateDiagnostic } from '@/hooks/useDiagnostics';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';

import { DashboardSettings } from '@/components/dashboard/DashboardSettings';
import { TrainingTrendChart } from '@/components/dashboard/TrainingTrendChart';
import { TopClientsTable } from '@/components/dashboard/TopClientsTable';
import { IncomeChart, IncomePeriod } from '@/components/dashboard/IncomeChart';
import { ProfitChart, ProfitPeriod } from '@/components/dashboard/ProfitChart';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { AIWidget } from '@/components/ai/AIWidget';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { MeasurementFormValues } from '@/components/measurements/MeasurementForm';
import { DiagnosticFormValues } from '@/components/diagnostics/DiagnosticForm';
import { cn } from '@/lib/utils';
import { exportFinancialSummaryToCSV, exportFinancialSummaryToPDF, FinancialSummaryData } from '@/lib/export';
import { useProfitByPeriod } from '@/hooks/useProfitByPeriod';
import { DashboardStatsSkeleton, DashboardChartSkeleton, DashboardSessionsSkeleton, DashboardCreditsSkeleton } from '@/components/skeletons';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

interface SortableItemProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
  className?: string;
  horizontal?: boolean;
}

function SortableItem({ id, children, isEditMode, className, horizontal }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', className, isDragging && 'ring-2 ring-primary rounded-2xl')}>
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute z-10 p-1.5 rounded-lg bg-primary/90 text-primary-foreground cursor-grab active:cursor-grabbing shadow-lg",
            horizontal ? "top-2 left-2" : "-top-2 -left-2"
          )}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      {children}
    </div>
  );
}

export default function Dashboard() {
  usePageTracking('dashboard');
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: todaySessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: financialStats, isLoading: financialLoading } = useFinancialStats();
  const { data: clientCredits = [] } = useClientCredits();
  const { data: trainingTrend = [], isLoading: trendLoading } = useTrainingTrend();
  const { data: topClients = [], isLoading: topClientsLoading } = useTopClients(5);
  const dashboardLayout = useDashboardLayout();
  const { preferences, updateDashboardStatsOrder, updateDashboardSectionsOrder } = useLayoutPreferences();

  const [isTrainingSheetOpen, setIsTrainingSheetOpen] = useState(false);
  const [isMeasurementSheetOpen, setIsMeasurementSheetOpen] = useState(false);
  const [isDiagnosticSheetOpen, setIsDiagnosticSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [incomePeriod, setIncomePeriod] = useState<IncomePeriod>('30days');
  const [profitPeriod, setProfitPeriod] = useState<ProfitPeriod>('6months');
  
  const { data: incomeData = [], isLoading: incomeLoading } = useIncomeByPeriod(incomePeriod);
  const { data: profitData = [], isLoading: profitLoading } = useProfitByPeriod(profitPeriod);

  const createTraining = useCreateTrainingSession();
  const createMeasurement = useCreateMeasurement();
  const createDiagnostic = useCreateDiagnostic();

  const isLoading = statsLoading || sessionsLoading || clientsLoading;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getCreditColor = (credit: number) => {
    if (credit < 0) return "text-destructive";
    if (credit < 500) return "text-warning";
    return "text-success";
  };

  const incomeChange = financialStats?.incomeLastMonth 
    ? ((financialStats.incomeThisMonth - financialStats.incomeLastMonth) / financialStats.incomeLastMonth * 100)
    : 0;

  const handleCreateTraining = async (data: TrainingFormValues) => {
    await createTraining.mutateAsync({
      client_id: data.client_id,
      date: new Date(data.date).toISOString(),
      duration: data.duration,
      notes: data.notes,
      subjective_rating: data.subjective_rating || undefined,
      status: data.status,
    });
    setIsTrainingSheetOpen(false);
  };

  const handleCreateMeasurement = async (data: MeasurementFormValues) => {
    await createMeasurement.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      weight: data.weight,
      body_fat_percentage: data.body_fat_percentage,
      muscle_mass: data.muscle_mass,
      basal_metabolism: data.basal_metabolism,
      chest: data.chest,
      waist: data.waist,
      hips: data.hips,
      mental_state: data.mental_state || undefined,
      notes: data.notes,
    });
    setIsMeasurementSheetOpen(false);
  };

  const handleCreateDiagnostic = async (data: DiagnosticFormValues) => {
    await createDiagnostic.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      area_type: data.area_type,
      area_name: data.area_name,
      findings: data.findings,
      notes: data.notes,
    });
    setIsDiagnosticSheetOpen(false);
  };

  const handleStatsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = preferences.dashboardStatsOrder.indexOf(active.id as string);
      const newIndex = preferences.dashboardStatsOrder.indexOf(over.id as string);
      updateDashboardStatsOrder(arrayMove(preferences.dashboardStatsOrder, oldIndex, newIndex));
    }
  };

  const handleSectionsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = preferences.dashboardSectionsOrder.indexOf(active.id as string);
      const newIndex = preferences.dashboardSectionsOrder.indexOf(over.id as string);
      updateDashboardSectionsOrder(arrayMove(preferences.dashboardSectionsOrder, oldIndex, newIndex));
    }
  };

  // Stats components
  const statsComponents: Record<string, ReactNode> = {
    income: (
      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
          <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-success/10">
            <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
          </div>
          <span className="text-xs md:text-sm">Příjmy měsíc</span>
        </div>
        <p className="text-lg md:text-2xl font-bold text-foreground">
          {(financialStats?.incomeThisMonth || 0).toLocaleString('cs-CZ')} Kč
        </p>
        {incomeChange !== 0 && (
          <div className={cn(
            "flex items-center gap-1 mt-1 text-xs md:text-sm",
            incomeChange > 0 ? "text-success" : "text-destructive"
          )}>
            {incomeChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span className="hidden sm:inline">{Math.abs(incomeChange).toFixed(0)}% oproti min. měsíci</span>
            <span className="sm:hidden">{Math.abs(incomeChange).toFixed(0)}%</span>
          </div>
        )}
      </div>
    ),
    profit: (
      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
          <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-success/10">
            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
          </div>
          <span className="text-xs md:text-sm">Zisk produkty</span>
        </div>
        <p className="text-lg md:text-2xl font-bold text-success">
          {(financialStats?.productProfit || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
          Tržby: {(financialStats?.productIncome || 0).toLocaleString('cs-CZ')} Kč
        </p>
      </div>
    ),
    credit: (
      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
          <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-primary/10">
            <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          </div>
          <span className="text-xs md:text-sm">Kredit klientů</span>
        </div>
        <p className="text-lg md:text-2xl font-bold text-foreground">
          {(financialStats?.totalCredit || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
          {clients.length} klientů celkem
        </p>
      </div>
    ),
    costs: (
      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
          <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-warning/10">
            <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" />
          </div>
          <span className="text-xs md:text-sm">Náklady</span>
        </div>
        <p className="text-lg md:text-2xl font-bold text-foreground">
          {(financialStats?.productCost || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
          Nákupní ceny
        </p>
      </div>
    ),
    lowCredit: (
      <Link to="/clients?filter=lowCredit" className="block">
        <div className="glass rounded-2xl p-4 md:p-5 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
          <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-destructive/10">
              <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive" />
            </div>
            <span className="text-xs md:text-sm">Nízký kredit</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {financialStats?.clientsWithLowCredit || 0}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">
            Klientů pod 500 Kč →
          </p>
        </div>
      </Link>
    ),
  };

  // Section components
  // Financial charts section - all financial charts grouped together
  const renderChartsSection = () => (
    (dashboardLayout.showIncomeChart || dashboardLayout.showProfitChart || dashboardLayout.showSalesChart) && (
      <div className="space-y-4 md:space-y-6">
        <h2 className="text-lg md:text-xl font-semibold text-foreground">
          Finanční přehled
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {dashboardLayout.showIncomeChart && (
            <IncomeChart
              data={incomeData}
              isLoading={incomeLoading}
              period={incomePeriod}
              onPeriodChange={setIncomePeriod}
            />
          )}
          {dashboardLayout.showProfitChart && (
            <ProfitChart
              data={profitData}
              isLoading={profitLoading}
              period={profitPeriod}
              onPeriodChange={setProfitPeriod}
            />
          )}
        </div>
        {dashboardLayout.showSalesChart && <SalesChart />}
      </div>
    )
  );

  const renderStatsAndCreditsSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 md:p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-secondary" />
                <div className="h-4 w-20 bg-secondary rounded" />
              </div>
              <div className="h-7 w-16 bg-secondary rounded" />
              <div className="h-4 w-24 bg-secondary rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
          <StatCard
            title="Klienti"
            value={stats?.totalClients || 0}
            subtitle="Aktivních klientů"
            icon={Users}
          />
          <StatCard
            title="Tréninky týden"
            value={stats?.sessionsThisWeek || 0}
            subtitle={`${stats?.sessionsThisMonth || 0} měsíc`}
            icon={Dumbbell}
          />
          <StatCard
            title="Hodnocení"
            value={stats?.averageRating ? stats.averageRating.toFixed(1) : '—'}
            subtitle="Posledních 30 dnů"
            icon={TrendingUp}
          />
          <StatCard
            title="Pozdní zrušení"
            value={stats?.lateCancellations || 0}
            subtitle={`${stats?.canceledSessions || 0} zrušeno`}
            icon={XCircle}
            iconClassName="bg-destructive/10 text-destructive group-hover:bg-destructive"
          />
        </div>
      )}

      <div className="lg:col-span-2 glass rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Kredity klientů
          </h3>
          <Link to="/clients" className="text-sm text-primary hover:text-primary/80">
            Vše
          </Link>
        </div>
        <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-80 overflow-y-auto">
          {clientCredits.slice(0, 10).map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="flex items-center justify-between p-2.5 md:p-3 rounded-xl hover:bg-secondary/50 transition-all"
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <ClientAvatar name={client.name} size="sm" />
                <span className="font-medium text-foreground text-sm md:text-base truncate">{client.name}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <div className="hidden md:block w-24 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      (client.credit_balance || 0) < 0 ? "bg-destructive" :
                      (client.credit_balance || 0) < 500 ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, ((client.credit_balance || 0) / 5000) * 100))}%` }}
                  />
                </div>
                <span className={cn(
                  "font-bold text-sm min-w-[70px] md:min-w-[80px] text-right",
                  getCreditColor(client.credit_balance || 0)
                )}>
                  {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </Link>
          ))}
          {clientCredits.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Zatím nemáte žádné klienty
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderMainContentSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
      {/* Quick Actions - shown first on mobile */}
      <div className="order-first lg:order-last space-y-4 md:space-y-6">
        <div className="glass rounded-2xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">
            Rychlé akce
          </h3>
          <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3">
            <button
              onClick={() => setIsTrainingSheetOpen(true)}
              className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Dumbbell className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground text-center">
                Trénink
              </span>
            </button>
            <button
              onClick={() => setIsMeasurementSheetOpen(true)}
              className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground text-center">
                Měření
              </span>
            </button>
            <button
              onClick={() => setIsDiagnosticSheetOpen(true)}
              className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Stethoscope className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground text-center">
                Diagnostika
              </span>
            </button>
            <Link
              to="/clients"
              className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Users className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground text-center">
                Klient
              </span>
            </Link>
          </div>
        </div>

      </div>

      {/* Today's sessions */}
      <div className="lg:col-span-2 space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">
            Dnešní tréninky
          </h2>
          <Link
            to="/calendar"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            Vše
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-2 md:space-y-3">
          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-24 bg-secondary rounded" />
                    <div className="h-4 w-32 bg-secondary rounded" />
                  </div>
                  <div className="h-6 w-16 bg-secondary rounded-full" />
                </div>
              ))}
            </div>
          ) : todaySessions.length > 0 ? (
            todaySessions.map((session) => {
              const client = clients.find(c => c.id === session.client_id);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  client={client}
                  compact
                  onClick={() => {}}
                />
              );
            })
          ) : (
            <div className="glass rounded-2xl p-6 md:p-8 text-center">
              <Dumbbell className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-2 md:mb-3" />
              <p className="text-sm md:text-base text-muted-foreground">
                Dnes nemáte žádné tréninky
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-3 md:mt-4"
                onClick={() => setIsTrainingSheetOpen(true)}
              >
                Přidat trénink
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  const renderAIWidgetSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <AIWidget />
      {/* Product breakdown - moved here for better layout */}
      {dashboardLayout.showProductBreakdown && financialStats?.productBreakdown && financialStats.productBreakdown.length > 0 && (
        <div className="glass rounded-2xl p-4 md:p-6 h-[320px] md:h-[380px] flex flex-col">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">
            Prodej produktů
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {financialStats.productBreakdown.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm text-foreground">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{product.amount.toLocaleString('cs-CZ')} Kč</p>
                  <p className="text-xs text-success">zisk: {product.profit.toLocaleString('cs-CZ')} Kč</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTrainingStatsSection = () => {
    if (!dashboardLayout.showTrainingStats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="glass rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-primary/10">
              <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            </div>
            <span className="text-xs md:text-sm">Měsíc</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {stats?.sessionsThisMonth || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            tréninků
          </p>
        </div>
        <div className="glass rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-success/10">
              <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
            </div>
            <span className="text-xs md:text-sm">Rok {new Date().getFullYear()}</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {stats?.sessionsThisYear || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            tréninků
          </p>
        </div>
        <div className="glass rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-warning/10">
              <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" />
            </div>
            <span className="text-xs md:text-sm">Celkově</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {stats?.sessionsAllTime || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            tréninků
          </p>
        </div>
        <div className="glass rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 md:gap-3 text-muted-foreground mb-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-primary/10">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            </div>
            <span className="text-xs md:text-sm">Průměr</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">
            {stats?.averagePerWeek?.toFixed(1) || '0'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            /týden
          </p>
        </div>
      </div>
    );
  };

  const renderTrainingTrendSection = () => {
    if (!dashboardLayout.showTrainingTrend) return null;
    return <TrainingTrendChart data={trainingTrend} isLoading={trendLoading} />;
  };

  const renderTopClientsSection = () => {
    if (!dashboardLayout.showTopClients) return null;
    return <TopClientsTable clients={topClients} isLoading={topClientsLoading} />;
  };

  const sectionRenderers: Record<string, () => ReactNode> = {
    charts: renderChartsSection,
    trainingStats: renderTrainingStatsSection,
    trainingTrend: renderTrainingTrendSection,
    topClients: renderTopClientsSection,
    statsAndCredits: renderStatsAndCreditsSection,
    aiWidget: renderAIWidgetSection,
    mainContent: renderMainContentSection,
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
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant={isEditMode ? "default" : "outline"}
            className="gap-2"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                Hotovo
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Upravit
              </>
            )}
          </Button>
          {financialStats && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
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
                  Export do CSV
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
                  Export do PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DashboardSettings layout={dashboardLayout} />
          <Link to="/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Kalendář
            </Button>
          </Link>
          <Button className="gap-2" onClick={() => setIsTrainingSheetOpen(true)}>
            <Plus className="w-4 h-4" />
            Nový trénink
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2 flex-wrap">
          <Button 
            size="sm" 
            className="gap-1.5 flex-1" 
            onClick={() => setIsTrainingSheetOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Trénink
          </Button>
          <Link to="/calendar" className="flex-1">
            <Button variant="outline" size="sm" className="gap-1.5 w-full">
              <Calendar className="w-4 h-4" />
              Kalendář
            </Button>
          </Link>
          <DashboardSettings layout={dashboardLayout} />
        </div>
      </div>

      {/* Sheets */}
      <CreateTrainingSheet
        open={isTrainingSheetOpen}
        onOpenChange={setIsTrainingSheetOpen}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
      />

      <CreateMeasurementSheet
        open={isMeasurementSheetOpen}
        onOpenChange={setIsMeasurementSheetOpen}
        onSubmit={handleCreateMeasurement}
        isLoading={createMeasurement.isPending}
        clients={clients}
      />

      <CreateDiagnosticSheet
        open={isDiagnosticSheetOpen}
        onOpenChange={setIsDiagnosticSheetOpen}
        onSubmit={handleCreateDiagnostic}
        isLoading={createDiagnostic.isPending}
        clients={clients}
      />

      {/* Financial Stats Grid - Sortable */}
      {financialLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleStatsDragEnd}
        >
          <SortableContext
            items={preferences.dashboardStatsOrder}
            strategy={horizontalListSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {preferences.dashboardStatsOrder.map((id) => (
                <SortableItem key={id} id={id} isEditMode={isEditMode} horizontal>
                  {statsComponents[id]}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Sections - Sortable */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionsDragEnd}
      >
        <SortableContext
          items={preferences.dashboardSectionsOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {preferences.dashboardSectionsOrder.map((id) => {
              const content = sectionRenderers[id]?.();
              if (!content) return null;
              return (
                <SortableItem key={id} id={id} isEditMode={isEditMode}>
                  {content}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
