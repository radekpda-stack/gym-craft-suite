import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CreditStats {
  ok: number;
  low: number;
  none: number;
}

export function CreditSignalBox() {
  const navigate = useNavigate();
  
  const { data, isLoading } = useQuery({
    queryKey: ['credit-signal-stats'],
    queryFn: async (): Promise<CreditStats> => {
      const { data: clients } = await supabase
        .from('clients')
        .select('credit_balance')
        .eq('is_archived', false);
      
      const stats: CreditStats = { ok: 0, low: 0, none: 0 };
      
      (clients || []).forEach((c: any) => {
        const balance = c.credit_balance || 0;
        if (balance <= 0) {
          stats.none++;
        } else if (balance < 800) {
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
    },
    {
      id: 'low',
      icon: AlertTriangle,
      label: 'Nízký kredit',
      value: data?.low || 0,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      id: 'none',
      icon: XCircle,
      label: 'Bez kreditu',
      value: data?.none || 0,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];
  
  const hasProblems = (data?.low || 0) > 0 || (data?.none || 0) > 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5 text-primary" />
          Kredity
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 flex-1 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {items.map(item => (
                <button
                  key={item.id}
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
        )}
      </CardContent>
    </Card>
  );
}
