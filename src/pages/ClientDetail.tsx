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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { SessionCard } from '@/components/ui/session-card';
import { StatCard } from '@/components/ui/stat-card';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { ClientFormValues } from '@/lib/validations/client';
import { CreditManagement } from '@/components/credit/CreditManagement';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: allSessions = [] } = useTrainingSessions(id);
  const updateClient = useUpdateClient();
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/clients"
            className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ClientAvatar name={client.name} size="xl" />
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {client.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Klient od{' '}
              {format(new Date(client.created_at), 'MMMM yyyy', { locale: cs })}
            </p>
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
        <TabsList className="bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            Přehled
          </TabsTrigger>
          <TabsTrigger
            value="credit"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Kredit
          </TabsTrigger>
          <TabsTrigger
            value="trainings"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            Tréninky ({clientSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              title="Průměrné hodnocení"
              value={averageRating > 0 ? averageRating.toFixed(1) : '—'}
              icon={TrendingUp}
            />
          </div>

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

        <TabsContent value="credit" className="space-y-6">
          <CreditManagement
            clientId={client.id}
            clientName={client.name}
            currentBalance={client.credit_balance || 0}
          />
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4">
          {clientSessions.length > 0 ? (
            clientSessions.map((session) => (
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
      </Tabs>
    </div>
  );
}
