import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  Target,
  AlertTriangle,
  Dumbbell,
  Activity,
  TrendingUp,
  Loader2,
  CreditCard,
  Cake,
  Wallet,
  Camera,
  XCircle,
  Calendar,
  Clock,
  Tag,
  Star,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { SessionCard } from '@/components/ui/session-card';
import { StatCard } from '@/components/ui/stat-card';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useToggleFavorite } from '@/hooks/useFavoriteClients';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { ClientFormValues } from '@/lib/validations/client';
import { CreditManagement } from '@/components/credit/CreditManagement';
import { ClientMediaTab } from '@/components/media/ClientMediaTab';
import { ClientTagsManager } from '@/components/clients/ClientTagsManager';
import { TrainingHistory } from '@/components/trainings/TrainingHistory';
import { TrainingStats } from '@/components/trainings/TrainingStats';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: allSessions = [] } = useTrainingSessions(id);
  const updateClient = useUpdateClient();
  const toggleFavorite = useToggleFavorite();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Cast sessions to proper type
  const clientSessions = allSessions.map(s => ({
    ...s,
    status: s.status as 'scheduled' | 'completed' | 'canceled'
  }));

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Klient nenalezen
          </h2>
          <Link to="/clients" className="text-primary mt-2 inline-block">
            Zpět na seznam klientů
          </Link>
        </div>
      </div>
    );
  }

  const getCreditColor = (credit: number) => {
    if (credit < 0) return "text-destructive";
    if (credit < 500) return "text-warning";
    return "text-success";
  };

  const completedSessions = clientSessions.filter(s => s.status === 'completed');
  const canceledSessions = clientSessions.filter(s => s.status === 'canceled');
  const lateCancellations = canceledSessions.filter(s => s.is_late_cancellation);
  const canceledPercentage = clientSessions.length > 0 
    ? ((canceledSessions.length / clientSessions.length) * 100).toFixed(1)
    : '0';
  const averageRating = completedSessions.length > 0
    ? completedSessions
        .filter(s => s.subjective_rating !== null)
        .reduce((sum, s) => sum + (s.subjective_rating || 0), 0) / 
        completedSessions.filter(s => s.subjective_rating !== null).length
    : 0;

  const handleEditClient = async (data: ClientFormValues) => {
    await updateClient.mutateAsync({ id: client.id, values: data });
    setIsEditOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: 'Klienti', href: '/clients' },
          { label: client.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <ClientAvatar name={client.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {client.name}
              </h1>
              <button
                onClick={() => toggleFavorite.mutate({ clientId: client.id, isFavorite: !client.is_favorite })}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  client.is_favorite 
                    ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" 
                    : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                )}
              >
                <Star className={cn("w-5 h-5", client.is_favorite && "fill-current")} />
              </button>
            </div>
            <p className="text-muted-foreground mt-1">
              Klient od{' '}
              {format(new Date(client.created_at), 'MMMM yyyy', { locale: cs })}
            </p>
            <div className="mt-2">
              <ClientTagsManager clientId={client.id} />
            </div>
          </div>
        </div>

        <Button variant="outline" className="gap-2" onClick={() => setIsEditOpen(true)}>
          <Edit2 className="w-4 h-4" />
          Upravit
        </Button>
      </div>

      <EditClientSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={handleEditClient}
        isLoading={updateClient.isPending}
        client={client}
      />

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-sm">Email</span>
          </div>
          <p className="font-medium text-foreground">{client.email}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Phone className="w-4 h-4" />
            <span className="text-sm">Telefon</span>
          </div>
          <p className="font-medium text-foreground">{client.phone || '—'}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm">Kredit</span>
          </div>
          <p className={cn(
            "font-bold text-lg",
            getCreditColor(client.credit_balance || 0)
          )}>
            {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        {client.birth_date && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Cake className="w-4 h-4" />
              <span className="text-sm">Datum narození</span>
            </div>
            <p className="font-medium text-foreground">
              {format(new Date(client.birth_date), 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
        )}
      </div>

      {/* Goals & Restrictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-3">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Tréninkové cíle</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(client.training_goals || []).length > 0 ? (
              client.training_goals.map((goal) => (
                <span
                  key={goal}
                  className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                >
                  {goal}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Žádné cíle</span>
            )}
          </div>
        </div>
        {client.health_restrictions && (
          <div className="glass rounded-2xl p-5 border-l-4 border-l-warning">
            <div className="flex items-center gap-3 text-warning mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Zdravotní omezení</span>
            </div>
            <p className="text-foreground">
              {client.health_restrictions}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            Přehled
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            <Tag className="w-4 h-4 mr-2" />
            Historie
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Statistiky
          </TabsTrigger>
          <TabsTrigger
            value="credit"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Kredit
          </TabsTrigger>
          <TabsTrigger
            value="trainings"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            Tréninky ({clientSessions.filter(s => s.status !== 'canceled').length})
          </TabsTrigger>
          <TabsTrigger
            value="canceled"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Zrušené ({canceledSessions.length})
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4"
          >
            <Camera className="w-4 h-4 mr-2" />
            Média
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Celkem tréninků"
              value={clientSessions.length}
              icon={Dumbbell}
            />
            <StatCard
              title="Dokončených"
              value={completedSessions.length}
              icon={Activity}
            />
            <StatCard
              title="Zrušených"
              value={canceledSessions.length}
              subtitle={`${lateCancellations.length} pozdě`}
              icon={XCircle}
              iconClassName={canceledSessions.length > 0 ? "bg-destructive/10 text-destructive group-hover:bg-destructive" : undefined}
            />
            <StatCard
              title="Průměrné hodnocení"
              value={averageRating > 0 ? averageRating.toFixed(1) : '—'}
              icon={TrendingUp}
            />
          </div>

          {/* Canceled Stats Summary */}
          {canceledSessions.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Statistika zrušených tréninků
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Celkem zrušeno</p>
                  <p className="text-2xl font-bold text-foreground">{canceledSessions.length}</p>
                  <p className="text-sm text-muted-foreground">{canceledPercentage}% všech tréninků</p>
                </div>
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning">Pozdní zrušení (&lt;24h)</p>
                  <p className="text-2xl font-bold text-warning">{lateCancellations.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {canceledSessions.length > 0 
                      ? ((lateCancellations.length / canceledSessions.length) * 100).toFixed(0)
                      : 0}% ze zrušených
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Včasná zrušení</p>
                  <p className="text-2xl font-bold text-foreground">
                    {canceledSessions.length - lateCancellations.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Více než 24h předem</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Poznámky
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <TrainingHistory clientId={client.id} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <TrainingStats clientId={client.id} />
        </TabsContent>

        <TabsContent value="credit" className="space-y-6">
          <CreditManagement
            clientId={client.id}
            clientName={client.name}
            currentBalance={client.credit_balance || 0}
          />
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4">
          {clientSessions.filter(s => s.status !== 'canceled').length > 0 ? (
            clientSessions.filter(s => s.status !== 'canceled').map((session) => (
              <SessionCard key={session.id} session={session} client={client} />
            ))
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Zatím žádné tréninky
              </h3>
              <p className="text-muted-foreground mt-1">
                Vytvořte první trénink pro tohoto klienta
              </p>
              <Link to="/trainings">
                <Button className="mt-4">Vytvořit trénink</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="canceled" className="space-y-4">
          {canceledSessions.length > 0 ? (
            <div className="space-y-3">
              {canceledSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'glass rounded-2xl p-5 border-l-4 transition-all duration-200 hover:scale-[1.01]',
                    session.is_late_cancellation
                      ? 'border-l-warning bg-warning/5'
                      : 'border-l-muted-foreground'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <XCircle className={cn(
                          "w-5 h-5",
                          session.is_late_cancellation ? "text-warning" : "text-muted-foreground"
                        )} />
                        <span className="font-medium text-foreground">
                          {format(new Date(session.date), 'd. MMMM yyyy', { locale: cs })}
                        </span>
                        {session.is_late_cancellation && (
                          <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                            Pozdní zrušení
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-muted-foreground mt-2 text-sm">
                          {session.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(session.date), 'HH:mm', { locale: cs })}</span>
                        </div>
                        <span>•</span>
                        <span>{session.duration} min</span>
                        {session.participant_count > 1 && (
                          <>
                            <span>•</span>
                            <span>{session.participant_count} osob</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {session.canceled_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>Zrušeno {format(new Date(session.canceled_at), 'd.M.yyyy', { locale: cs })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Žádné zrušené tréninky
              </h3>
              <p className="text-muted-foreground mt-1">
                Tento klient zatím nezrušil žádný trénink
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <ClientMediaTab clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
