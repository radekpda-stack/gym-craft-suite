import { useState, useMemo, ReactNode } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
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
  Loader2,
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
import { useDashboardLayout } from '@/hooks/useAppSettings';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { useCreateDiagnostic } from '@/hooks/useDiagnostics';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { TaxCalculator } from '@/components/dashboard/TaxCalculator';
import { DashboardSettings } from '@/components/dashboard/DashboardSettings';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { MeasurementFormValues } from '@/components/measurements/MeasurementForm';
import { DiagnosticFormValues } from '@/components/diagnostics/DiagnosticForm';
import { cn } from '@/lib/utils';
import { exportFinancialSummaryToCSV, exportFinancialSummaryToPDF, FinancialSummaryData } from '@/lib/export';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: todaySessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: financialStats, isLoading: financialLoading } = useFinancialStats();
  const { data: clientCredits = [] } = useClientCredits();
  const dashboardLayout = useDashboardLayout();
  const { preferences, updateDashboardStatsOrder, updateDashboardSectionsOrder } = useLayoutPreferences();

  const [isTrainingSheetOpen, setIsTrainingSheetOpen] = useState(false);
  const [isMeasurementSheetOpen, setIsMeasurementSheetOpen] = useState(false);
  const [isDiagnosticSheetOpen, setIsDiagnosticSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <div className="p-2 rounded-xl bg-success/10">
            <Wallet className="w-4 h-4 text-success" />
          </div>
          <span className="text-sm">Příjmy tento měsíc</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {(financialStats?.incomeThisMonth || 0).toLocaleString('cs-CZ')} Kč
        </p>
        {incomeChange !== 0 && (
          <div className={cn(
            "flex items-center gap-1 mt-1 text-sm",
            incomeChange > 0 ? "text-success" : "text-destructive"
          )}>
            {incomeChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(incomeChange).toFixed(0)}% oproti minulému měsíci</span>
          </div>
        )}
      </div>
    ),
    profit: (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <div className="p-2 rounded-xl bg-success/10">
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <span className="text-sm">Čistý zisk (produkty)</span>
        </div>
        <p className="text-2xl font-bold text-success">
          {(financialStats?.productProfit || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Tržby: {(financialStats?.productIncome || 0).toLocaleString('cs-CZ')} Kč
        </p>
      </div>
    ),
    credit: (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm">Celkový kredit klientů</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {(financialStats?.totalCredit || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {clients.length} klientů celkem
        </p>
      </div>
    ),
    costs: (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <div className="p-2 rounded-xl bg-warning/10">
            <Package className="w-4 h-4 text-warning" />
          </div>
          <span className="text-sm">Náklady na produkty</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {(financialStats?.productCost || 0).toLocaleString('cs-CZ')} Kč
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Nákupní ceny
        </p>
      </div>
    ),
    lowCredit: (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <div className="p-2 rounded-xl bg-destructive/10">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-sm">Nízký kredit</span>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {financialStats?.clientsWithLowCredit || 0}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Klientů pod 500 Kč
        </p>
      </div>
    ),
  };

  // Section components
  const renderChartsSection = () => (
    (dashboardLayout.showIncomeChart || dashboardLayout.showMonthlyChart) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardLayout.showIncomeChart && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Příjmy za posledních 30 dní
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialStats?.incomeByDay || []}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('cs-CZ')} Kč`, 'Platby']}
                  />
                  <Area
                    type="monotone"
                    dataKey="payments"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fill="url(#incomeGradient)"
                    name="Platby"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {dashboardLayout.showMonthlyChart && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Měsíční přehled
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialStats?.incomeByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('cs-CZ')} Kč`]}
                  />
                  <Bar dataKey="payments" fill="hsl(var(--success))" name="Platby" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="products" fill="hsl(var(--warning))" name="Produkty" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )
  );

  const renderStatsAndCreditsSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <StatCard
            title="Klienti"
            value={stats?.totalClients || 0}
            subtitle="Aktivních klientů"
            icon={Users}
          />
          <StatCard
            title="Tréninky tento týden"
            value={stats?.sessionsThisWeek || 0}
            subtitle={`${stats?.sessionsThisMonth || 0} tento měsíc`}
            icon={Dumbbell}
          />
          <StatCard
            title="Průměrné hodnocení"
            value={stats?.averageRating ? stats.averageRating.toFixed(1) : '—'}
            subtitle="Z posledních 30 dnů"
            icon={TrendingUp}
          />
          <StatCard
            title="Pozdní zrušení"
            value={stats?.lateCancellations || 0}
            subtitle={`${stats?.canceledSessions || 0} celkem zrušeno`}
            icon={XCircle}
            iconClassName="bg-destructive/10 text-destructive group-hover:bg-destructive"
          />
        </div>
      )}

      <div className="lg:col-span-2 glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Přehled kreditů klientů
          </h3>
          <Link to="/clients" className="text-sm text-primary hover:text-primary/80">
            Všichni klienti
          </Link>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {clientCredits.map((client) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <ClientAvatar name={client.name} size="sm" />
                <span className="font-medium text-foreground">{client.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
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
                  "font-bold text-sm min-w-[80px] text-right",
                  getCreditColor(client.credit_balance || 0)
                )}>
                  {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </Link>
          ))}
          {clientCredits.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Zatím nemáte žádné klienty
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderMainContentSection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Dnešní tréninky
          </h2>
          <Link
            to="/calendar"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            Zobrazit vše
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : todaySessions.length > 0 ? (
            todaySessions.map((session) => {
              const client = clients.find(c => c.id === session.client_id);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  client={client}
                  onClick={() => {}}
                />
              );
            })
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Dnes nemáte naplánované žádné tréninky
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsTrainingSheetOpen(true)}
              >
                Přidat trénink
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Rychlé akce
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsTrainingSheetOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Dumbbell className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                Nový trénink
              </span>
            </button>
            <button
              onClick={() => setIsMeasurementSheetOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Activity className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                Nové měření
              </span>
            </button>
            <button
              onClick={() => setIsDiagnosticSheetOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Stethoscope className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                Diagnostika
              </span>
            </button>
            <Link
              to="/clients"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200 group"
            >
              <Users className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                Nový klient
              </span>
            </Link>
          </div>
        </div>

        {dashboardLayout.showProductBreakdown && financialStats?.productBreakdown && financialStats.productBreakdown.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Prodej produktů
            </h3>
            <div className="space-y-3">
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
    </div>
  );

  const renderTaxCalculatorSection = () => (
    dashboardLayout.showTaxCalculator && financialStats && (
      <TaxCalculator 
        yearlyIncome={financialStats.yearlyIncome} 
        yearlyExpenses={financialStats.yearlyExpenses} 
      />
    )
  );

  const sectionRenderers: Record<string, () => ReactNode> = {
    charts: renderChartsSection,
    statsAndCredits: renderStatsAndCreditsSection,
    mainContent: renderMainContentSection,
    taxCalculator: renderTaxCalculatorSection,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
                Upravit rozložení
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
