import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, CalendarDays, ChevronRight, TrendingUp, TrendingDown, AlertCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useClientCreditStats, useClientUnpaidTrainings, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientNextTraining } from '@/hooks/useClientPortalData';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';

interface HeroStatsRowProps {
  period?: PeriodDays;
}

// Remove period prop as it's no longer needed from parent

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) return 'Dnes';
  if (isTomorrow(date)) return 'Zítra';
  
  const daysDiff = differenceInDays(date, new Date());
  if (daysDiff <= 6) {
    return format(date, 'EEEE', { locale: cs });
  }
  
  return format(date, 'd. MMMM', { locale: cs });
}

export function HeroStatsRow({ period = 30 }: HeroStatsRowProps) {
  const { clientId } = useClientPortal();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { data: creditStats, isLoading: creditLoading } = useClientCreditStats(clientId ?? undefined, period);
  const { data: unpaidInfo, isLoading: unpaidLoading } = useClientUnpaidTrainings(clientId ?? undefined);
  const { data: nextTraining, isLoading: trainingLoading } = useClientNextTraining(clientId ?? undefined);
  
  // Calculate effective balance (ledger balance minus unpaid trainings)
  const ledgerBalance = creditStats?.balance ?? 0;
  const unpaidAmount = unpaidInfo?.amount ?? 0;
  const effectiveBalance = ledgerBalance - unpaidAmount;
  
  // Color scheme based on effective balance
  const getBalanceColor = () => {
    if (effectiveBalance < 0) return 'text-destructive';
    if (effectiveBalance === 0) return 'text-muted-foreground';
    return 'text-success';
  };
  
  const getCardStyle = () => {
    if (effectiveBalance < 0) {
      return 'from-destructive/15 via-destructive/10 to-destructive/5 border-destructive/30 hover:border-destructive/50';
    }
    if (effectiveBalance === 0) {
      return 'from-muted/20 via-muted/10 to-transparent border-border hover:border-muted-foreground/30';
    }
    return 'from-success/15 via-success/10 to-success/5 border-success/30 hover:border-success/50';
  };

  const creditTrend = creditStats?.netChange ?? 0;
  const isLoading = creditLoading || unpaidLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-2"
    >
      {/* Credit Card with Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Card className={cn(
            "relative overflow-hidden bg-gradient-to-br transition-colors cursor-pointer h-full",
            getCardStyle()
          )}>
            <CardContent className="p-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    effectiveBalance < 0 ? "bg-destructive/20" : effectiveBalance === 0 ? "bg-muted/30" : "bg-success/20"
                  )}>
                    <Wallet className={cn(
                      "w-4 h-4",
                      effectiveBalance < 0 ? "text-destructive" : effectiveBalance === 0 ? "text-muted-foreground" : "text-success"
                    )} />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Kredit</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-14 mt-0.5" />
                  ) : (
                    <p className={cn("text-base font-bold leading-tight", getBalanceColor())}>
                      {effectiveBalance.toLocaleString('cs-CZ')} Kč
                    </p>
                  )}
                </div>
                {/* Unpaid warning */}
                {!isLoading && unpaidAmount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Dluh: {unpaidAmount.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}
                {/* Trend badge (only if no debt and there's a change) */}
                {!isLoading && unpaidAmount === 0 && creditTrend !== 0 && (
                  <div className={cn(
                    "flex items-center gap-0.5 text-[10px] font-medium w-fit",
                    creditTrend > 0 ? "text-success" : "text-destructive"
                  )}>
                    {creditTrend > 0 ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" />
                    )}
                    <span>
                      {creditTrend > 0 ? '+' : ''}{creditTrend.toLocaleString('cs-CZ')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="max-h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Přehled kreditu
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4">
            {/* Balance summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Zůstatek na účtu</p>
                <p className="text-lg font-bold">{ledgerBalance.toLocaleString('cs-CZ')} Kč</p>
              </div>
              {unpaidAmount > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-xs text-destructive">Nezaplacené tréninky</p>
                  <p className="text-lg font-bold text-destructive">-{unpaidAmount.toLocaleString('cs-CZ')} Kč</p>
                </div>
              )}
            </div>
            
            {/* Effective balance */}
            <div className={cn(
              "p-4 rounded-lg",
              effectiveBalance < 0 ? "bg-destructive/10" : effectiveBalance === 0 ? "bg-muted/30" : "bg-success/10"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Skutečný stav</p>
              <p className={cn("text-2xl font-bold", getBalanceColor())}>
                {effectiveBalance.toLocaleString('cs-CZ')} Kč
              </p>
              {effectiveBalance < 0 && (
                <p className="text-xs text-destructive mt-1">
                  Prosím uhraďte dlužnou částku u trenéra
                </p>
              )}
            </div>
            
            {/* Unpaid sessions list */}
            {unpaidInfo && unpaidInfo.sessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Nezaplacené tréninky ({unpaidInfo.count})</h4>
                <div className="space-y-2">
                  {unpaidInfo.sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <span className="text-sm">
                        {format(parseISO(session.date), 'd. MMMM yyyy', { locale: cs })}
                      </span>
                      <Badge variant="outline" className="text-destructive border-destructive/30">
                        {(session.final_price ?? 0).toLocaleString('cs-CZ')} Kč
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent transactions */}
            {creditStats?.transactions && creditStats.transactions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Poslední transakce</h4>
                <div className="space-y-2">
                  {creditStats.transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{tx.description || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(tx.created_at), 'd. M. yyyy', { locale: cs })}
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-medium ml-2",
                        tx.amount > 0 ? "text-success" : "text-destructive"
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Link to full credit page */}
            <Link 
              to={`${basePath}/credit`}
              onClick={() => setSheetOpen(false)}
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <span className="text-sm font-medium">Zobrazit celou historii</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Next Training Card */}
      <Link to={`${basePath}/attendance`}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-3">
            <div className="flex flex-col gap-1.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Další trénink</p>
                {trainingLoading ? (
                  <Skeleton className="h-5 w-14 mt-0.5" />
                ) : nextTraining ? (
                  <div>
                    <p className="text-sm font-bold leading-tight">
                      {formatRelativeDate(nextTraining.date)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(nextTraining.date), 'HH:mm', { locale: cs })}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Není naplánován
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
