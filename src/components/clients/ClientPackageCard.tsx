import { useState } from 'react';
import { Package, AlertTriangle, Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useActiveClientPackage, useClientPackages, ClientPackage } from '@/hooks/useClientPackages';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PurchasePackageDialog } from './PurchasePackageDialog';

interface ClientPackageCardProps {
  clientId: string;
  clientName: string;
}

export function ClientPackageCard({ clientId, clientName }: ClientPackageCardProps) {
  const { data: activePackage, isLoading: loadingActive } = useActiveClientPackage(clientId);
  const { data: allPackages, isLoading: loadingAll } = useClientPackages(clientId);
  const [showHistory, setShowHistory] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  if (loadingActive || loadingAll) {
    return (
      <div className="glass rounded-xl p-4">
        <Skeleton className="h-5 w-32 mb-3" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  const inactivePackages = (allPackages || []).filter(p => p.id !== activePackage?.id);
  
  const getPackageStatus = (pkg: ClientPackage) => {
    const remaining = pkg.trainings_total - pkg.trainings_used;
    const percentUsed = (pkg.trainings_used / pkg.trainings_total) * 100;
    const daysToExpire = pkg.expires_at ? differenceInDays(new Date(pkg.expires_at), new Date()) : null;
    const isExpired = pkg.expires_at ? isPast(new Date(pkg.expires_at)) : false;
    const isLow = remaining <= Math.ceil(pkg.trainings_total * 0.2);
    const isExpiring = daysToExpire !== null && daysToExpire <= 7 && daysToExpire > 0;

    return { remaining, percentUsed, daysToExpire, isExpired, isLow, isExpiring };
  };

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-sm text-foreground">Tréninkový balíček</h4>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs"
          onClick={() => setPurchaseDialogOpen(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Přidat
        </Button>
      </div>

      {/* Active package */}
      {activePackage ? (
        <ActivePackageDisplay package={activePackage} status={getPackageStatus(activePackage)} />
      ) : (
        <div className="p-4 rounded-lg bg-secondary/30 border border-dashed border-border text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">Žádný aktivní balíček</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setPurchaseDialogOpen(true)}
          >
            Přiřadit balíček
          </Button>
        </div>
      )}

      {/* History toggle */}
      {inactivePackages.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Historie ({inactivePackages.length})
          </button>

          {showHistory && (
            <div className="space-y-2 pt-2 border-t border-border">
              {inactivePackages.slice(0, 3).map((pkg) => {
                const status = getPackageStatus(pkg);
                return (
                  <div key={pkg.id} className="p-2 rounded-lg bg-secondary/20 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{pkg.package_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {status.isExpired ? 'Expiroval' : 'Vyčerpán'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {pkg.trainings_used}/{pkg.trainings_total} tréninků • {format(new Date(pkg.purchased_at), 'd. MMM yyyy', { locale: cs })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <PurchasePackageDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
}

function ActivePackageDisplay({ 
  package: pkg, 
  status 
}: { 
  package: ClientPackage; 
  status: ReturnType<typeof getPackageStatus>; 
}) {
  const { remaining, percentUsed, daysToExpire, isExpired, isLow, isExpiring } = status;

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isExpired ? 'bg-destructive/10 border-destructive/30' :
      isLow || isExpiring ? 'bg-warning/10 border-warning/30' :
      'bg-primary/5 border-primary/20'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm text-foreground">{pkg.package_name}</p>
          <p className="text-[10px] text-muted-foreground">
            Zakoupen {format(new Date(pkg.purchased_at), 'd. MMMM yyyy', { locale: cs })}
          </p>
        </div>
        {(isLow || isExpiring || isExpired) && (
          <AlertTriangle className={cn(
            'w-4 h-4',
            isExpired ? 'text-destructive' : 'text-warning'
          )} />
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Využito</span>
          <span className="font-medium text-foreground">
            {pkg.trainings_used} / {pkg.trainings_total} tréninků
          </span>
        </div>
        <Progress 
          value={percentUsed} 
          className={cn(
            'h-2',
            isLow && '[&>div]:bg-warning',
            isExpired && '[&>div]:bg-destructive'
          )} 
        />
        <p className={cn(
          'text-xs font-medium',
          isLow ? 'text-warning' : 'text-success'
        )}>
          Zbývá {remaining} {remaining === 1 ? 'trénink' : remaining < 5 ? 'tréninky' : 'tréninků'}
        </p>
      </div>

      {/* Expiration */}
      {pkg.expires_at && (
        <div className={cn(
          'flex items-center gap-1 text-xs',
          isExpired ? 'text-destructive' : isExpiring ? 'text-warning' : 'text-muted-foreground'
        )}>
          <Clock className="w-3 h-3" />
          {isExpired ? (
            <span>Expiroval {format(new Date(pkg.expires_at), 'd. MMM yyyy', { locale: cs })}</span>
          ) : (
            <span>Platnost do {format(new Date(pkg.expires_at), 'd. MMMM yyyy', { locale: cs })}</span>
          )}
          {isExpiring && <span className="font-medium">({daysToExpire} dní)</span>}
        </div>
      )}
    </div>
  );
}

function getPackageStatus(pkg: ClientPackage) {
  const remaining = pkg.trainings_total - pkg.trainings_used;
  const percentUsed = (pkg.trainings_used / pkg.trainings_total) * 100;
  const daysToExpire = pkg.expires_at ? differenceInDays(new Date(pkg.expires_at), new Date()) : null;
  const isExpired = pkg.expires_at ? isPast(new Date(pkg.expires_at)) : false;
  const isLow = remaining <= Math.ceil(pkg.trainings_total * 0.2);
  const isExpiring = daysToExpire !== null && daysToExpire <= 7 && daysToExpire > 0;

  return { remaining, percentUsed, daysToExpire, isExpired, isLow, isExpiring };
}
