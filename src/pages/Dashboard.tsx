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
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SessionCard } from '@/components/ui/session-card';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useClients } from '@/hooks/useClients';
import { useDashboardStats, useTodaySessions } from '@/hooks/useDashboardStats';
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

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: todaySessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

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

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Quick Actions & Recent Clients */}
        <div className="space-y-6">
          {/* Quick Actions */}
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

          {/* Recent Clients */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Nedávní klienti
              </h3>
              <Link
                to="/clients"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Všichni
              </Link>
            </div>
            <div className="space-y-3">
              {clientsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : clients.length > 0 ? (
                clients.slice(0, 4).map((client) => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all duration-200 group"
                  >
                    <ClientAvatar name={client.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </p>
                      <div className={cn(
                        "flex items-center gap-1 text-sm",
                        getCreditColor(client.credit_balance || 0)
                      )}>
                        <CreditCard className="w-3 h-3" />
                        <span>{(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Zatím nemáte žádné klienty
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
