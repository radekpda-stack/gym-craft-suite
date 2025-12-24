import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  ChevronLeft, 
  Calendar,
  Users,
  TrendingUp,
  Save,
  Folder,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { 
  useExerciseAnalytics, 
  useSavedViews,
  type AnalyticsFilters,
  type PeriodType,
  type ComparisonMode
} from '@/hooks/useExerciseAnalytics';
import { AnalyticsMainCard } from '@/components/analytics/AnalyticsMainCard';
import { AnalyticsDetailView } from '@/components/analytics/AnalyticsDetailView';
import { ClientComparisonView } from '@/components/analytics/ClientComparisonView';
import { AverageComparisonView } from '@/components/analytics/AverageComparisonView';
import { HistoryComparisonView } from '@/components/analytics/HistoryComparisonView';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'month', label: 'Tento měsíc' },
  { value: 'year', label: 'Tento rok' },
  { value: '30days', label: '30 dní' },
  { value: '90days', label: '90 dní' },
];

const COMPARISON_OPTIONS: { value: ComparisonMode; label: string; description: string }[] = [
  { value: 'clients', label: 'Klienti mezi sebou', description: 'Porovnejte 2+ klientů' },
  { value: 'average', label: 'Klient vs. průměr', description: 'Srovnání s vaším průměrem' },
  { value: 'history', label: 'Klient vs. historie', description: 'Porovnání s minulým obdobím' },
];

export default function ExerciseAnalytics() {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { views, saveView, deleteView, isLoading: viewsLoading } = useSavedViews();

  // Filters state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    periodType: '30days',
    clientIds: [],
    comparisonMode: undefined,
  });

  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Fetch analytics data
  const { data, isLoading, error } = useExerciseAnalytics(filters);

  // Active clients for selection
  const activeClients = useMemo(() => 
    clients.filter(c => !c.is_archived).sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [clients]
  );

  // Handle filter changes
  const updateFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedView(null);
  };

  // Handle client selection
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

  // Load saved view
  const loadView = (view: typeof views[0]) => {
    setFilters(view.filters);
    setSelectedView(view.id);
  };

  // Save current view
  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    
    try {
      await saveView.mutateAsync({
        name: newViewName,
        filters,
      });
      toast.success('Pohled uložen');
      setNewViewName('');
      setSaveDialogOpen(false);
    } catch (err) {
      toast.error('Nepodařilo se uložit pohled');
    }
  };

  // Delete saved view
  const handleDeleteView = async (id: string) => {
    try {
      await deleteView.mutateAsync(id);
      if (selectedView === id) setSelectedView(null);
      toast.success('Pohled smazán');
    } catch (err) {
      toast.error('Nepodařilo se smazat pohled');
    }
  };

  const selectedClientNames = useMemo(() => {
    if (!filters.clientIds?.length) return 'Všichni klienti';
    if (filters.clientIds.length === 1) {
      return activeClients.find(c => c.id === filters.clientIds![0])?.name || 'Klient';
    }
    return `${filters.clientIds.length} klientů`;
  }, [filters.clientIds, activeClients]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/exercises')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytika cviků
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dlouhodobé statistiky a srovnání
            </p>
          </div>
        </div>

        {/* Saved Views */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Folder className="w-4 h-4 mr-2" />
                {selectedView ? views.find(v => v.id === selectedView)?.name : 'Uložené pohledy'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {views.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  Žádné uložené pohledy
                </div>
              ) : (
                views.map(view => (
                  <DropdownMenuItem
                    key={view.id}
                    className="flex items-center justify-between"
                  >
                    <span 
                      onClick={() => loadView(view)}
                      className="flex-1 cursor-pointer"
                    >
                      {view.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteView(view.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Save className="w-4 h-4 mr-2" />
                    Uložit aktuální pohled
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Uložit pohled</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Název pohledu</Label>
                      <Input
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        placeholder="např. OCR klienti - 30 dní"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Uloží se:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Období: {PERIOD_OPTIONS.find(p => p.value === filters.periodType)?.label}</li>
                        <li>Klienti: {selectedClientNames}</li>
                        {filters.comparisonMode && (
                          <li>Srovnání: {COMPARISON_OPTIONS.find(c => c.value === filters.comparisonMode)?.label}</li>
                        )}
                      </ul>
                    </div>
                    <Button onClick={handleSaveView} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Uložit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select 
                value={filters.periodType} 
                onValueChange={(v) => updateFilter('periodType', v as PeriodType)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Selector */}
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

            {/* Comparison Mode */}
            <div className="flex items-center gap-2 ml-auto">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <Tabs 
                value={filters.comparisonMode || 'none'} 
                onValueChange={(v) => updateFilter('comparisonMode', v === 'none' ? undefined : v as ComparisonMode)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="none" className="text-xs px-2">Přehled</TabsTrigger>
                  <TabsTrigger value="clients" className="text-xs px-2">Klienti</TabsTrigger>
                  <TabsTrigger value="average" className="text-xs px-2">Průměr</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs px-2">Historie</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Selected clients badges */}
          {filters.clientIds && filters.clientIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/50">
              {filters.clientIds.map(id => {
                const client = activeClients.find(c => c.id === id);
                return (
                  <Badge 
                    key={id} 
                    variant="secondary"
                    className="pr-1"
                  >
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
      ) : !data || !data.volumeTrend ? (
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Žádná data pro vybrané období
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Overview or Comparison Views */}
          {!filters.comparisonMode && (
            <>
              <AnalyticsMainCard 
                data={data} 
                onShowDetail={() => setShowDetail(true)} 
              />
              {showDetail && (
                <AnalyticsDetailView 
                  data={data} 
                  onClose={() => setShowDetail(false)} 
                />
              )}
            </>
          )}

          {filters.comparisonMode === 'clients' && data?.clientComparisons && (
            <ClientComparisonView data={data.clientComparisons} />
          )}

          {filters.comparisonMode === 'average' && data?.averageComparison && (
            <AverageComparisonView data={data.averageComparison} />
          )}

          {filters.comparisonMode === 'history' && data?.historyComparison && (
            <HistoryComparisonView data={data.historyComparison} />
          )}

          {/* Show message if comparison mode selected but not enough clients */}
          {filters.comparisonMode === 'clients' && (!filters.clientIds || filters.clientIds.length < 2) && (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Vyberte alespoň 2 klienty pro porovnání
              </p>
            </Card>
          )}

          {(filters.comparisonMode === 'average' || filters.comparisonMode === 'history') && 
           (!filters.clientIds || filters.clientIds.length !== 1) && (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Vyberte právě 1 klienta pro srovnání
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
