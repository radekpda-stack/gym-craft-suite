import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, HelpCircle, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { useTestDefinitions } from '@/hooks/useTestDefinitions';
import { useTestSessions } from '@/hooks/useTestSessions';
import { useTestStats } from '@/hooks/useTestStats';
import { TestHowToDialog } from '@/components/tests/TestHowToDialog';
import { NewTestDialog } from '@/components/tests/NewTestDialog';
import { TestHistoryTable } from '@/components/tests/TestHistoryTable';
import { TestChart } from '@/components/tests/TestChart';
import { cn, formatDuration } from '@/lib/utils';
import type { TestDueStatus } from '@/types/tests';

const dueStatusConfig: Record<TestDueStatus, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  due: { label: 'Splatné', variant: 'destructive' },
  soon: { label: 'Brzy', variant: 'secondary' },
  ok: { label: 'OK', variant: 'default' },
};

export default function TestDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const clientId = searchParams.get('client');
  const [howToOpen, setHowToOpen] = useState(false);
  const [newTestOpen, setNewTestOpen] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  const { data: definitions } = useTestDefinitions();
  const definition = definitions?.find(d => d.id === id);
  
  const { data: allSessions, isLoading } = useTestSessions(clientId || undefined, id);
  const stats = useTestStats(allSessions, definition);

  // Filter sessions for display
  const displaySessions = useMemo(() => {
    if (!allSessions) return [];
    if (showInvalid) return allSessions;
    return allSessions.filter(s => s.is_valid && s.is_comparable);
  }, [allSessions, showInvalid]);

  const handleClientChange = (newClientId: string | null) => {
    if (newClientId) {
      setSearchParams({ client: newClientId });
    } else {
      setSearchParams({});
    }
  };

  // Format primary metric value for display
  const formatMetricValue = (value: number | null | undefined, key: string) => {
    if (value == null) return '-';
    if (key.includes('time') || key === 'time_s') return formatDuration(value);
    if (key.includes('pace')) return formatDuration(value);
    if (key.includes('pct') || key.includes('drift')) return `${value.toFixed(1)}%`;
    if (key.includes('deg') || key.includes('cm')) return value.toFixed(1);
    return value.toFixed(2);
  };

  if (!definition) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate('/tests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět
        </Button>
        <Card className="mt-4">
          <CardContent className="py-12 text-center text-muted-foreground">
            Test nenalezen
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryKey = definition.primary_metric_key;
  const isBetterLower = definition.primary_metric_better === 'lower_is_better';

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{definition.name_cs || definition.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{definition.category}</p>
          </div>
          {stats && (
            <Badge variant={dueStatusConfig[stats.dueStatus].variant}>
              {dueStatusConfig[stats.dueStatus].label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ClientPicker
            value={clientId}
            onChange={handleClientChange}
            placeholder="Vyberte klienta"
            className="w-full sm:w-64"
          />
          <Button variant="outline" onClick={() => setHowToOpen(true)}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Jak provést test
          </Button>
          <Button onClick={() => setNewTestOpen(true)} disabled={!clientId}>
            <Plus className="w-4 h-4 mr-2" />
            Nový test
          </Button>
        </div>
      </div>

      {!clientId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Vyberte klienta pro zobrazení výsledků
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Poslední výsledek</p>
                <p className="text-2xl font-bold">
                  {stats?.lastResult ? formatMetricValue(
                    stats.lastResult.metrics_json[primaryKey] as number,
                    primaryKey
                  ) : '-'}
                </p>
                {stats?.daysSinceLastTest != null && (
                  <p className="text-xs text-muted-foreground">před {stats.daysSinceLastTest} dny</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">PR (Osobní rekord)</p>
                <p className="text-2xl font-bold text-primary">
                  {stats?.pr ? formatMetricValue(stats.pr.value, primaryKey) : '-'}
                </p>
                {stats?.pr && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(stats.pr.date).toLocaleDateString('cs-CZ')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Trend vs minule</p>
                {stats?.trendVsLast ? (
                  <div className="flex items-center gap-2">
                    {stats.trendVsLast.percentChange === 0 ? (
                      <Minus className="w-5 h-5 text-muted-foreground" />
                    ) : (isBetterLower ? stats.trendVsLast.absoluteChange < 0 : stats.trendVsLast.absoluteChange > 0) ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-lg font-semibold">
                      {stats.trendVsLast.percentChange > 0 ? '+' : ''}{stats.trendVsLast.percentChange.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold">-</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Celkem záznamů</p>
                <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.validComparableSessions || 0} validních
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interpretation */}
          {stats?.trendVsLast && (
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Změna vs minule:</strong>{' '}
                      {stats.trendVsLast.absoluteChange > 0 ? '+' : ''}{formatMetricValue(stats.trendVsLast.absoluteChange, primaryKey)}{' '}
                      ({stats.trendVsLast.percentChange > 0 ? '+' : ''}{stats.trendVsLast.percentChange.toFixed(1)}%)
                    </p>
                    {stats.trendVsPr && (
                      <p>
                        <strong>Odstup od PR:</strong>{' '}
                        {stats.trendVsPr.absoluteChange > 0 ? '+' : ''}{formatMetricValue(stats.trendVsPr.absoluteChange, primaryKey)}{' '}
                        ({stats.trendVsPr.percentChange > 0 ? '+' : ''}{stats.trendVsPr.percentChange.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="overview">Přehled</TabsTrigger>
                <TabsTrigger value="history">Historie</TabsTrigger>
                <TabsTrigger value="chart">Graf</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Switch
                  id="show-invalid"
                  checked={showInvalid}
                  onCheckedChange={setShowInvalid}
                />
                <Label htmlFor="show-invalid" className="text-sm text-muted-foreground">
                  Zobrazit nevalidní
                </Label>
              </div>
            </div>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">O testu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {definition.protocol_text && (
                    <div>
                      <h4 className="font-medium mb-1">Protokol</h4>
                      <p className="text-sm text-muted-foreground">{definition.protocol_text}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Doporučená frekvence:</span>{' '}
                      <strong>{definition.recommended_frequency_days} dní</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Primární metrika:</span>{' '}
                      <strong>{primaryKey}</strong> ({isBetterLower ? 'nižší = lepší' : 'vyšší = lepší'})
                    </div>
                    {definition.device_family && (
                      <div>
                        <span className="text-muted-foreground">Zařízení:</span>{' '}
                        <strong>{definition.device_family}</strong>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <TestHistoryTable
                sessions={displaySessions}
                isLoading={isLoading}
                showInvalid={showInvalid}
              />
            </TabsContent>

            <TabsContent value="chart">
              <Card>
                <CardContent className="pt-6">
                  <TestChart
                    sessions={displaySessions}
                    primaryMetricKey={primaryKey}
                    isBetterLower={isBetterLower}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <TestHowToDialog
        open={howToOpen}
        onOpenChange={setHowToOpen}
        definition={definition}
      />
      
      <NewTestDialog
        open={newTestOpen}
        onOpenChange={setNewTestOpen}
        clientId={clientId}
        definitions={definitions || []}
        preselectedDefinitionId={id}
      />
    </div>
  );
}
