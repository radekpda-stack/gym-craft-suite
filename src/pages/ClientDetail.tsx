import { useState } from 'react';
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
  Calendar,
  Dumbbell,
  Activity,
  Stethoscope,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { SessionCard } from '@/components/ui/session-card';
import { StatCard } from '@/components/ui/stat-card';
import { mockClients, mockSessions, mockMeasurements } from '@/data/mockData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ClientDetail() {
  const { id } = useParams();
  const client = mockClients.find((c) => c.id === id);

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

  const clientSessions = mockSessions.filter((s) => s.clientId === client.id);
  const clientMeasurements = mockMeasurements.filter(
    (m) => m.clientId === client.id
  );

  const chartData = clientMeasurements.map((m) => ({
    date: format(m.date, 'd.M.', { locale: cs }),
    weight: m.weight,
    bodyFat: m.bodyFatPercentage,
    muscle: m.muscleMass,
  }));

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
              {format(client.createdAt, 'MMMM yyyy', { locale: cs })}
            </p>
          </div>
        </div>

        <Button variant="outline" className="gap-2">
          <Edit2 className="w-4 h-4" />
          Upravit
        </Button>
      </div>

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
          <p className="font-medium text-foreground">{client.phone}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Cíle</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {client.trainingGoals.map((goal) => (
              <span
                key={goal}
                className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium"
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
        {client.healthRestrictions && (
          <div className="glass rounded-2xl p-5 border-l-4 border-l-warning">
            <div className="flex items-center gap-3 text-warning mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Zdravotní omezení</span>
            </div>
            <p className="font-medium text-foreground text-sm">
              {client.healthRestrictions}
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
            value="trainings"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            Tréninky
          </TabsTrigger>
          <TabsTrigger
            value="measurements"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            Měření
          </TabsTrigger>
          <TabsTrigger
            value="diagnostics"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6"
          >
            Diagnostika
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
              title="Měření"
              value={clientMeasurements.length}
              icon={Activity}
            />
            <StatCard
              title="Průměrné hodnocení"
              value="8.5"
              icon={TrendingUp}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Vývoj hmotnosti a tělesného složení
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Váha (kg)"
                    />
                    <Line
                      type="monotone"
                      dataKey="muscle"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))' }}
                      name="Svalová hmota (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Poznámky
              </h3>
              <p className="text-muted-foreground">{client.notes}</p>
            </div>
          )}
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
              <Button className="mt-4">Vytvořit trénink</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          {clientMeasurements.length > 0 ? (
            <div className="grid gap-4">
              {clientMeasurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="glass rounded-2xl p-6 hover:glow transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">
                      {format(measurement.date, 'd. MMMM yyyy', { locale: cs })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {measurement.weight && (
                      <div>
                        <p className="text-sm text-muted-foreground">Váha</p>
                        <p className="text-2xl font-bold text-foreground">
                          {measurement.weight} kg
                        </p>
                      </div>
                    )}
                    {measurement.bodyFatPercentage && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Tělesný tuk
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {measurement.bodyFatPercentage}%
                        </p>
                      </div>
                    )}
                    {measurement.muscleMass && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Svalová hmota
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {measurement.muscleMass} kg
                        </p>
                      </div>
                    )}
                    {measurement.basalMetabolism && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Bazální metabolismus
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {measurement.basalMetabolism} kcal
                        </p>
                      </div>
                    )}
                  </div>
                  {measurement.notes && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {measurement.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Zatím žádná měření
              </h3>
              <p className="text-muted-foreground mt-1">
                Přidejte první měření pro tohoto klienta
              </p>
              <Button className="mt-4">Přidat měření</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagnostics">
          <div className="glass rounded-2xl p-12 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              Diagnostika
            </h3>
            <p className="text-muted-foreground mt-1">
              Přidejte diagnostické záznamy pro tohoto klienta
            </p>
            <Button className="mt-4">Přidat diagnostiku</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
