import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ChevronLeft, 
  Users,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { 
  useClientAnalytics, 
  useClientSavedViews,
  type ClientAnalyticsFilters,
  type PeriodType,
  type ComparisonMode
} from '@/hooks/useClientAnalytics';
import { 
  PeriodToggle, 
  ComparisonModeToggle, 
  SavedViewsSelector,
  TrendAreaChart,
  DistributionDonutChart
} from '@/components/analytics';
import { ClientAnalyticsMainCard } from '@/components/analytics/ClientAnalyticsMainCard';
import { ClientAnalyticsDetailView } from '@/components/analytics/ClientAnalyticsDetailView';
import { ClientActivityComparisonView } from '@/components/analytics/ClientActivityComparisonView';
import { usePageTracking } from '@/hooks/useFeatureTracking';

const PERIOD_LABELS: Record<PeriodType, string> = {
  month: 'Tento měsíc',
  year: 'Tento rok',
  '30days': '30 dní',
  '90days': '90 dní',
  custom: 'Vlastní',
};

export default function ClientAnalytics() {
  usePageTracking('client_analytics');
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { views, saveView, deleteView, isLoading: viewsLoading } = useClientSavedViews();

  const [filters, setFilters] = useState<ClientAnalyticsFilters>({
    periodType: '30days',
    clientIds: [],
    comparisonMode: undefined,
  });

  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading, error } = useClientAnalytics(filters);

  const activeClients = useMemo(() => 
    clients.filter(c => !c.is_archived).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [clients]
  );

  const updateFilter = <K extends keyof ClientAnalyticsFilters>(key: K, value: ClientAnalyticsFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedView(null);
  };

  const toggleClient = (clientId: string) => {
    setFilters(prev => {
      const current = prev.clientIds || [];
      const updated = current.includes(clientId)
        ? current.filter(id => id !== clientId)
        : [...current, clientId];
      return { ...prev, clientIds: updated };
    });
    setSelectedView(null);
  };

  const loadView = (view: any) => {
    setFilters(view.filters as ClientAnalyticsFilters);
    setSelectedView(view.id);
  };

  const handleSaveView = async (name: string) => {
    await saveView.mutateAsync({ name, filters });
  };

  const handleDeleteView = async (id: string) => {
    await deleteView.mutateAsync(id);
    if (selectedView === id) setSelectedView(null);
  };

  const selectedClientNames = useMemo(() => {
    if (!filters.clientIds?.length) return 'Všichni klienti';
    if (filters.clientIds.length === 1) {
      return activeClients.find(c => c.id === filters.clientIds![0])?.name || 'Klient';
    }
    return `${filters.clientIds.length} klientů`;
  }, [filters.clientIds, activeClients]);

  const filterSummary = useMemo(() => {
    const items = [];
    items.push(`Období: ${PERIOD_LABELS[filters.periodType]}`);
    items.push(`Klienti: ${selectedClientNames}`);
    if (filters.comparisonMode) {
      const modeLabels: Record<string, string> = {
        clients: 'Klienti mezi sebou',
        average: 'Klient vs. průměr',
        history: 'Klient vs. historie',
      };
      items.push(`Srovnání: ${modeLabels[filters.comparisonMode]}`);
    }
    return items;
  }, [filters, selectedClientNames]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/clients')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Analytika klientů
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Aktivita, retence a dlouhodobé trendy
            </p>
          </div>
        </div>

        <SavedViewsSelector
          views={views.map(v => ({
            id: v.id,
            name: v.name,
            filters: v.filters as any,
            isDefault: v.is_default || false,
            createdAt: v.created_at,
          }))}
          selectedViewId={selectedView}
          currentFilters={filters}
          filterSummary={filterSummary}
          onSelectView={loadView}
          onSaveView={handleSaveView}
          onDeleteView={handleDeleteView}
          isLoading={viewsLoading}
        />
      </div>

      {/* Filters Bar */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <PeriodToggle 
              value={filters.periodType} 
              onChange={(v) => updateFilter('periodType', v)} 
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-40">
                  <Users className="w-4 h-4 mr-2" />
                  {selectedClientNames}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-80 overflow-auto">
                <DropdownMenuItem 
                  onClick={() => updateFilter('clientIds', [])}
                  className={cn(!filters.clientIds?.length && 'bg-primary/10')}
                >
                  Všichni klienti
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {activeClients.map(client => (
                  <DropdownMenuItem
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={cn(
                      'flex items-center gap-2',
                      filters.clientIds?.includes(client.id) && 'bg-primary/10'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center',
                      filters.clientIds?.includes(client.id) 
                        ? 'bg-primary border-primary' 
                        : 'border-muted-foreground'
                    )}>
                      {filters.clientIds?.includes(client.id) && (
                        <span className="text-primary-foreground text-xs">✓</span>
                      )}
                    </div>
                    {client.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-auto">
              <ComparisonModeToggle
                value={filters.comparisonMode}
                onChange={(v) => updateFilter('comparisonMode', v)}
                labels={{ clients: 'Klienti' }}
              />
            </div>
          </div>

          {filters.clientIds && filters.clientIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/50">
              {filters.clientIds.map(id => {
                const client = activeClients.find(c => c.id === id);
                return (
                  <Badge key={id} variant="secondary" className="pr-1">
                    {client?.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-destructive/20"
                      onClick={() => toggleClient(id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => updateFilter('clientIds', [])}
              >
                Zrušit vše
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nepodařilo se načíst data</p>
        </Card>
      ) : !data ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Žádná data k zobrazení</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {!filters.comparisonMode && (
            <>
              <ClientAnalyticsMainCard 
                data={data} 
                onShowDetail={() => setShowDetail(true)} 
              />
              {showDetail && (
                <ClientAnalyticsDetailView 
                  data={data} 
                  onClose={() => setShowDetail(false)} 
                />
              )}
            </>
          )}

          {filters.comparisonMode === 'clients' && data?.clientComparisons && (
            <ClientActivityComparisonView data={data.clientComparisons} mode="clients" />
          )}

          {filters.comparisonMode === 'average' && data?.averageComparison && (
            <ClientActivityComparisonView 
              data={[data.averageComparison.clientData]} 
              mode="average"
              averageData={data.averageComparison}
            />
          )}

          {filters.comparisonMode === 'history' && data?.historyComparison && (
            <ClientActivityComparisonView 
              data={[data.historyComparison.currentPeriod, data.historyComparison.previousPeriod]} 
              mode="history"
              historyData={data.historyComparison}
            />
          )}

          {filters.comparisonMode === 'clients' && (!filters.clientIds || filters.clientIds.length < 2) && (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Vyberte alespoň 2 klienty pro porovnání</p>
            </Card>
          )}

          {(filters.comparisonMode === 'average' || filters.comparisonMode === 'history') && 
           (!filters.clientIds || filters.clientIds.length !== 1) && (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Vyberte právě 1 klienta pro srovnání</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
