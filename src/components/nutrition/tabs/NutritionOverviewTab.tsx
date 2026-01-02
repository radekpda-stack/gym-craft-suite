import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Clock,
  CheckCircle2,
  FileText,
  Utensils,
  TrendingUp,
  Coffee,
  Droplets,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllNutritionSessions, useNutritionStats } from '@/hooks/useAllNutritionSessions';
import { useUpdateNutritionLogSession } from '@/hooks/useNutritionLog';
import { CampaignCard } from '@/components/nutrition/CampaignCard';
import { AttentionRequiredSection } from '@/components/nutrition/AttentionRequiredSection';
import { NewCampaignModal } from '@/components/nutrition/NewCampaignModal';
import { toast } from 'sonner';
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function NutritionOverviewTab() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useAllNutritionSessions();
  const { stats } = useNutritionStats();
  const updateSession = useUpdateNutritionLogSession();
  const [showNewModal, setShowNewModal] = useState(false);

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];

  // Chart data
  const chartData = useMemo(() => {
    if (!sessions?.length) return { entryTypes: [], topClients: [] };
    
    const totals = sessions.reduce((acc, s) => ({
      food: acc.food + s.food_count,
      drinks: acc.drinks + s.drink_count,
      coffee: acc.coffee + s.coffee_count
    }), { food: 0, drinks: 0, coffee: 0 });

    const entryTypes = [
      { name: 'Jídla', value: totals.food, icon: Utensils },
      { name: 'Nápoje', value: totals.drinks, icon: Droplets },
      { name: 'Káva', value: totals.coffee, icon: Coffee }
    ].filter(e => e.value > 0);

    const topClients = [...sessions]
      .sort((a, b) => b.entries_count - a.entries_count)
      .slice(0, 5)
      .map(s => ({
        name: s.client_name.split(' ')[0],
        entries: s.entries_count
      }));

    return { entryTypes, topClients };
  }, [sessions]);

  const handleComplete = async (sessionId: string) => {
    try {
      await updateSession.mutateAsync({ sessionId, status: 'completed' });
      toast.success('Kampaň ukončena');
    } catch {
      toast.error('Nepodařilo se ukončit kampaň');
    }
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleOpenDetail = (sessionId: string) => {
    navigate(`/nutrition/campaigns/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Action */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nová kampaň
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.activeSessions}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Aktivních</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.completedSessions}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Dokončených</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-purple-500/10 shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.totalEntries}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Záznamů</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Attention + Active Campaigns */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Attention Required */}
          {sessions && sessions.length > 0 && (
            <AttentionRequiredSection 
              sessions={sessions} 
              onOpenDetail={handleOpenDetail} 
            />
          )}

          {/* Active Campaigns */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Aktivní kampaně
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Probíhající sledování
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Utensils className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium text-sm">Žádné aktivní kampaně</p>
                  <Button 
                    variant="outline" 
                    className="mt-3" 
                    size="sm"
                    onClick={() => setShowNewModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Vytvořit kampaň
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSessions.slice(0, 5).map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      variant="compact"
                      onComplete={handleComplete}
                      onViewClient={handleViewClient}
                      onOpenDetail={handleOpenDetail}
                    />
                  ))}
                  {activeSessions.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{activeSessions.length - 5} dalších aktivních kampaní
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Charts */}
        <div className="space-y-4 sm:space-y-6">
          {/* Entry Distribution */}
          {chartData.entryTypes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Rozdělení záznamů
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={chartData.entryTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.entryTypes.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, 'Počet']}
                        contentStyle={{ 
                          background: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {chartData.entryTypes.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: COLORS[idx] }} 
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Clients */}
          {chartData.topClients.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nejaktivnější klienti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.topClients} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={60}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Záznamů']}
                        contentStyle={{ 
                          background: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="entries" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <NewCampaignModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal} 
      />
    </div>
  );
}
