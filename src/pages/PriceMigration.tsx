import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  RefreshCw, 
  Lock, 
  Unlock,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useClientsForMigration, useBulkMigrateCredits, useMigrationStats } from '@/hooks/usePriceMigration';
import { cn } from '@/lib/utils';

export default function PriceMigration() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading, refetch } = useClientsForMigration();
  const bulkMigrate = useBulkMigrateCredits();
  const { needsMigration, totalCreditToMigrate, totalClientsToMigrate } = useMigrationStats();
  
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [fixOldPrice, setFixOldPrice] = useState<Set<string>>(new Set());

  const clientsToMigrate = clients.filter(c => !c.has_lots);
  const alreadyMigrated = clients.filter(c => c.has_lots);

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const toggleFixOldPrice = (clientId: string) => {
    setFixOldPrice(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedClients(new Set(clientsToMigrate.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedClients(new Set());
  };

  const handleMigrate = async () => {
    const migrations = Array.from(selectedClients).map(clientId => ({
      clientId,
      useOldPriceList: fixOldPrice.has(clientId),
    }));

    await bulkMigrate.mutateAsync(migrations);
    setSelectedClients(new Set());
    setFixOldPrice(new Set());
    refetch();
  };

  const selectedTotal = clientsToMigrate
    .filter(c => selectedClients.has(c.id))
    .reduce((sum, c) => sum + c.credit_balance, 0);

  const fixedCount = Array.from(selectedClients).filter(id => fixOldPrice.has(id)).length;

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Přechod ceníku 1.2.2026</h1>
          <p className="text-muted-foreground">
            Migrace stávajícího kreditu do systému šarží
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Co to znamená?</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            Od 1.2.2026 platí nové ceny tréninků (900/1100/1300 Kč místo 800/1000/1200 Kč).
          </p>
          <p>
            <strong>Fixace staré ceny</strong> znamená, že stávající předplacený kredit klienta 
            se bude čerpat za staré ceny, dokud se nevyčerpá. Nové dobíjení bude vždy za nové ceny.
          </p>
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalClientsToMigrate}</div>
                <div className="text-sm text-muted-foreground">K migraci</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalCreditToMigrate)}</div>
                <div className="text-sm text-muted-foreground">Celkem kredit</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{alreadyMigrated.length}</div>
                <div className="text-sm text-muted-foreground">Již migrováno</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients to migrate */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Klienti k migraci</CardTitle>
              <CardDescription>
                Vyberte klienty a určete, zda mají fixovanou starou cenu
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Obnovit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Načítání...
            </div>
          ) : clientsToMigrate.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-lg font-medium">Všichni klienti jsou migrováni!</p>
              <p className="text-muted-foreground">Žádný kredit k migraci.</p>
            </div>
          ) : (
            <>
              {/* Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Vybrat vše
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Zrušit výběr
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Vybráno: {selectedClients.size} ({formatCurrency(selectedTotal)})
                </div>
              </div>

              {/* Client list */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {clientsToMigrate.map(client => (
                    <div 
                      key={client.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedClients.has(client.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{client.name}</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(client.credit_balance)}
                          </div>
                        </div>
                        
                        {selectedClients.has(client.id) && (
                          <Button
                            variant={fixOldPrice.has(client.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleFixOldPrice(client.id)}
                            className="gap-1.5"
                          >
                            {fixOldPrice.has(client.id) ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Fixováno
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Nové ceny
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Migration summary */}
              {selectedClients.size > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Fixace staré ceny:</span>
                    <Badge variant={fixedCount > 0 ? "default" : "secondary"}>
                      {fixedCount} klientů
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Nové ceny:</span>
                    <Badge variant="secondary">
                      {selectedClients.size - fixedCount} klientů
                    </Badge>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleMigrate}
                    disabled={bulkMigrate.isPending}
                  >
                    {bulkMigrate.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Migruji...
                      </>
                    ) : (
                      <>
                        Spustit migraci ({selectedClients.size} klientů)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Already migrated */}
      {alreadyMigrated.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Již migrováno ({alreadyMigrated.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alreadyMigrated.map(client => (
                <Badge key={client.id} variant="secondary">
                  {client.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
