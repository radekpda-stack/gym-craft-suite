import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  MessageSquare, 
  Utensils, 
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TodayAlertsData } from '@/hooks/useTodayAlerts';

interface TodayCardsProps {
  data: TodayAlertsData | undefined;
  isLoading: boolean;
}

interface StatusCardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  subtitle?: string;
  status: 'ok' | 'warning' | 'error';
  onClick: () => void;
}

function StatusCard({ icon: Icon, title, value, subtitle, status, onClick }: StatusCardProps) {
  const statusStyles = {
    ok: 'border-green-500/30 bg-green-500/5',
    warning: 'border-orange-500/30 bg-orange-500/5',
    error: 'border-destructive/30 bg-destructive/5',
  };
  
  const iconStyles = {
    ok: 'text-green-500 bg-green-500/10',
    warning: 'text-orange-500 bg-orange-500/10',
    error: 'text-destructive bg-destructive/10',
  };
  
  const valueStyles = {
    ok: 'text-green-500',
    warning: 'text-orange-500',
    error: 'text-destructive',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]',
        statusStyles[status]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn('p-2 rounded-lg', iconStyles[status])}>
          <Icon className="w-5 h-5" />
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
      </div>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        <p className={cn('text-2xl font-bold mt-1', valueStyles[status])}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

export function TodayCards({ data, isLoading }: TodayCardsProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { todayTrainings, missingFeedback, activeNutrition, lowCreditClients } = data;
  
  // Calculate statuses
  const trainingsTotal = todayTrainings.scheduled + todayTrainings.completed;
  const trainingsStatus = todayTrainings.scheduled === 0 && trainingsTotal > 0 ? 'ok' : 
                          todayTrainings.scheduled > 0 ? 'warning' : 'ok';
  
  const feedbackStatus = missingFeedback.count === 0 ? 'ok' : 
                         missingFeedback.count > 2 ? 'error' : 'warning';
  
  const nutritionStatus = activeNutrition.count === 0 ? 'ok' : 'warning';
  
  const creditStatus = lowCreditClients.items.some(c => c.balance <= 0) ? 'error' :
                       lowCreditClients.count > 0 ? 'warning' : 'ok';

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Dnes
      </h2>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusCard
          icon={Dumbbell}
          title="Klienti"
          value={`${todayTrainings.completed}/${trainingsTotal}`}
          subtitle={todayTrainings.scheduled > 0 ? `${todayTrainings.scheduled} zbývá` : 'Vše hotovo'}
          status={trainingsStatus}
          onClick={() => navigate('/trainings')}
        />
        
        <StatusCard
          icon={MessageSquare}
          title="Chybí feedback"
          value={missingFeedback.count}
          subtitle={missingFeedback.count > 0 ? 'Poslat odkaz' : 'Vše vyplněno'}
          status={feedbackStatus}
          onClick={() => navigate('/trainings?filter=completed')}
        />
        
        <StatusCard
          icon={Utensils}
          title="Strava"
          value={activeNutrition.count}
          subtitle={activeNutrition.count > 0 ? 'Aktivních sezení' : 'Žádná sezení'}
          status={nutritionStatus}
          onClick={() => navigate('/clients')}
        />
        
        <StatusCard
          icon={Wallet}
          title="Kredit"
          value={lowCreditClients.count}
          subtitle={lowCreditClients.count > 0 ? 'Nízký/bez kreditu' : 'Vše v pořádku'}
          status={creditStatus}
          onClick={() => navigate('/clients?filter=lowcredit')}
        />
      </div>
    </section>
  );
}
