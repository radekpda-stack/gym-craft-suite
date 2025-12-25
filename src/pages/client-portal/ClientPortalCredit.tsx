import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientCredit, useClientTransactions, useClientMonthlyUsage } from '@/hooks/useClientPortalData';
import { Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientPortalCredit() {
  const { clientId } = useClientPortal();
  const { data: credit, isLoading: creditLoading } = useClientCredit(clientId ?? undefined);
  const { data: transactions, isLoading: txLoading } = useClientTransactions(clientId ?? undefined);
  const { data: usage } = useClientMonthlyUsage(clientId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kredit & Platby</h1>
        <p className="text-muted-foreground">Přehled financí</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-1">Aktuální kredit</p>
          {creditLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <p className="text-4xl font-bold">{credit?.toLocaleString('cs-CZ')} Kč</p>
          )}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tento měsíc</p>
              <p className="font-medium">{usage?.trainingsThisMonth ?? 0} tréninků</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Poslední transakce
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : transactions?.length === 0 ? (
            <p className="text-muted-foreground text-sm">Žádné transakce</p>
          ) : (
            <div className="space-y-3">
              {transactions?.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      tx.amount > 0 ? "bg-success/10" : "bg-muted"
                    )}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5 text-success" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(tx.created_at), 'd. MMMM yyyy', { locale: cs })}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-semibold",
                    tx.amount > 0 ? "text-success" : "text-foreground"
                  )}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('cs-CZ')} Kč
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
