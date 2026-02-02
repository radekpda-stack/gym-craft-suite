import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { premiumTransition, listItemVariants } from '@/lib/animations';

interface AlertItem {
  id: string;
  type: 'unpaid' | 'debt' | 'unassigned';
  title: string;
  subtitle: string;
  count?: number;
  amount?: number;
  severity: 'warning' | 'error';
  actionUrl: string;
}

interface AlertsSummaryCardProps {
  unpaidCount: number;
  unpaidAmount: number;
  debtCount: number;
  debtAmount: number;
  unassignedCount?: number;
  isLoading?: boolean;
}

export const AlertsSummaryCard = memo(function AlertsSummaryCard({
  unpaidCount,
  unpaidAmount,
  debtCount,
  debtAmount,
  unassignedCount = 0,
  isLoading,
}: AlertsSummaryCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const alerts: AlertItem[] = [];

  if (unassignedCount > 0) {
    alerts.push({
      id: 'unassigned',
      type: 'unassigned',
      title: `${unassignedCount} nepřiřazených tréninků`,
      subtitle: 'Přiřaďte klienty z kalendáře',
      count: unassignedCount,
      severity: 'warning',
      actionUrl: '/calendar',
    });
  }

  if (unpaidCount > 0) {
    alerts.push({
      id: 'unpaid',
      type: 'unpaid',
      title: `${unpaidCount} neuhrazených tréninků`,
      subtitle: formatCurrency(unpaidAmount),
      count: unpaidCount,
      amount: unpaidAmount,
      severity: 'warning',
      actionUrl: '/calendar',
    });
  }

  if (debtCount > 0) {
    alerts.push({
      id: 'debt',
      type: 'debt',
      title: `${debtCount} klientů s dluhem`,
      subtitle: formatCurrency(debtAmount),
      count: debtCount,
      amount: debtAmount,
      severity: 'error',
      actionUrl: '/clients?filter=debt',
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  const totalIssues = alerts.reduce((sum, a) => sum + (a.count || 0), 0);
  const hasErrors = alerts.some(a => a.severity === 'error');

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'unpaid':
        return <Clock className="w-4 h-4" />;
      case 'debt':
        return <CreditCard className="w-4 h-4" />;
      case 'unassigned':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <Card variant="floating" className={cn(
      'overflow-hidden',
      hasErrors 
        ? 'ring-1 ring-destructive/40 shadow-[0_0_20px_hsl(0_84%_60%/0.1)]' 
        : 'ring-1 ring-warning/40 shadow-[0_0_20px_hsl(38_92%_50%/0.1)]'
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <motion.div
            animate={hasErrors ? { scale: [1, 1.1, 1] } : undefined}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className={cn(
              'w-5 h-5',
              hasErrors ? 'text-destructive' : 'text-warning'
            )} />
          </motion.div>
          Vyžaduje pozornost
          <Badge 
            variant={hasErrors ? 'destructive' : 'secondary'}
            className={cn(
              'ml-auto',
              !hasErrors && 'bg-warning/20 text-warning border-warning/30'
            )}
          >
            {totalIssues}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {alerts.map((alert, index) => (
          <motion.button
            key={alert.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15, delay: index * 0.05 }}
            onClick={() => navigate(alert.actionUrl)}
            className={cn(
              'flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left',
              'bg-card/60 backdrop-blur-sm border',
              alert.severity === 'error' 
                ? 'border-destructive/30 hover:border-destructive/50 text-destructive'
                : 'border-warning/30 hover:border-warning/50 text-warning'
            )}
          >
            <div className={cn(
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              alert.severity === 'error' 
                ? 'bg-destructive/10' 
                : 'bg-warning/10'
            )}>
              {getIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{alert.title}</p>
              <p className={cn(
                'text-xs',
                alert.severity === 'error' 
                  ? 'text-destructive/70' 
                  : 'text-warning/70'
              )}>
                {alert.subtitle}
              </p>
            </div>
            <motion.div
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </motion.div>
          </motion.button>
        ))}
      </CardContent>
    </Card>
  );
});
