import { useMemo } from 'react';
import { 
  Utensils, 
  Coffee, 
  Droplets, 
  TrendingUp,
  PieChart,
  BarChart3,
  Users,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAllNutritionSessions, useNutritionStats } from '@/hooks/useAllNutritionSessions';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function NutritionInfographics() {
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const { stats } = useNutritionStats();

  // Calculate aggregated data for charts
  const chartData = useMemo(() => {
    if (!sessions?.length) return { entryTypes: [], topClients: [], statusDistribution: [] };

    // Entry type distribution
    const totalFood = sessions.reduce((sum, s) => sum + s.food_count, 0);
    const totalDrink = sessions.reduce((sum, s) => sum + s.drink_count, 0);
    const totalCoffee = sessions.reduce((sum, s) => sum + s.coffee_count, 0);
    
    const entryTypes = [
      { name: 'Jídlo', value: totalFood, icon: Utensils },
      { name: 'Nápoje', value: totalDrink, icon: Droplets },
      { name: 'Káva', value: totalCoffee, icon: Coffee },
    ];

    // Top clients by entries
    const clientEntries = new Map<string, { name: string; entries: number }>();
    sessions.forEach(s => {
      const existing = clientEntries.get(s.client_id);
      if (existing) {
        existing.entries += s.entries_count;
      } else {
        clientEntries.set(s.client_id, { name: s.client_name, entries: s.entries_count });
      }
    });
    
    const topClients = Array.from(clientEntries.values())
      .sort((a, b) => b.entries - a.entries)
      .slice(0, 5);

    // Status distribution
    const statusCounts = {
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      expired: sessions.filter(s => s.status === 'expired').length,
    };

    const statusDistribution = [
      { name: 'Aktivní', value: statusCounts.active, color: 'hsl(142, 76%, 36%)' },
      { name: 'Dokončené', value: statusCounts.completed, color: 'hsl(221, 83%, 53%)' },
      { name: 'Vypršelé', value: statusCounts.expired, color: 'hsl(0, 84%, 60%)' },
    ].filter(d => d.value > 0);

    return { entryTypes, topClients, statusDistribution };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Infografika stravy
        </h1>
        <p className="text-muted-foreground mt-1">
          Vizuální přehled stravovacích dat napříč klienty
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {chartData.entryTypes.find(e => e.name === 'Jídlo')?.value || 0}
                </p>
                <p className="text-sm text-muted-foreground">Záznamů jídla</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {chartData.entryTypes.find(e => e.name === 'Nápoje')?.value || 0}
                </p>
                <p className="text-sm text-muted-foreground">Záznamů nápojů</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {chartData.entryTypes.find(e => e.name === 'Káva')?.value || 0}
                </p>
                <p className="text-sm text-muted-foreground">Záznamů kávy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Rozdělení záznamů
            </CardTitle>
            <CardDescription>
              Poměr typů záznamů napříč všemi dotazníky
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.entryTypes.every(e => e.value === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Zatím žádná data
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData.entryTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.entryTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Stav dotazníků
            </CardTitle>
            <CardDescription>
              Rozdělení dotazníků podle stavu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.statusDistribution.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Zatím žádné dotazníky
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nejaktivnější klienti
            </CardTitle>
            <CardDescription>
              Klienti s nejvíce záznamy ve stravovacích dotaznících
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.topClients.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Zatím žádná data
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="entries" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      name="Počet záznamů"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Souhrn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Celkem dotazníků</p>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Průměr záznamů/dotazník</p>
              <p className="text-2xl font-bold">{stats.avgEntriesPerSession}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celkem záznamů</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Míra dokončení</p>
              <p className="text-2xl font-bold">
                {stats.totalSessions > 0 
                  ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
