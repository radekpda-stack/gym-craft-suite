import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Users,
  Dumbbell,
  TrendingUp,
  XCircle,
  Plus,
  Calendar,
  Activity,
  ChevronRight,
  Loader2,
  CreditCard,
  Stethoscope,
  Wallet,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SessionCard } from '@/components/ui/session-card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { useDashboardStats, useTodaySessions } from '@/hooks/useDashboardStats';
import { useFinancialStats, useClientCredits } from '@/hooks/useFinancialStats';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { useCreateDiagnostic } from '@/hooks/useDiagnostics';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { MeasurementFormValues } from '@/components/measurements/MeasurementForm';
import { DiagnosticFormValues } from '@/components/diagnostics/DiagnosticForm';
import { cn } from '@/lib/utils';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: todaySessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: financialStats, isLoading: financialLoading } = useFinancialStats();
  const { data: clientCredits = [] } = useClientCredits();

  const [isTrainingSheetOpen, setIsTrainingSheetOpen] = useState(false);
  const [isMeasurementSheetOpen, setIsMeasurementSheetOpen] = useState(false);
  const [isDiagnosticSheetOpen, setIsDiagnosticSheetOpen] = useState(false);

  const createTraining = useCreateTrainingSession();
  const createMeasurement = useCreateMeasurement();
  const createDiagnostic = useCreateDiagnostic();

  const isLoading = statsLoading || sessionsLoading || clientsLoading;

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

      {/* Financial Stats Grid */}
      {financialLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <div className="p-2 rounded-xl bg-warning/10">
                <Package className="w-4 h-4 text-warning" />
              </div>
              <span className="text-sm">Příjmy z produktů</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(financialStats?.productIncome || 0).toLocaleString('cs-CZ')} Kč
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Celkem prodáno
            </p>
          </div>
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
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Chart */}
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

        {/* Monthly Comparison */}
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
      </div>

      {/* Training Stats + Client Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Stats */}
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

        {/* Client Credits Overview */}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Sessions */}
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

        {/* Quick Actions */}
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

          {/* Product Breakdown */}
          {financialStats?.productBreakdown && financialStats.productBreakdown.length > 0 && (
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
                      <p className="text-xs text-muted-foreground">{product.count}x prodáno</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
