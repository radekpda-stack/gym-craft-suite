import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  BarChart3
} from 'lucide-react';
import { 
  PeriodToggle, 
  ComparisonModeToggle 
} from '@/components/analytics';
import { FinanceAnalyticsMainCard } from '@/components/analytics/FinanceAnalyticsMainCard';
import { FinanceAnalyticsDetailView } from '@/components/analytics/FinanceAnalyticsDetailView';
import { FinanceComparisonView } from '@/components/analytics/FinanceComparisonView';
import { 
  useFinanceAnalytics, 
  useFinanceSavedViews,
  FinancePeriodType,
  FinanceComparisonMode
} from '@/hooks/useFinanceAnalytics';
import { useClients } from '@/hooks/useClients';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function FinanceAnalytics() {
  usePageTracking('finance_analytics');
  const navigate = useNavigate();
  const [periodType, setPeriodType] = useState<FinancePeriodType>('month');
  const [comparisonMode, setComparisonMode] = useState<FinanceComparisonMode>('clients');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const { data: clients } = useClients();
  const { views, saveView, deleteView, isLoading: viewsLoading } = useFinanceSavedViews();
  
  const { data, isLoading, error } = useFinanceAnalytics({
    periodType,
    selectedClientIds,
    comparisonMode,
  });

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast({ title: 'Zadejte název pohledu', variant: 'destructive' });
      return;
    }

    try {
      await saveView(viewName, {
        periodType,
        comparisonMode,
        selectedClientIds,
      });
      toast({ title: 'Pohled uložen' });
      setSaveDialogOpen(false);
      setViewName('');
    } catch (e) {
      toast({ title: 'Chyba při ukládání', variant: 'destructive' });
    }
  };

  const handleLoadView = (view: any) => {
    const filters = view.filters as any;
    if (filters.periodType) setPeriodType(filters.periodType);
    if (filters.comparisonMode) setComparisonMode(filters.comparisonMode);
    if (filters.selectedClientIds) setSelectedClientIds(filters.selectedClientIds);
    toast({ title: `Načten pohled: ${view.name}` });
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const activeClients = clients?.filter(c => !c.is_archived) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Analytika financí</h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Uložit pohled
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Saved Views */}
          {views && views.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Uložené pohledy:</span>
              {views.map((view) => (
                <Button
                  key={view.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadView(view)}
                  className="text-xs"
                >
                  {view.name}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {/* Period Toggle */}
            <PeriodToggle 
              value={periodType}
              onChange={(v) => setPeriodType(v as FinancePeriodType)}
            />

            {/* Comparison Mode */}
            <ComparisonModeToggle
              value={comparisonMode}
              onChange={(v) => setComparisonMode(v as FinanceComparisonMode)}
            />
          </div>

          {/* Client Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-2">Klienti:</span>
            {activeClients.slice(0, 10).map(client => (
              <Button
                key={client.id}
                variant={selectedClientIds.includes(client.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleClientSelect(client.id)}
                className="text-xs"
              >
                {client.name}
              </Button>
            ))}
            {selectedClientIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClientIds([])}
                className="text-xs text-muted-foreground"
              >
                Zrušit výběr
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[400px] rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-[200px] rounded-xl" />
              <Skeleton className="h-[200px] rounded-xl" />
            </div>
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6 text-center text-destructive">
              Chyba při načítání dat
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-6">
            {/* Main View or Comparison */}
            {comparisonMode === 'clients' && selectedClientIds.length <= 1 && !showDetail ? (
              <FinanceAnalyticsMainCard 
                data={data} 
                onShowDetail={() => setShowDetail(true)}
              />
            ) : comparisonMode !== 'clients' || selectedClientIds.length > 1 ? (
              <FinanceComparisonView 
                data={data}
                mode={comparisonMode}
              />
            ) : (
              <FinanceAnalyticsDetailView data={data} />
            )}

            {/* Back to overview button when in detail */}
            {showDetail && comparisonMode === 'clients' && selectedClientIds.length <= 1 && (
              <Button 
                variant="outline" 
                onClick={() => setShowDetail(false)}
                className="w-full"
              >
                Zpět na přehled
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uložit analytický pohled</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Název pohledu (např. 'Top klienti - rok')"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveView}>
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
