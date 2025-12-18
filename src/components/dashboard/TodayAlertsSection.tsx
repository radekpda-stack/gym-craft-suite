import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  MessageSquare, 
  Utensils, 
  Wallet, 
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TodayAlertsData, TodayAlert } from '@/hooks/useTodayAlerts';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface TodayAlertsSectionProps {
  data: TodayAlertsData | undefined;
  isLoading: boolean;
}

function AlertItem({ alert, onClick }: { alert: TodayAlert; onClick: () => void }) {
  const severityStyles = {
    error: 'border-l-destructive bg-destructive/5 hover:bg-destructive/10',
    warning: 'border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10',
    info: 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10',
    success: 'border-l-green-500 bg-green-500/5 hover:bg-green-500/10',
  };
  
  const iconStyles = {
    error: 'text-destructive',
    warning: 'text-orange-500',
    info: 'text-blue-500',
    success: 'text-green-500',
  };
  
  const typeIcons = {
    training: Dumbbell,
    feedback: MessageSquare,
    nutrition: Utensils,
    credit: Wallet,
    unpaid: AlertCircle,
  };
  
  const Icon = typeIcons[alert.type];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border-l-4 transition-colors text-left',
        severityStyles[alert.severity]
      )}
    >
      <div className={cn('p-2 rounded-lg bg-background/50', iconStyles[alert.severity])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.title}</p>
        {alert.subtitle && (
          <p className="text-xs text-muted-foreground">{alert.subtitle}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  severity = 'default',
  onClick,
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string;
  severity?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}) {
  const severityColors = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-orange-500',
    error: 'text-destructive',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 transition-colors min-w-[80px]',
        onClick && 'hover:bg-secondary/50 cursor-pointer'
      )}
    >
      <Icon className={cn('w-5 h-5', severityColors[severity])} />
      <span className={cn('text-lg font-bold', severityColors[severity])}>{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </button>
  );
}

export function TodayAlertsSection({ data, isLoading }: TodayAlertsSectionProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-24 rounded-xl flex-shrink-0" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { todayTrainings, missingFeedback, lowCreditClients, unpaidTrainings, alerts } = data;
  
  // Determine overall status
  const hasUrgent = unpaidTrainings.count > 0 || lowCreditClients.items.some(c => c.balance <= 0);
  const hasWarnings = missingFeedback.count > 0 || lowCreditClients.count > 0;
  
  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Dnes
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasUrgent && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Urgentní
              </Badge>
            )}
            {!hasUrgent && hasWarnings && (
              <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500">
                <AlertCircle className="w-3 h-3" />
                Pozor
              </Badge>
            )}
            {!hasUrgent && !hasWarnings && todayTrainings.scheduled === 0 && todayTrainings.completed > 0 && (
              <Badge variant="outline" className="gap-1 border-green-500 text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                Hotovo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick stats row */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          <StatCard
            icon={Dumbbell}
            label="Tréninky"
            value={`${todayTrainings.completed}/${todayTrainings.scheduled + todayTrainings.completed}`}
            severity={todayTrainings.scheduled > 0 ? 'default' : 'success'}
            onClick={() => navigate('/trainings')}
          />
          <StatCard
            icon={MessageSquare}
            label="Feedback"
            value={missingFeedback.count}
            severity={missingFeedback.count > 2 ? 'error' : missingFeedback.count > 0 ? 'warning' : 'success'}
            onClick={() => navigate('/trainings')}
          />
          <StatCard
            icon={Wallet}
            label="Nízký kredit"
            value={lowCreditClients.count}
            severity={lowCreditClients.items.some(c => c.balance <= 0) ? 'error' : lowCreditClients.count > 0 ? 'warning' : 'success'}
            onClick={() => navigate('/clients')}
          />
          <StatCard
            icon={AlertCircle}
            label="Nezaplaceno"
            value={unpaidTrainings.count}
            severity={unpaidTrainings.count > 0 ? 'error' : 'success'}
            onClick={() => navigate('/trainings')}
          />
        </div>
        
        {/* Alerts list */}
        {alerts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Vyžaduje pozornost
            </p>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onClick={() => alert.actionUrl && navigate(alert.actionUrl)}
                />
              ))}
            </div>
            {alerts.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/trainings')}
              >
                Zobrazit všechny ({alerts.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Vše v pořádku!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
