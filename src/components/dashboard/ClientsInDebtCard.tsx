import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  ChevronRight, 
  Wallet,
  CheckCircle2,
  Banknote,
  CreditCard,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateTransaction } from '@/hooks/useCreditTransactions';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientDebt {
  id: string;
  name: string;
  debt: number;
  unpaidCount: number;
  hasNegativeCredit: boolean;
}

const paymentMethods = [
  { value: 'bank', label: 'Převod', icon: Building2 },
  { value: 'cash', label: 'Hotovost', icon: Banknote },
  { value: 'card', label: 'Karta', icon: CreditCard },
] as const;

type PaymentMethodType = 'cash' | 'bank' | 'card';

export function ClientsInDebtCard() {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();
  
  // Fetch clients with debt using ledger-calculated balance (sum of transactions)
  const { data: clientsInDebt = [], isLoading } = useQuery({
    queryKey: ['clients-in-debt'],
    queryFn: async (): Promise<ClientDebt[]> => {
      // Get all non-archived clients with their budget group info and calculate real balance from transactions
      const [clientsResult, unpaidResult, transactionsResult] = await Promise.all([
        supabase
          .from('clients')
          .select(`
            id,
            name,
            client_budget_members (
              group_id,
              client_budget_groups (
                id,
                shared_balance
              )
            )
          `)
          .eq('is_archived', false),
        supabase
          .from('training_sessions')
          .select('id, client_id, final_price')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),
        // Get all credit transactions to calculate real balance
        supabase
          .from('credit_transactions')
          .select('client_id, amount, group_id'),
      ]);

      if (clientsResult.error) throw clientsResult.error;

      // Calculate real balance from transactions (ledger-based)
      const clientBalanceMap = new Map<string, number>();
      const groupBalanceMap = new Map<string, number>();
      
      (transactionsResult.data || []).forEach(t => {
        if (t.group_id) {
          // Group transaction - add to group balance
          groupBalanceMap.set(t.group_id, (groupBalanceMap.get(t.group_id) || 0) + (t.amount || 0));
        } else {
          // Individual transaction
          clientBalanceMap.set(t.client_id, (clientBalanceMap.get(t.client_id) || 0) + (t.amount || 0));
        }
      });

      // Build map of unpaid amounts per client
      const unpaidByClient = new Map<string, { count: number; amount: number }>();
      (unpaidResult.data || []).forEach(t => {
        const current = unpaidByClient.get(t.client_id) || { count: 0, amount: 0 };
        unpaidByClient.set(t.client_id, {
          count: current.count + 1,
          amount: current.amount + (t.final_price || 0),
        });
      });

      // Filter to clients with effective negative balance OR unpaid sessions
      return (clientsResult.data || [])
        .map(c => {
          // Check if client is in a budget group
          const budgetMember = c.client_budget_members?.[0];
          const groupId = budgetMember?.client_budget_groups?.id;
          
          // Use ledger-calculated balance (sum of transactions)
          // For group members, use group balance; otherwise individual balance
          const effectiveBalance = groupId
            ? (groupBalanceMap.get(groupId) || 0)
            : (clientBalanceMap.get(c.id) || 0);
          
          const unpaidInfo = unpaidByClient.get(c.id) || { count: 0, amount: 0 };
          const hasNegativeCredit = effectiveBalance < 0;
          
          // Total debt = negative credit (if any) + unpaid sessions amount
          const creditDebt = hasNegativeCredit ? Math.abs(effectiveBalance) : 0;
          const totalDebt = creditDebt + unpaidInfo.amount;
          
          return {
            id: c.id,
            name: c.name,
            debt: totalDebt,
            unpaidCount: unpaidInfo.count,
            hasNegativeCredit,
          };
        })
        .filter(c => c.debt > 0)
        .sort((a, b) => b.debt - a.debt);
    },
    staleTime: 60000,
  });
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalDebt = clientsInDebt.reduce((sum, c) => sum + c.debt, 0);

  const handleOpenPayment = (client: ClientDebt) => {
    setSelectedClient(client);
    setAmount(client.debt.toString());
    setPaymentMethod('bank');
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedClient || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Zadejte platnou částku', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      await createTransaction.mutateAsync({
        client_id: selectedClient.id,
        amount: amountNum,
        type: 'payment',
        payment_method: paymentMethod,
        description: 'Úhrada dluhu',
      });

      toast({ 
        title: 'Platba zaznamenána',
        description: `${formatCurrency(amountNum)} připsáno klientovi ${selectedClient.name}`,
      });
      setPaymentDialogOpen(false);
      setSelectedClient(null);
      setAmount('');
    } catch (error) {
      toast({ title: 'Chyba při ukládání', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientsInDebt.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            Klienti s dluhem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success" />
            <p className="text-sm font-medium text-foreground">Žádné dluhy!</p>
            <p className="text-xs text-muted-foreground mt-1">Všichni klienti mají kredit v pořádku</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Klienti s dluhem
            <Badge variant="destructive" className="ml-auto">
              {formatCurrency(totalDebt)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clientsInDebt.slice(0, 5).map((client) => (
            <div
              key={client.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="font-medium text-foreground truncate">{client.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-destructive font-semibold">
                    -{formatCurrency(client.debt)}
                  </p>
                  {client.unpaidCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                      {client.unpaidCount}× nezaplaceno
                    </Badge>
                  )}
                </div>
              </button>
              
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPayment(client);
                }}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Zaplatit</span>
              </Button>
              
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}

          {clientsInDebt.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/clients?filter=debt')}
            >
              Zobrazit všech {clientsInDebt.length} klientů
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Zaznamenat platbu
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="font-medium">{selectedClient.name}</p>
                <p className="text-sm text-destructive">
                  Aktuální dluh: -{formatCurrency(selectedClient.debt)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Částka</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Způsob platby</Label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                          paymentMethod === method.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <Icon className={cn(
                          'w-5 h-5',
                          paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className={cn(
                          'text-xs font-medium',
                          paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing || !amount}>
              {isProcessing ? 'Ukládám...' : 'Zaznamenat platbu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
