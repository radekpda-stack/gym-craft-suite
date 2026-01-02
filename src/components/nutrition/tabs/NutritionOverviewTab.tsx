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
  PieChart,
  ArrowRight,
  Sparkles
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
  Tooltip,
  LabelList
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  colorClass: string;
  delay?: number;
}

function StatCard({ icon: Icon, value, label, colorClass, delay = 0 }: StatCardProps) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105",
            colorClass
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const hasNoData = !sessions || sessions.length === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Quick Action */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nová kampaň
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileText}
          value={stats.totalSessions}
          label="Celkem kampaní"
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Clock}
          value={stats.activeSessions}
          label="Aktivních"
          colorClass="bg-blue-500/10 text-blue-600"
          delay={50}
        />
        <StatCard
          icon={CheckCircle2}
          value={stats.completedSessions}
          label="Dokončených"
          colorClass="bg-green-500/10 text-green-600"
          delay={100}
        />
        <StatCard
          icon={TrendingUp}
          value={stats.totalEntries}
          label="Záznamů"
          colorClass="bg-purple-500/10 text-purple-600"
          delay={150}
        />
      </div>

      {/* Empty State */}
      {hasNoData ? (
        <Card className="py-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Utensils className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Žádné kampaně</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Začněte sledovat stravování vašich klientů vytvořením první kampaně
            </p>
            <Button onClick={() => setShowNewModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Vytvořit první kampaň
            </Button>
          </div>
        </Card>
      ) : (
        /* Two Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Attention + Active Campaigns */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {/* Attention Required */}
            <AttentionRequiredSection 
              sessions={sessions} 
              onOpenDetail={handleOpenDetail} 
            />

            {/* Active Campaigns */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      Aktivní kampaně
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Probíhající sledování stravy
                    </CardDescription>
                  </div>
                  {activeSessions.length > 4 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-muted-foreground"
                      onClick={() => navigate('/nutrition?tab=campaigns')}
                    >
                      Zobrazit vše
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium text-sm">Žádné aktivní kampaně</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Všechny kampaně jsou dokončené
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewModal(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Vytvořit kampaň
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeSessions.slice(0, 4).map((campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        variant="compact"
                        onComplete={handleComplete}
                        onViewClient={handleViewClient}
                        onOpenDetail={handleOpenDetail}
                      />
                    ))}
                    {activeSessions.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{activeSessions.length - 4} dalších aktivních kampaní
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Charts */}
          <div className="space-y-4 sm:space-y-5">
            {/* Entry Distribution */}
            {chartData.entryTypes.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <PieChart className="h-4 w-4 text-primary" />
                    </div>
                    Rozdělení záznamů
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.entryTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
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
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-3">
                    {chartData.entryTypes.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[idx] }} 
                        />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-semibold">{entry.value}</span>
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    Nejaktivnější klienti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.topClients} layout="vertical" margin={{ right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={55}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Záznamů']}
                          contentStyle={{ 
                            background: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="entries" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 6, 6, 0]}
                        >
                          <LabelList 
                            dataKey="entries" 
                            position="right" 
                            style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <NewCampaignModal 
        open={showNewModal} 
        onOpenChange={setShowNewModal} 
      />
    </div>
  );
}
