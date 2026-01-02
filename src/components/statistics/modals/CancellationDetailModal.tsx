import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell
} from 'recharts';
import { 
  XCircle, Clock, CreditCard, User, Calendar, TrendingDown,
  AlertTriangle, CheckCircle2, Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useCancellationStats, CancellationRecord, ClientCancellationSummary } from '@/hooks/useCancellationStats';
import { cn } from '@/lib/utils';

interface CancellationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = 'all' | 'late' | 'withCredit' | 'withoutCredit';

export function CancellationDetailModal({ open, onOpenChange }: CancellationDetailModalProps) {
  const { data: stats, isLoading } = useCancellationStats();
  const [historyFilter, setHistoryFilter] = useState<FilterType>('all');
  const [chartMode, setChartMode] = useState<'timing' | 'credit'>('timing');

  if (!stats) return null;

  const filteredCancellations = stats.cancellations.filter(c => {
    switch (historyFilter) {
      case 'late': return c.isLate;
      case 'withCredit': return c.creditDeducted;
      case 'withoutCredit': return !c.creditDeducted;
      default: return true;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <XCircle className="h-5 w-5 text-destructive" />
            Zrušené tréninky - Detail
          </DialogTitle>
        </DialogHeader>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.totalCanceled}</div>
            <div className="text-xs text-muted-foreground">Celkem zrušeno</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.lateCancellations}</div>
            <div className="text-xs text-muted-foreground">Pozdní zrušení</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{stats.withCreditDeducted}</div>
            <div className="text-xs text-muted-foreground">Se stržením</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.withoutCreditDeducted}</div>
            <div className="text-xs text-muted-foreground">Bez stržení</div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <TrendingDown className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Přehled
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Podle klienta
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Historie
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-auto mt-0 space-y-4">
            {/* Chart Mode Toggle */}
            <div className="flex justify-end gap-2">
              <Button
                variant={chartMode === 'timing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('timing')}
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Včas vs Pozdě
              </Button>
              <Button
                variant={chartMode === 'credit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('credit')}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Kredit
              </Button>
            </div>

            {/* Chart */}
            <div className="h-[300px] w-full">
              {stats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="fill-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {chartMode === 'timing' ? (
                      <>
                        <Bar dataKey="onTime" name="Včas zrušeno" fill="hsl(var(--muted-foreground))" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="late" name="Pozdní zrušení" fill="hsl(25, 95%, 53%)" stackId="a" radius={[4, 4, 0, 0]} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="withoutCredit" name="Bez stržení" fill="hsl(var(--muted-foreground))" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="withCredit" name="Se stržením kreditu" fill="hsl(var(--destructive))" stackId="a" radius={[4, 4, 0, 0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Žádná data k zobrazení
                </div>
              )}
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Míra pozdních zrušení
                </div>
                <div className="text-2xl font-bold">{stats.lateCancellationRate.toFixed(1)}%</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CreditCard className="h-4 w-4 text-destructive" />
                  Celkem strženo
                </div>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalCreditAmount)}</div>
              </div>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {stats.byClient.map((client: ClientCancellationSummary) => (
                  <ClientCancellationRow key={client.clientId} client={client} />
                ))}
                {stats.byClient.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Žádná data k zobrazení
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 overflow-hidden mt-0 flex flex-col">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={historyFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('all')}
              >
                Všechny ({stats.totalCanceled})
              </Button>
              <Button
                variant={historyFilter === 'late' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('late')}
                className={historyFilter === 'late' ? '' : 'border-orange-500/50 text-orange-500 hover:bg-orange-500/10'}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Pozdní ({stats.lateCancellations})
              </Button>
              <Button
                variant={historyFilter === 'withCredit' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('withCredit')}
                className={historyFilter === 'withCredit' ? '' : 'border-destructive/50 text-destructive hover:bg-destructive/10'}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Se stržením ({stats.withCreditDeducted})
              </Button>
              <Button
                variant={historyFilter === 'withoutCredit' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setHistoryFilter('withoutCredit')}
              >
                Bez stržení ({stats.withoutCreditDeducted})
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredCancellations.map((cancellation: CancellationRecord) => (
                  <CancellationHistoryRow key={cancellation.id} cancellation={cancellation} />
                ))}
                {filteredCancellations.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Žádné zrušené tréninky odpovídající filtru
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ClientCancellationRow({ client }: { client: ClientCancellationSummary }) {
  const latePercentage = client.total > 0 ? (client.late / client.total) * 100 : 0;
  const creditPercentage = client.total > 0 ? (client.withCredit / client.total) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{client.clientName}</span>
        </div>
        <div className="text-right">
          <div className="font-bold">{client.total} zrušení</div>
          {client.totalCreditDeducted > 0 && (
            <div className="text-xs text-destructive">
              {formatCurrency(client.totalCreditDeducted)} strženo
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground">Pozdní:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${latePercentage}%` }}
            />
          </div>
          <span className="w-8 text-right">{client.late}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground">Strženo:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-destructive rounded-full transition-all"
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
          <span className="w-8 text-right">{client.withCredit}</span>
        </div>
      </div>
    </div>
  );
}

function CancellationHistoryRow({ cancellation }: { cancellation: CancellationRecord }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{cancellation.clientName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Trénink: {format(parseISO(cancellation.date), 'd. MMMM yyyy', { locale: cs })}</span>
          </div>
          {cancellation.canceledAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <XCircle className="h-3.5 w-3.5" />
              <span>Zrušeno: {format(parseISO(cancellation.canceledAt), 'd. M. yyyy HH:mm', { locale: cs })}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          {cancellation.isLate ? (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
              <Clock className="h-3 w-3 mr-1" />
              Pozdní
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Včas
            </Badge>
          )}
          
          {cancellation.creditDeducted ? (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              <CreditCard className="h-3 w-3 mr-1" />
              {cancellation.creditAmount ? `-${formatCurrency(cancellation.creditAmount)}` : 'Strženo'}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Bez stržení
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
