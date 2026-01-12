import { motion } from 'framer-motion';
import { 
  Calendar, 
  CreditCard, 
  Cake, 
  TrendingUp, 
  TrendingDown, 
  Salad, 
  Trophy, 
  Bell,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSmartAlerts, type SmartAlert } from '@/hooks/useSmartAlerts';
import { staggerContainer, fadeInUp } from '@/lib/animations';

const ALERT_ICONS: Record<SmartAlert['type'], typeof Bell> = {
  no_training_scheduled: Calendar,
  low_credit: CreditCard,
  birthdays_this_month: Cake,
  profit_trend: TrendingUp,
  inactive_nutrition: Salad,
  new_badge: Trophy,
  client_milestone: Trophy,
};

const SEVERITY_STYLES: Record<SmartAlert['severity'], { bg: string; text: string; border: string }> = {
  success: { 
    bg: 'bg-success/10', 
    text: 'text-success', 
    border: 'border-success/20' 
  },
  warning: { 
    bg: 'bg-warning/10', 
    text: 'text-warning', 
    border: 'border-warning/20' 
  },
  info: { 
    bg: 'bg-primary/10', 
    text: 'text-primary', 
    border: 'border-primary/20' 
  },
};

interface SmartAlertItemProps {
  alert: SmartAlert;
  index: number;
}

function SmartAlertItem({ alert, index }: SmartAlertItemProps) {
  const navigate = useNavigate();
  const styles = SEVERITY_STYLES[alert.severity];
  const Icon = alert.type === 'profit_trend' && (alert.value ?? 0) < 0 
    ? TrendingDown 
    : ALERT_ICONS[alert.type] || Bell;

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl border transition-all',
        'hover:shadow-md cursor-pointer',
        styles.bg,
        styles.border
      )}
      onClick={() => alert.link && navigate(alert.link)}
    >
      <div className={cn(
        'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
        styles.bg,
        styles.text
      )}>
        <Icon className="w-4.5 h-4.5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{alert.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{alert.message}</p>
      </div>

      {alert.link && (
        <ChevronRight className={cn(
          'w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          styles.text
        )} />
      )}
    </motion.div>
  );
}

function AlertSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-9 h-9 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

interface SmartAlertsPanelProps {
  maxAlerts?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function SmartAlertsPanel({ 
  maxAlerts = 5, 
  showHeader = true,
  compact = false 
}: SmartAlertsPanelProps) {
  const { data: alerts = [], isLoading } = useSmartAlerts();
  const navigate = useNavigate();

  const displayAlerts = alerts.slice(0, maxAlerts);
  const hasMore = alerts.length > maxAlerts;

  if (isLoading) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none bg-transparent')}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Chytrá upozornění
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn('space-y-2', compact && 'p-0')}>
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (displayAlerts.length === 0) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none bg-transparent')}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Chytrá upozornění
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn(compact && 'p-0')}>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Žádná nová upozornění</p>
            <p className="text-xs mt-1">Vše je v pořádku! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && 'border-0 shadow-none bg-transparent')}>
      {showHeader && (
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Chytrá upozornění
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn('space-y-2', compact && 'p-0')}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {displayAlerts.map((alert, index) => (
            <SmartAlertItem key={alert.id} alert={alert} index={index} />
          ))}
        </motion.div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => navigate('/notifications')}
          >
            Zobrazit všech {alerts.length} upozornění
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
