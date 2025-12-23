import { useDemoMode } from '@/contexts/DemoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, TrendingUp, Wallet, Clock, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export function DemoDashboard() {
  const { demoClient, demoTraining, demoDashboardStats } = useDemoMode();

  const stats = demoDashboardStats || {
    totalClients: 1,
    activeClients: 1,
    totalTrainings: 24,
    completedTrainings: 23,
    monthlyRevenue: 18400,
    weeklyTrainings: 6,
    upcomingTrainings: 1,
    averageRating: 4.7,
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Dobré ráno' : today.getHours() < 18 ? 'Dobré odpoledne' : 'Dobrý večer';

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <h1 className="text-2xl font-bold text-foreground">DEMO Trenér</h1>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              DEMO
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, d. MMMM yyyy", { locale: cs })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Klienti</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">aktivních</p>
            </CardContent>
          </Card>

          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tento týden</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyTrainings}</div>
              <p className="text-xs text-muted-foreground">tréninků</p>
            </CardContent>
          </Card>

          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Měsíční příjem</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString('cs-CZ')} Kč</div>
              <p className="text-xs text-success">+12% oproti minulému</p>
            </CardContent>
          </Card>

          <Card className="glass border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hodnocení</CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating}</div>
              <p className="text-xs text-muted-foreground">průměrné</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Plan */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Dnešní plán
            </CardTitle>
          </CardHeader>
          <CardContent>
            {demoTraining ? (
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{demoClient?.name || 'Demo klient'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(demoTraining.date), 'HH:mm', { locale: cs })} - {demoTraining.duration} min
                    </p>
                  </div>
                  <Badge variant={demoTraining.status === 'scheduled' ? 'secondary' : 'default'}>
                    {demoTraining.status === 'scheduled' ? 'Naplánováno' : 'Dokončeno'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{demoTraining.notes}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Žádné tréninky na dnešek</p>
            )}
          </CardContent>
        </Card>

        {/* Client Overview */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Klienti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {demoClient ? (
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {demoClient.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{demoClient.name}</p>
                      <p className="text-sm text-muted-foreground">{demoClient.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success">{demoClient.credit_balance.toLocaleString('cs-CZ')} Kč</p>
                    <p className="text-xs text-muted-foreground">kredit</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {demoClient.training_goals.map((goal, i) => (
                    <Badge key={i} variant="outline">{goal}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Žádní klienti</p>
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistiky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Celkem tréninků</p>
                <p className="text-xl font-bold">{stats.totalTrainings}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Dokončeno</p>
                <p className="text-xl font-bold text-success">{stats.completedTrainings}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Nadcházejících</p>
                <p className="text-xl font-bold text-primary">{stats.upcomingTrainings}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Aktivní klienti</p>
                <p className="text-xl font-bold">{stats.activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
