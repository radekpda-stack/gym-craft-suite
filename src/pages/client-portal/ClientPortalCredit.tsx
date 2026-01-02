import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientCreditStats, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

function PeriodChips({ value, onChange }: { value: PeriodDays; onChange: (v: PeriodDays) => void }) {
  return (
    <div className="flex gap-2">
      {periodOptions.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
  if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'training': 'Trénink',
    'package': 'Balíček',
    'purchase': 'Nákup',
    'refund': 'Vrácení',
    'adjustment': 'Úprava',
    'manual': 'Ruční úprava',
    'product': 'Produkt',
  };
  return labels[type] || type;
}

export default function ClientPortalCredit() {
  const { clientId } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  
  const { data: stats, isLoading, error } = useClientCreditStats(clientId ?? undefined, period);
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_credit');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  useEffect(() => {
    if (stats && stats.transactions.length > 0) {
      trackPortalEvent('client_portal_view_transactions', { 
        transactions_count: stats.transactions.length,
        period 
      });
    }
  }, [stats, period, trackPortalEvent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Kredit</h1>
          <p className="text-muted-foreground text-sm">Přehled tvého kreditu</p>
        </div>
        <PeriodChips value={period} onChange={setPeriod} />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nepodařilo se načíst kredit. Zkus to prosím znovu.
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-40" />
                <div className="flex gap-6">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : stats ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Aktuální kredit</p>
                    <p className="text-5xl font-bold tracking-tight">
                      {stats.balance.toLocaleString('cs-CZ')}
                      <span className="text-xl font-normal text-muted-foreground ml-2">Kč</span>
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-7 h-7 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-2xl font-bold text-success">+{stats.addedInPeriod.toLocaleString('cs-CZ')}</p>
                    <p className="text-xs text-muted-foreground">dobito</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">-{stats.spentInPeriod.toLocaleString('cs-CZ')}</p>
                    <p className="text-xs text-muted-foreground">utraceno</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendIcon value={stats.netChange} />
                      <p className="text-xl font-bold">
                        {stats.netChange > 0 ? '+' : ''}{stats.netChange.toLocaleString('cs-CZ')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">rozdíl</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Receipt className="w-4 h-4" />
              Historie transakcí
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !stats || stats.transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-2">Zatím nemáš žádné transakce</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Zde uvidíš historii všech pohybů na kreditu
                </p>
                <p className="text-xs text-muted-foreground">
                  Pro informace o kreditu kontaktuj svého trenéra
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      tx.amount > 0 ? "bg-success/10" : "bg-muted"
                    )}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5 text-success" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {tx.description || getTransactionTypeLabel(tx.type)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{format(parseISO(tx.created_at), 'd. MMMM yyyy', { locale: cs })}</span>
                        {tx.payment_method && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="capitalize">{tx.payment_method}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className={cn(
                      "text-lg font-semibold flex-shrink-0",
                      tx.amount > 0 ? "text-success" : "text-foreground"
                    )}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('cs-CZ')} Kč
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
