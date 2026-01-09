import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Lock,
  Unlock,
  History,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { 
  useClientCreditLots, 
  useClientCreditSummary,
  useClientCreditConsumptions,
  useMigrateCreditToLot,
  OLD_PRICE_LIST_ID,
  NEW_PRICE_LIST_ID,
} from '@/hooks/useCreditLots';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ClientCreditLotsCardProps {
  clientId: string;
  clientCreditBalance?: number;
  className?: string;
}

export function ClientCreditLotsCard({ 
  clientId, 
  clientCreditBalance = 0,
  className 
}: ClientCreditLotsCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showLots, setShowLots] = useState(false);
  
  const { data: lots = [], isLoading: lotsLoading } = useClientCreditLots(clientId);
  const { data: summary, isLoading: summaryLoading } = useClientCreditSummary(clientId);
  const { data: consumptions = [] } = useClientCreditConsumptions(clientId);
  const migrateMutation = useMigrateCreditToLot();

  const isLoading = lotsLoading || summaryLoading;
  const hasLots = lots.length > 0;
  const needsMigration = !hasLots && clientCreditBalance > 0;

  // Group lots by price list
  const oldLots = lots.filter(l => l.price_list_id === OLD_PRICE_LIST_ID && l.balance_czk_remaining > 0);
  const newLots = lots.filter(l => l.price_list_id === NEW_PRICE_LIST_ID && l.balance_czk_remaining > 0);

  const handleMigrate = async (useOld: boolean) => {
    await migrateMutation.mutateAsync({
      clientId,
      useOldPriceList: useOld,
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Kredit dle ceníku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show migration prompt if client has credit but no lots
  if (needsMigration) {
    return (
      <Card className={cn("border-warning/50 bg-warning/5", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            Migrace kreditu potřeba
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Klient má kredit {formatCurrency(clientCreditBalance)}, který je potřeba přiřadit k ceníku.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleMigrate(true)}
              disabled={migrateMutation.isPending}
              className="justify-start gap-2"
            >
              <Lock className="w-4 h-4" />
              Fixovat starou cenu (800/1000/1200 Kč)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleMigrate(false)}
              disabled={migrateMutation.isPending}
              className="justify-start gap-2"
            >
              <Unlock className="w-4 h-4" />
              Použít novou cenu (900/1100/1300 Kč)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No credit at all
  if (!hasLots && clientCreditBalance <= 0) {
    return null; // Don't show card if no credit
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Kredit dle ceníku
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-2">
          {summary && summary.old_balance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  Starý ceník
                </Badge>
                800/1000/1200 Kč
              </span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(summary.old_balance)}
              </span>
            </div>
          )}
          
          {summary && summary.new_balance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Badge variant="default" className="text-xs font-normal bg-primary/80">
                  Nový ceník
                </Badge>
                900/1100/1300 Kč
              </span>
              <span className="font-semibold text-primary">
                {formatCurrency(summary.new_balance)}
              </span>
            </div>
          )}

          {summary && (
            <Separator className="my-2" />
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium">Celkem</span>
            <span className={cn(
              "font-bold text-lg",
              (summary?.total_balance || 0) < 0 ? "text-destructive" : "text-success"
            )}>
              {formatCurrency(summary?.total_balance || 0)}
            </span>
          </div>
        </div>

        {/* Lots detail (collapsible) */}
        {lots.length > 0 && (
          <Collapsible open={showLots} onOpenChange={setShowLots}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
                <span className="text-xs text-muted-foreground">
                  {lots.length} šarž{lots.length === 1 ? 'e' : lots.length < 5 ? 'e' : 'í'} kreditu
                </span>
                {showLots ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ScrollArea className="h-32">
                <div className="space-y-2 pr-4">
                  {lots.map(lot => (
                    <div 
                      key={lot.id} 
                      className={cn(
                        "p-2 rounded-lg text-xs",
                        lot.balance_czk_remaining > 0 ? "bg-secondary/50" : "bg-muted/30 opacity-60"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {format(new Date(lot.purchased_at), 'd. M. yyyy', { locale: cs })}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {lot.source === 'migration' ? 'Migrace' : 
                             lot.source === 'manual_adjustment' ? 'Úprava' : 'Nákup'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(lot.balance_czk_remaining)}
                          </div>
                          <div className="text-muted-foreground">
                            z {formatCurrency(lot.balance_czk_original)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Consumption history */}
        {consumptions.length > 0 && (
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <History className="w-3 h-3" />
                  Historie stržení
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ScrollArea className="h-40">
                <div className="space-y-1 pr-4">
                  {consumptions.slice(0, 20).map(c => (
                    <div 
                      key={c.id} 
                      className="flex justify-between items-center py-1.5 text-xs border-b border-border/50 last:border-0"
                    >
                      <div>
                        <div className="text-muted-foreground">
                          {format(new Date(c.created_at), 'd. M. HH:mm', { locale: cs })}
                        </div>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {c.service_id}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-destructive">
                          -{formatCurrency(c.amount_czk)}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {c.price_lists?.name?.includes('31') ? 'Starý' : 'Nový'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
