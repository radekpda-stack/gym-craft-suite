import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreditStats {
  ok: number;
  low: number;
  none: number;
  cashOnly: number;
}

export function CreditSignalBox() {
  const navigate = useNavigate();
  const { data: settings } = useAppSettings();
  
  // Get thresholds from settings or use defaults
  const lowCreditThreshold = (settings?.low_credit_threshold as number) || 800;
  
  const { data, isLoading } = useQuery({
    queryKey: ['credit-signal-stats', lowCreditThreshold],
    queryFn: async (): Promise<CreditStats> => {
      // Get all data in parallel
      const [clientsResult, budgetMembersResult, budgetGroupsResult, transactionsResult] = await Promise.all([
        supabase.from('clients').select('id, payment_mode').eq('is_archived', false),
        supabase.from('client_budget_members').select('client_id, group_id'),
        supabase.from('client_budget_groups').select('id, shared_balance'),
        supabase.from('credit_transactions').select('client_id, group_id, amount'),
      ]);
      
      const clients = clientsResult.data || [];
      const budgetMembers = budgetMembersResult.data || [];
      const budgetGroups = budgetGroupsResult.data || [];
      const transactions = transactionsResult.data || [];
      
      // Build maps for efficient lookups
      const clientGroupMap = new Map<string, string>();
      budgetMembers.forEach((m: any) => clientGroupMap.set(m.client_id, m.group_id));
      
      const groupBalanceMap = new Map<string, number>();
      budgetGroups.forEach((g: any) => groupBalanceMap.set(g.id, g.shared_balance || 0));
      
      // Calculate ledger balance per individual client (not in groups)
      const clientLedgerBalance = new Map<string, number>();
      transactions.forEach((t: any) => {
        if (!t.group_id && t.client_id) {
          clientLedgerBalance.set(t.client_id, (clientLedgerBalance.get(t.client_id) || 0) + (t.amount || 0));
        }
      });
      
      // Track which groups we've already counted
      const countedGroups = new Set<string>();
      
      const stats: CreditStats = { ok: 0, low: 0, none: 0, cashOnly: 0 };
      
      clients.forEach((c: any) => {
        const paymentMode = c.payment_mode || 'credit';
        
        // cash_only clients are counted separately
        if (paymentMode === 'cash_only') {
          stats.cashOnly++;
          return;
        }
        
        const groupId = clientGroupMap.get(c.id);
        
        // If in a group, count the group balance only once
        if (groupId) {
          if (countedGroups.has(groupId)) return;
          countedGroups.add(groupId);
          const balance = groupBalanceMap.get(groupId) || 0;
          
          if (balance <= 0) stats.none++;
          else if (balance < lowCreditThreshold) stats.low++;
          else stats.ok++;
          return;
        }
        
        // Individual client - use ledger balance
        const balance = clientLedgerBalance.get(c.id) || 0;
        
        // For 'mixed' mode, only count as problem if balance is negative
        if (paymentMode === 'mixed') {
          if (balance < 0) stats.none++;
          else stats.ok++;
          return;
        }
        
        // Standard 'credit' mode
        if (balance <= 0) stats.none++;
        else if (balance < lowCreditThreshold) stats.low++;
        else stats.ok++;
      });
      
      return stats;
    },
  });
  
  const items = [
    {
      id: 'ok',
      icon: CheckCircle2,
      label: 'V pořádku',
      value: data?.ok || 0,
      color: 'text-success',
      bg: 'bg-success/10',
      tooltip: 'Klienti s dostatečným kreditem',
    },
    {
      id: 'low',
      icon: AlertTriangle,
      label: 'Nízký kredit',
      value: data?.low || 0,
      color: 'text-warning',
      bg: 'bg-warning/10',
      tooltip: `Kredit pod ${lowCreditThreshold} Kč`,
    },
    {
      id: 'none',
      icon: XCircle,
      label: 'Bez kreditu',
      value: data?.none || 0,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      tooltip: 'Vyčerpaný nebo záporný kredit',
    },
  ];
  
  const hasProblems = (data?.low || 0) > 0 || (data?.none || 0) > 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-primary" />
            Kredity
          </CardTitle>
          {(data?.cashOnly || 0) > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="w-3 h-3" />
                    {data?.cashOnly} hotovost
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Klienti platící pouze hotově (nezobrazují se v alertech)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <>
              <div className="flex gap-2">
                {items.map(item => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(`/clients?filter=${item.id === 'ok' ? '' : 'lowcredit'}`)}
                        className={cn(
                          'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors hover:bg-secondary/50',
                          item.bg
                        )}
                      >
                        <item.icon className={cn('w-5 h-5', item.color)} />
                        <span className={cn('text-xl font-bold', item.color)}>{item.value}</span>
                        <span className="text-xs text-muted-foreground text-center">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              
              {hasProblems && (
                <button
                  onClick={() => navigate('/clients?filter=lowcredit')}
                  className="mt-3 w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">Zobrazit klienty s problémem</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
