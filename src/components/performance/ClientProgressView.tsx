/**
 * ClientProgressView - Detailed progress view for a single client
 * Shows comprehensive exercise history, PRs, and trends
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ExternalLink, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientProgressStats, useAllClientsProgress } from '@/hooks/useClientProgressStats';
import { ProgressHeroCard } from './ProgressHeroCard';
import { ProgressSparklineGrid } from './ProgressSparklineGrid';
import { PRHistoryTimeline } from './PRHistoryTimeline';
import { MultiClientComparison } from './MultiClientComparison';

interface ClientProgressViewProps {
  initialClientId?: string;
}

export function ClientProgressView({ initialClientId }: ClientProgressViewProps) {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  // Fetch all clients for selector
  const { data: allClients = [], isLoading: clientsLoading } = useAllClientsProgress();

  // Fetch selected client's progress stats
  const { data: progressStats, isLoading: statsLoading } = useClientProgressStats({
    clientId: selectedClientId,
    limit: 9,
  });

  // Filter clients by search
  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle exercise click - navigate to client's exercise detail
  const handleExerciseClick = (exercise: { exerciseName: string; exerciseId: string | null }) => {
    if (selectedClientId) {
      navigate(`/clients/${selectedClientId}?tab=performance&exercise=${encodeURIComponent(exercise.exerciseName)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'single' | 'compare')}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-secondary/30 backdrop-blur-sm">
          <TabsTrigger value="single" className="gap-2">
            <Users className="w-4 h-4" />
            Jednotlivý klient
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <BarChart2 className="w-4 h-4" />
            Porovnání
          </TabsTrigger>
        </TabsList>

        {/* Single Client View */}
        <TabsContent value="single" className="mt-6 space-y-6">
          {/* Client Selector Header */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 shadow-lg shadow-primary/25">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Sledování pokroku klienta</h3>
                <p className="text-[10px] text-muted-foreground">
                  Vyberte klienta pro zobrazení detailní analýzy
                </p>
              </div>
            </div>

            {/* Client Select */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select
                  value={selectedClientId || ''}
                  onValueChange={(value) => setSelectedClientId(value || null)}
                >
                  <SelectTrigger className="w-full bg-background/60">
                    <SelectValue placeholder="Vyberte klienta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b border-border/50">
                      <Input
                        placeholder="Hledat klienta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {clientsLoading ? (
                        <div className="p-4">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Žádní klienti nenalezeni
                        </div>
                      ) : (
                        filteredClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{client.name}</span>
                              <div className="flex items-center gap-2 ml-2 text-muted-foreground">
                                {client.prCount > 0 && (
                                  <span className="text-warning text-xs">{client.prCount} PR</span>
                                )}
                                <span className="text-xs">{client.entriesCount} zázn.</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clients/${selectedClientId}`)}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Karta klienta</span>
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {!selectedClientId ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium mb-2">Vyberte klienta</p>
              <p className="text-sm">
                Pro zobrazení detailní analýzy pokroku vyberte klienta z nabídky výše
              </p>
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
      </Tabs>
    </div>
  );
}
