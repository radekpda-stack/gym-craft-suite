/**
 * ClientProgressView - Detailed progress view for a single client
 * Merged with Comparison tab. Shows client list before selection.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ExternalLink, BarChart2, Trophy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientProgressStats, useAllClientsProgress, type ProgressPeriod } from '@/hooks/useClientProgressStats';
import { ProgressHeroCard } from './ProgressHeroCard';
import { ProgressSparklineGrid } from './ProgressSparklineGrid';
import { PRHistoryTimeline } from './PRHistoryTimeline';
import { MultiClientComparison } from './MultiClientComparison';
import { CohortBenchmarkView } from './CohortBenchmarkView';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientProgressViewProps {
  initialClientId?: string;
}

export function ClientProgressView({ initialClientId }: ClientProgressViewProps) {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'compare' | 'benchmark'>('single');
  const [period, setPeriod] = useState<ProgressPeriod>('12m');

  const { data: allClients = [], isLoading: clientsLoading } = useAllClientsProgress();

  const { data: progressStats, isLoading: statsLoading } = useClientProgressStats({
    clientId: selectedClientId,
    limit: 12,
    period,
  });

  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExerciseClick = (exercise: { exerciseName: string; exerciseId: string | null }) => {
    if (selectedClientId) {
      navigate(`/clients/${selectedClientId}?tab=performance&exercise=${encodeURIComponent(exercise.exerciseName)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Tabs - merged comparison + benchmark */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-secondary/30 backdrop-blur-sm">
          <TabsTrigger value="single" className="gap-2">
            <Users className="w-4 h-4" />
            Klient
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <BarChart2 className="w-4 h-4" />
            Porovnání
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2">
            <Trophy className="w-4 h-4" />
            Benchmark
          </TabsTrigger>
        </TabsList>

        {/* Single Client View */}
        <TabsContent value="single" className="mt-6 space-y-6">
          {/* Client selector - only when a client is already selected */}
          {selectedClientId && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClientId(null)}
                className="gap-1.5"
              >
                <Users className="w-4 h-4" />
                Změnit klienta
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/clients/${selectedClientId}`)}
                className="gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Karta klienta</span>
              </Button>

              {/* Period selector */}
              <div className="ml-auto flex gap-1 p-1 rounded-full bg-secondary/50">
                {([['12m', '12 měs.'], ['all', 'Vše']] as const).map(([val, label]) => (
                  <Button
                    key={val}
                    variant={period === val ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'rounded-full text-xs px-3 h-7',
                      period === val && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => setPeriod(val)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {!selectedClientId ? (
            <div className="space-y-4">
              {/* Search */}
              <Input
                placeholder="Hledat klienta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />

              {/* Client list with mini stats */}
              {clientsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-sm">Žádní klienti nenalezeni</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl text-left',
                        'bg-card/80 backdrop-blur-md border border-border/50',
                        'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary/30'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.entriesCount} záznamů za 90 dní
                          {client.lastActivity && (
                            <> · poslední {formatDistanceToNow(parseISO(client.lastActivity), { addSuffix: true, locale: cs })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {client.prCount > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                            <Trophy className="w-3 h-3" />
                            {client.prCount} PR
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {client.entriesCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Hero Stats */}
              <ProgressHeroCard
                totalPRs={progressStats?.totalPRs || 0}
                prsThisMonth={progressStats?.prsThisMonth || 0}
                trainingsCount={progressStats?.trainingsCount90d || 0}
                activeMonths={progressStats?.activeMonths || 0}
                volumeTrend={progressStats?.volumeTrend || 0}
                isLoading={statsLoading}
              />

              {/* Section: Exercise Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Pokrok v cvicích</h4>
                  <span className="text-xs text-muted-foreground">
                    Top {progressStats?.topExercises.length || 0} cviků podle aktivity
                  </span>
                </div>
                <ProgressSparklineGrid
                  exercises={progressStats?.topExercises || []}
                  isLoading={statsLoading}
                  onExerciseClick={handleExerciseClick}
                />
              </div>

              {/* Section: PR History */}
              <PRHistoryTimeline
                prs={progressStats?.recentPRs || []}
                isLoading={statsLoading}
                maxItems={8}
              />
            </>
          )}
        </TabsContent>

        {/* Multi-Client Comparison View */}
        <TabsContent value="compare" className="mt-6">
          <MultiClientComparison />
        </TabsContent>

        {/* Cohort Benchmark View */}
        <TabsContent value="benchmark" className="mt-6">
          <CohortBenchmarkView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
