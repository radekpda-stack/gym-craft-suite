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
      // Get all non-archived clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, credit_balance, payment_mode')
        .eq('is_archived', false);
      
      // Get clients in shared budgets to exclude from individual count
      const { data: budgetMembers } = await supabase
        .from('client_budget_members')
        .select('client_id');
      
      const sharedBudgetClientIds = new Set((budgetMembers || []).map(m => m.client_id));
      
      const stats: CreditStats = { ok: 0, low: 0, none: 0, cashOnly: 0 };
      
      (clients || []).forEach((c: any) => {
        // Skip clients in shared budgets - they're handled by the group
        if (sharedBudgetClientIds.has(c.id)) return;
        
        const paymentMode = c.payment_mode || 'credit';
        
        // cash_only clients are counted separately and don't appear in alerts
        if (paymentMode === 'cash_only') {
          stats.cashOnly++;
          return;
        }
        
        const balance = c.credit_balance || 0;
        
        // For 'mixed' mode, only count as problem if balance is negative (unpaid services)
        if (paymentMode === 'mixed') {
          if (balance < 0) {
            stats.none++;
          } else {
            stats.ok++;
          }
          return;
        }
        
        // Standard 'credit' mode
        if (balance <= 0) {
          stats.none++;
        } else if (balance < lowCreditThreshold) {
          stats.low++;
        } else {
          stats.ok++;
        }
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
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      tooltip: 'Klienti s dostatečným kreditem',
    },
    {
      id: 'low',
      icon: AlertTriangle,
      label: 'Nízký kredit',
      value: data?.low || 0,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
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
