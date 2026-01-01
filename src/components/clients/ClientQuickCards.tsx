/**
 * ClientQuickCards Component
 * 
 * 3 quick cards showing key information:
 * A) Next/Last Training (PT session)
 * B) Credit balance (Kč only) with shared budget info
 * C) Client Zone status
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  Users, 
  Shield, 
  ChevronRight,
  Plus,
  CalendarClock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { format, differenceInDays, isFuture, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainingSession {
  id: string;
  date: string;
  status: string;
  duration?: number;
}

interface ClientZoneInfo {
  isActive: boolean;
  lastLogin?: string | null;
}

interface QuickCardsProps {
  clientId: string;
  clientName: string;
  sessions: TrainingSession[];
  creditBalance: number;
  isSharedBudget: boolean;
  budgetGroupName?: string | null;
  budgetMemberCount?: number;
  clientZone?: ClientZoneInfo | null;
  onAddTraining: () => void;
  onAddCredit: () => void;
  onScrollToClientZone: () => void;
}

export function ClientQuickCards({
  clientId,
  clientName,
  sessions,
  creditBalance,
  isSharedBudget,
  budgetGroupName,
  budgetMemberCount,
  clientZone,
  onAddTraining,
  onAddCredit,
  onScrollToClientZone,
}: QuickCardsProps) {
  
  // Find next scheduled and last completed training
  const { nextSession, lastSession } = useMemo(() => {
    const now = new Date();
    
    // Next scheduled session
    const scheduled = sessions
      .filter(s => s.status === 'scheduled' && isFuture(new Date(s.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Last completed session
    const completed = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      nextSession: scheduled[0] || null,
      lastSession: completed[0] || null,
    };
  }, [sessions]);

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = differenceInDays(date, new Date());
    
    if (days === 0) return `Dnes v ${format(date, 'HH:mm')}`;
    if (days === 1) return `Zítra v ${format(date, 'HH:mm')}`;
    if (days === -1) return 'Včera';
    if (days > 1 && days < 7) return format(date, "EEEE 'v' HH:mm", { locale: cs });
    return format(date, "d.M. 'v' HH:mm", { locale: cs });
  };

  const getCreditStatusColor = () => {
    if (creditBalance <= 0) return 'text-destructive';
    if (creditBalance < 800) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* CARD A: Trainings */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Tréninky</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddTraining}>
            <Plus className="w-3 h-3" />
            Přidat
          </Button>
        </div>

        <div className="space-y-3">
          {/* Next session */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Další sezení</span>
              {nextSession ? (
                <Link 
                  to={`/trainings/${nextSession.id}`}
                  className="block text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {formatSessionDate(nextSession.date)}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenaplánováno</p>
              )}
            </div>
            {nextSession && (
              <Link to={`/trainings/${nextSession.id}`}>
                <Badge variant="outline" className="text-xs gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Přesunout
                </Badge>
              </Link>
            )}
          </div>

          {/* Last session */}
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Poslední sezení</span>
            {lastSession ? (
              <div className="flex items-center gap-2">
                <Link 
                  to={`/trainings/${lastSession.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {format(new Date(lastSession.date), "d.M.yyyy", { locale: cs })}
                </Link>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Dokončeno
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Zatím žádný</p>
            )}
          </div>
        </div>
      </div>

      {/* CARD B: Credit */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-medium">Kredit</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onAddCredit}>
            <Plus className="w-3 h-3" />
            Dobít
          </Button>
        </div>

        <div className="space-y-2">
          {/* Balance */}
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', getCreditStatusColor())}>
              {formatCurrency(creditBalance)}
            </span>
          </div>

          {/* Shared budget info */}
          <div className="flex items-center gap-2">
            {isSharedBudget ? (
              <>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="w-3 h-3" />
                  Sdílený
                </Badge>
                {budgetGroupName && (
                  <span className="text-xs text-muted-foreground">
                    {budgetGroupName}
                    {budgetMemberCount && budgetMemberCount > 1 && (
                      <span className="ml-1">({budgetMemberCount} členů)</span>
                    )}
                  </span>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-xs">
                Osobní
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* CARD C: Client Zone */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Klientská zóna</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1" 
            onClick={onScrollToClientZone}
          >
            Nastavení
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        <div className="space-y-2">
          {/* Status */}
          <div className="flex items-center gap-2">
            {clientZone?.isActive ? (
              <Badge className="bg-success/10 text-success border-success/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Aktivní
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                <XCircle className="w-3 h-3 mr-1" />
                Neaktivní
              </Badge>
            )}
          </div>

          {/* Last login */}
          {clientZone?.isActive && (
            <div className="text-xs text-muted-foreground">
              <span>Poslední přihlášení: </span>
              <span className="font-medium">
                {clientZone.lastLogin 
                  ? format(new Date(clientZone.lastLogin), "d.M.yyyy HH:mm", { locale: cs })
                  : 'Nikdy'
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
