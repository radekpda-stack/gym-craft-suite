import { useMemo } from 'react';
import { 
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Coffee,
  Droplets,
  Utensils,
  Calendar,
  Users,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function NutritionAnalysisTab() {
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const { stats } = useNutritionStats();

  const chartData = useMemo(() => {
    if (!sessions?.length) return { entryTypes: [], topClients: [], statusDistribution: [] };

    const totalFood = sessions.reduce((sum, s) => sum + s.food_count, 0);
    const totalDrink = sessions.reduce((sum, s) => sum + s.drink_count, 0);
    const totalCoffee = sessions.reduce((sum, s) => sum + s.coffee_count, 0);
    
    const entryTypes = [
      { name: 'Jídlo', value: totalFood, icon: Utensils },
      { name: 'Nápoje', value: totalDrink, icon: Droplets },
      { name: 'Káva', value: totalCoffee, icon: Coffee },
    ];

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

    const statusDistribution = [
      { name: 'Aktivní', value: sessions.filter(s => s.status === 'active').length, color: 'hsl(221, 83%, 53%)' },
      { name: 'Dokončené', value: sessions.filter(s => s.status === 'completed').length, color: 'hsl(142, 76%, 36%)' },
    ].filter(d => d.value > 0);

    return { entryTypes, topClients, statusDistribution };
  }, [sessions]);

  const insights = useMemo(() => {
    if (!sessions?.length) return { patterns: [], issues: [], recommendations: [] };
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const avgEntries = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.entries_count, 0) / completedSessions.length
      : 0;
    
    const patterns: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (chartData.entryTypes[2]?.value > chartData.entryTypes[1]?.value) {
      issues.push('Vysoký příjem kávy v porovnání s ostatními nápoji');
      recommendations.push('Zvážit omezení kávy a nahrazení vodou nebo čajem');
    }

    if (avgEntries < 15) {
      issues.push('Nízký průměrný počet záznamů na kampaň');
      recommendations.push('Motivovat klienty k pravidelnějšímu zaznamenávání');
    }

    if (stats.completedSessions > 0) {
      const completionRate = (stats.completedSessions / stats.totalSessions) * 100;
      if (completionRate > 70) {
        patterns.push(`Vysoká míra dokončení kampaní (${Math.round(completionRate)}%)`);
      } else {
        issues.push(`Nízká míra dokončení kampaní (${Math.round(completionRate)}%)`);
        recommendations.push('Nastavit připomínky pro klienty');
      }
    }

    if (chartData.topClients.length > 0) {
      patterns.push(`Nejaktivnější klient: ${chartData.topClients[0].name} (${chartData.topClients[0].entries} záznamů)`);
    }

    return { patterns, issues, recommendations };
  }, [sessions, chartData, stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Vzorce
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.patterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nedostatek dat</p>
            ) : (
              <ul className="space-y-2">
                {insights.patterns.map((pattern, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Problémy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné problémy</p>
            ) : (
              <ul className="space-y-2">
                {insights.issues.map((issue, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-green-500" />
              Doporučení
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Vše v pořádku</p>
            ) : (
              <ul className="space-y-2">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Rozdělení záznamů
            </CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nejaktivnější klienti
            </CardTitle>
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
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="entries" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      name="Záznamů"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
