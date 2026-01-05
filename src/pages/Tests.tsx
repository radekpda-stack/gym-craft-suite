import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, AlertCircle, Clock, CheckCircle2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { useTestDefinitions } from '@/hooks/useTestDefinitions';
import { useTestSessions } from '@/hooks/useTestSessions';
import { useTestStats } from '@/hooks/useTestStats';
import { TestCard } from '@/components/tests/TestCard';
import { TestHistoryTable } from '@/components/tests/TestHistoryTable';
import { NewTestDialog } from '@/components/tests/NewTestDialog';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import type { TestDefinition, TestDueStatus } from '@/types/tests';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  cardio: 'Kardio',
  strength: 'Síla',
  endurance: 'Vytrvalost',
  grip_core: 'Úchop & Core',
  mobility: 'Mobilita',
};

const categoryOrder = ['cardio', 'strength', 'endurance', 'grip_core', 'mobility'];

export default function Tests() {
  usePageTracking('tests');
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newTestOpen, setNewTestOpen] = useState(false);
  const [filterDue, setFilterDue] = useState<TestDueStatus | 'all'>('all');

  const { data: definitions, isLoading: loadingDefs } = useTestDefinitions();
  const { data: sessions, isLoading: loadingSessions } = useTestSessions(selectedClientId || undefined);

  // Group definitions by category
  const groupedDefinitions = useMemo(() => {
    if (!definitions) return {};
    const grouped: Record<string, TestDefinition[]> = {};
    for (const def of definitions) {
      if (!grouped[def.category]) grouped[def.category] = [];
      grouped[def.category].push(def);
    }
    return grouped;
  }, [definitions]);

  // Calculate stats for each test
  const testStatsMap = useMemo(() => {
    if (!definitions || !sessions || !selectedClientId) return {};
    const map: Record<string, { dueStatus: TestDueStatus; lastDate: string | null; totalSessions: number }> = {};
    
    for (const def of definitions) {
      const testSessions = sessions.filter(s => s.test_definition_id === def.id);
      const validComparable = testSessions.filter(s => s.is_valid && s.is_comparable);
      
      let dueStatus: TestDueStatus = 'ok';
      let lastDate: string | null = null;
      
      if (validComparable.length === 0) {
        dueStatus = 'due';
      } else {
        lastDate = validComparable[0].date_time;
        const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= def.recommended_frequency_days) {
          dueStatus = 'due';
        } else if (daysSince >= def.recommended_frequency_days * 0.8) {
          dueStatus = 'soon';
        }
      }
      
      map[def.id] = { dueStatus, lastDate, totalSessions: testSessions.length };
    }
    
    return map;
  }, [definitions, sessions, selectedClientId]);

  // Filter definitions by due status
  const filteredDefinitions = useMemo(() => {
    if (filterDue === 'all') return groupedDefinitions;
    const filtered: Record<string, TestDefinition[]> = {};
    for (const [cat, defs] of Object.entries(groupedDefinitions)) {
      const filteredDefs = defs.filter(d => testStatsMap[d.id]?.dueStatus === filterDue);
      if (filteredDefs.length > 0) filtered[cat] = filteredDefs;
    }
    return filtered;
  }, [groupedDefinitions, filterDue, testStatsMap]);

  // KPI counts
  const kpi = useMemo(() => {
    const values = Object.values(testStatsMap);
    return {
      due: values.filter(v => v.dueStatus === 'due').length,
      soon: values.filter(v => v.dueStatus === 'soon').length,
      total: sessions?.length || 0,
    };
  }, [testStatsMap, sessions]);

  const isLoading = loadingDefs || loadingSessions;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Testy</h1>
            <p className="text-sm text-muted-foreground">Testovací tréninky a měření</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ClientPicker
            value={selectedClientId}
            onChange={setSelectedClientId}
            placeholder="Vyberte klienta"
            className="w-full sm:w-64"
          />
          <Button onClick={() => setNewTestOpen(true)} disabled={!selectedClientId}>
            <Plus className="w-4 h-4 mr-2" />
            Nový test
          </Button>
        </div>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Vyberte klienta pro zobrazení testů</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-3 gap-4">
            <Card className={cn(kpi.due > 0 && 'border-destructive/50')}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className={cn('w-5 h-5', kpi.due > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-2xl font-bold">{kpi.due}</p>
                    <p className="text-xs text-muted-foreground">Splatné</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={cn(kpi.soon > 0 && 'border-yellow-500/50')}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Clock className={cn('w-5 h-5', kpi.soon > 0 ? 'text-yellow-500' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-2xl font-bold">{kpi.soon}</p>
                    <p className="text-xs text-muted-foreground">Brzy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{kpi.total}</p>
                    <p className="text-xs text-muted-foreground">Celkem záznamů</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="catalog" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="catalog">Katalog</TabsTrigger>
                <TabsTrigger value="history">Historie</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {(['all', 'due', 'soon', 'ok'] as const).map(status => (
                    <Badge
                      key={status}
                      variant={filterDue === status ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFilterDue(status)}
                    >
                      {status === 'all' ? 'Vše' : status === 'due' ? 'Splatné' : status === 'soon' ? 'Brzy' : 'OK'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <TabsContent value="catalog" className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(j => (
                          <Skeleton key={j} className="h-32" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                categoryOrder.map(category => {
                  const defs = filteredDefinitions[category];
                  if (!defs || defs.length === 0) return null;

                  return (
                    <div key={category} className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {categoryLabels[category] || category}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {defs.map(def => (
                          <TestCard
                            key={def.id}
                            definition={def}
                            stats={testStatsMap[def.id]}
                            onClick={() => navigate(`/tests/${def.id}?client=${selectedClientId}`)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="history">
              <TestHistoryTable
                sessions={sessions || []}
                isLoading={isLoading}
                onRowClick={(session) => navigate(`/tests/${session.test_definition_id}?client=${selectedClientId}`)}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* New Test Dialog */}
      <NewTestDialog
        open={newTestOpen}
        onOpenChange={setNewTestOpen}
        clientId={selectedClientId}
        definitions={definitions || []}
      />
    </div>
  );
}
