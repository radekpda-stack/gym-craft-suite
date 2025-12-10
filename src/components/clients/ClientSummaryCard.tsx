import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Wallet, 
  AlertTriangle, 
  Check, 
  Calendar, 
  Clock,
  Plus,
  CreditCard,
  Dumbbell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface ClientSummaryCardProps {
  client: Client;
  creditBalance: number;
  isSharedBudget?: boolean;
  unpaidCount: number;
  unpaidTotal: number;
  lastPaymentDate?: string;
  lastPaymentMethod?: string;
  nextTrainingDate?: string;
  nextTrainingTime?: string;
  onAddTraining?: () => void;
  onAddCredit?: () => void;
  onPayUnpaid?: () => void;
}

export function ClientSummaryCard({
  client,
  creditBalance,
  isSharedBudget,
  unpaidCount,
  unpaidTotal,
  lastPaymentDate,
  lastPaymentMethod,
  nextTrainingDate,
  nextTrainingTime,
  onAddTraining,
  onAddCredit,
  onPayUnpaid,
}: ClientSummaryCardProps) {
  // Determine credit status color
  const getCreditStatusColor = () => {
    if (unpaidCount > 0) return 'destructive';
    if (creditBalance < 800) return 'warning'; // Less than 1 training
    return 'success';
  };
  
  const statusColor = getCreditStatusColor();

  return (
    <div className={cn(
      "glass rounded-2xl p-4 sm:p-5 space-y-4 border-l-4",
      statusColor === 'success' && "border-l-success",
      statusColor === 'warning' && "border-l-warning",
      statusColor === 'destructive' && "border-l-destructive"
    )}>
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
          {isSharedBudget && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Sdílený účet
            </span>
          )}
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1.5",
          statusColor === 'success' && "bg-success/10 text-success",
          statusColor === 'warning' && "bg-warning/10 text-warning",
          statusColor === 'destructive' && "bg-destructive/10 text-destructive"
        )}>
          <Wallet className="w-4 h-4" />
          {creditBalance.toLocaleString('cs-CZ')} Kč
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Unpaid Trainings */}
        <div className={cn(
          "p-3 rounded-xl",
          unpaidCount > 0 ? "bg-destructive/10" : "bg-secondary/50"
        )}>
          <p className="text-xs text-muted-foreground">Neuhrazené tréninky</p>
          {unpaidCount > 0 ? (
            <p className="text-lg font-bold text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {unpaidCount}× ({unpaidTotal.toLocaleString('cs-CZ')} Kč)
            </p>
          ) : (
            <p className="text-lg font-bold text-success flex items-center gap-1">
              <Check className="w-4 h-4" />
              Vše uhrazeno
            </p>
          )}
        </div>

        {/* Last Payment */}
        <div className="p-3 rounded-xl bg-secondary/50">
          <p className="text-xs text-muted-foreground">Poslední platba</p>
          {lastPaymentDate ? (
            <div>
              <p className="text-sm font-medium">{lastPaymentDate}</p>
              {lastPaymentMethod && (
                <p className="text-xs text-muted-foreground">{lastPaymentMethod}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      {/* Next Training */}
      {nextTrainingDate && (
        <div className="p-3 rounded-xl bg-primary/10 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Další trénink</p>
            <p className="text-sm font-medium text-foreground">
              {nextTrainingDate} {nextTrainingTime && `v ${nextTrainingTime}`}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 flex-wrap">
        <Button size="sm" className="gap-1.5 flex-1" onClick={onAddTraining}>
          <Dumbbell className="w-4 h-4" />
          Nový trénink
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={onAddCredit}>
          <Plus className="w-4 h-4" />
          Přidat kredit
        </Button>
        {unpaidCount > 0 && (
          <Button 
            size="sm" 
            variant="destructive" 
            className="gap-1.5 w-full"
            onClick={onPayUnpaid}
          >
            <CreditCard className="w-4 h-4" />
            Uhradit neuhrazené ({unpaidTotal.toLocaleString('cs-CZ')} Kč)
          </Button>
        )}
      </div>
    </div>
  );
}