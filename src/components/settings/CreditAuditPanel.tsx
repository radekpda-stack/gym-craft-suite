import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, RefreshCw, Users, User, Calculator } from 'lucide-react';
import { useBalanceDiscrepancies, useRecalculateAllBalances } from '@/hooks/useRecalculateBalances';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface DiscrepancyRowProps {
  item: {
    id: string;
    name: string;
    stored_balance: number;
    calculated_balance: number;
    discrepancy: number;
  };
  type: 'group' | 'client';
}

function DiscrepancyRow({ item, type }: DiscrepancyRowProps) {
  const Icon = type === 'group' ? Users : User;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{item.name}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right">
          <div className="text-muted-foreground">Uloženo</div>
          <div>{formatCurrency(item.stored_balance)}</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">Ledger</div>
          <div>{formatCurrency(item.calculated_balance)}</div>
        </div>
        <Badge variant={item.discrepancy > 0 ? 'default' : 'destructive'}>
          {item.discrepancy > 0 ? '+' : ''}{formatCurrency(item.discrepancy)}
        </Badge>
      </div>
    </div>
  );
}

export function CreditAuditPanel() {
  const { data, isLoading, refetch, dataUpdatedAt } = useBalanceDiscrepancies();
  const recalculateMutation = useRecalculateAllBalances();
  
  const totalDiscrepancies = (data?.total_group_discrepancies ?? 0) + (data?.total_client_discrepancies ?? 0);
  const isHealthy = totalDiscrepancies === 0;
  
  const handleRecalculate = async () => {
    await recalculateMutation.mutateAsync();
    refetch();
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Audit kreditového systému</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Vše OK
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {totalDiscrepancies} diskrepancí
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Kontrola konzistence mezi uloženými zůstatky a transakčním ledgerem.
          {dataUpdatedAt && (
            <span className="text-xs text-muted-foreground ml-2">
              Aktualizováno {formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: cs })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isHealthy ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h3 className="text-lg font-medium">Finanční systém je v pořádku</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Všechny zůstatky odpovídají transakčnímu ledgeru.
            </p>
          </div>
        ) : (
          <>
            {data && data.groups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sdílené rozpočty ({data.groups.length})
                </h4>
                <div className="bg-muted/30 rounded-lg p-3">
                  {data.groups.map((group) => (
                    <DiscrepancyRow key={group.id} item={group} type="group" />
                  ))}
                </div>
              </div>
            )}
            
            {data && data.clients.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Individuální klienti ({data.clients.length})
                </h4>
                <div className="bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {data.clients.map((client) => (
                    <DiscrepancyRow key={client.id} item={client} type="client" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Obnovit
          </Button>
          
          {!isHealthy && (
            <Button
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              {recalculateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Přepočítávám...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Opravit vše
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
