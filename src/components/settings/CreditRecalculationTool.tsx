import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface RecalculationResult {
  clientId: string;
  clientName: string;
  oldBalance: number;
  calculatedBalance: number;
  difference: number;
  isSharedBudget: boolean;
  groupId?: string;
  groupName?: string;
  fixed: boolean;
}

export function CreditRecalculationTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RecalculationResult[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const queryClient = useQueryClient();

  const runRecalculation = async (fix: boolean = false) => {
    setIsRunning(true);
    setResults([]);
    const newResults: RecalculationResult[] = [];

    try {
      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, credit_balance');

      if (clientsError) throw clientsError;

      // Get all budget groups
      const { data: budgetGroups, error: groupsError } = await supabase
        .from('client_budget_groups')
        .select('id, name, shared_balance');

      if (groupsError) throw groupsError;

      // Get all budget memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('client_budget_members')
        .select('client_id, group_id');

      if (membershipsError) throw membershipsError;

      // Create a map of client to group
      const clientToGroup = new Map<string, string>();
      memberships?.forEach(m => {
        clientToGroup.set(m.client_id, m.group_id);
      });

      // Get all transactions
      const { data: transactions, error: txError } = await supabase
        .from('credit_transactions')
        .select('client_id, group_id, amount, type');

      if (txError) throw txError;

      // Calculate balances from transactions
      // For clients NOT in shared budget: sum transactions without group_id
      // For shared budgets: sum transactions with group_id
      const clientBalances = new Map<string, number>();
      const groupBalances = new Map<string, number>();

      transactions?.forEach(tx => {
        if (tx.group_id) {
          // Transaction for shared budget
          const current = groupBalances.get(tx.group_id) || 0;
          groupBalances.set(tx.group_id, current + (tx.amount || 0));
        } else if (tx.client_id) {
          // Check if client is in a group
          const groupId = clientToGroup.get(tx.client_id);
          if (groupId) {
            // Client is in group but transaction doesn't have group_id
            // This is a legacy transaction - should count towards group
            const current = groupBalances.get(groupId) || 0;
            groupBalances.set(groupId, current + (tx.amount || 0));
          } else {
            // Individual client transaction
            const current = clientBalances.get(tx.client_id) || 0;
            clientBalances.set(tx.client_id, current + (tx.amount || 0));
          }
        }
      });

      // Check individual clients (not in groups)
      for (const client of clients || []) {
        const groupId = clientToGroup.get(client.id);
        if (groupId) continue; // Skip clients in groups, we'll check them via group

        const calculatedBalance = Math.round((clientBalances.get(client.id) || 0) * 100) / 100;
        const oldBalance = Math.round((client.credit_balance || 0) * 100) / 100;
        const difference = Math.round((calculatedBalance - oldBalance) * 100) / 100;

        if (Math.abs(difference) > 0.01) {
          newResults.push({
            clientId: client.id,
            clientName: client.name,
            oldBalance,
            calculatedBalance,
            difference,
            isSharedBudget: false,
            fixed: false,
          });

          if (fix) {
            const { error: updateError } = await supabase
              .from('clients')
              .update({ credit_balance: calculatedBalance })
              .eq('id', client.id);

            if (!updateError) {
              newResults[newResults.length - 1].fixed = true;
            }
          }
        }
      }

      // Check shared budget groups
      for (const group of budgetGroups || []) {
        const calculatedBalance = Math.round((groupBalances.get(group.id) || 0) * 100) / 100;
        const oldBalance = Math.round((group.shared_balance || 0) * 100) / 100;
        const difference = Math.round((calculatedBalance - oldBalance) * 100) / 100;

        // Get group members for display
        const members = memberships?.filter(m => m.group_id === group.id) || [];
        const memberClients = clients?.filter(c => members.some(m => m.client_id === c.id)) || [];

        if (Math.abs(difference) > 0.01) {
          newResults.push({
            clientId: group.id,
            clientName: memberClients.map(c => c.name).join(', ') || 'Prázdná skupina',
            oldBalance,
            calculatedBalance,
            difference,
            isSharedBudget: true,
            groupId: group.id,
            groupName: group.name,
            fixed: false,
          });

          if (fix) {
            const { error: updateError } = await supabase
              .from('client_budget_groups')
              .update({ shared_balance: calculatedBalance })
              .eq('id', group.id);

            if (!updateError) {
              newResults[newResults.length - 1].fixed = true;
            }
          }
        }
      }

      // Check for clients in groups with non-zero personal balance (should be 0)
      for (const client of clients || []) {
        const groupId = clientToGroup.get(client.id);
        if (!groupId) continue;

        const personalBalance = client.credit_balance || 0;
        if (Math.abs(personalBalance) > 0.01) {
          const group = budgetGroups?.find(g => g.id === groupId);
          newResults.push({
            clientId: client.id,
            clientName: `${client.name} (osobní v ${group?.name || 'skupině'})`,
            oldBalance: personalBalance,
            calculatedBalance: 0, // Should be 0 for clients in groups
            difference: -personalBalance,
            isSharedBudget: false,
            groupId,
            groupName: group?.name,
            fixed: false,
          });

          if (fix) {
            // Transfer the balance to the shared budget
            if (personalBalance !== 0) {
              // Create a transfer transaction if balance is non-zero
              const { data: { user } } = await supabase.auth.getUser();
              
              await supabase
                .from('credit_transactions')
                .insert({
                  client_id: client.id,
                  amount: -personalBalance, // Negative of personal balance
                  type: 'transfer',
                  description: `Automatické vyrovnání osobního zůstatku do sdíleného budgetu`,
                  user_id: user?.id,
                  group_id: groupId,
                });

              // Update group balance
              const currentGroupBalance = group?.shared_balance || 0;
              await supabase
                .from('client_budget_groups')
                .update({ shared_balance: currentGroupBalance + personalBalance })
                .eq('id', groupId);

              // Set personal balance to 0
              await supabase
                .from('clients')
                .update({ credit_balance: 0 })
                .eq('id', client.id);

              newResults[newResults.length - 1].fixed = true;
            }
          }
        }
      }

      setResults(newResults);
      setHasRun(true);

      if (fix) {
        // Invalidate all credit-related queries
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
        queryClient.invalidateQueries({ queryKey: ['shared_budget_balance'] });
        queryClient.invalidateQueries({ queryKey: ['budget_groups'] });

        toast({
          title: 'Přepočet dokončen',
          description: `Opraveno ${newResults.filter(r => r.fixed).length} z ${newResults.length} nesrovnalostí`,
        });
      } else {
        toast({
          title: 'Analýza dokončena',
          description: newResults.length > 0 
            ? `Nalezeno ${newResults.length} nesrovnalostí` 
            : 'Všechny zůstatky jsou správné',
        });
      }
    } catch (error) {
      console.error('Error during recalculation:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se provést přepočet',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const discrepancies = results.filter(r => Math.abs(r.difference) > 0.01);
  const hasDiscrepancies = discrepancies.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Přepočet kreditů z ledgeru
        </CardTitle>
        <CardDescription>
          Zkontroluje a opraví nesrovnalosti mezi uloženými zůstatky a součtem transakcí.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => runRecalculation(false)} 
            disabled={isRunning}
            variant="outline"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRunning && "animate-spin")} />
            Analyzovat
          </Button>
          {hasRun && hasDiscrepancies && (
            <Button 
              onClick={() => runRecalculation(true)} 
              disabled={isRunning}
              variant="destructive"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRunning && "animate-spin")} />
              Opravit nesrovnalosti ({discrepancies.length})
            </Button>
          )}
        </div>

        {hasRun && (
          <div className="space-y-3">
            {!hasDiscrepancies ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-success/10 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Všechny zůstatky jsou správné</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Nalezeno {discrepancies.length} nesrovnalostí</span>
                </div>
                
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {discrepancies.map((result, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-xl border text-sm",
                          result.fixed ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {result.isSharedBudget && '🔗 '}
                            {result.clientName}
                          </span>
                          {result.fixed && (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Opraveno
                            </span>
                          )}
                        </div>
                        {result.groupName && (
                          <div className="text-xs text-muted-foreground mb-1">
                            Skupina: {result.groupName}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Uloženo:</span>
                            <br />
                            <span className="font-mono">{result.oldBalance.toLocaleString('cs-CZ')} Kč</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vypočteno:</span>
                            <br />
                            <span className="font-mono">{result.calculatedBalance.toLocaleString('cs-CZ')} Kč</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rozdíl:</span>
                            <br />
                            <span className={cn(
                              "font-mono",
                              result.difference > 0 ? "text-success" : "text-destructive"
                            )}>
                              {result.difference > 0 ? '+' : ''}{result.difference.toLocaleString('cs-CZ')} Kč
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}