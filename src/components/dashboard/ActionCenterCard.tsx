import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap,
  CreditCard, 
  Clock, 
  UserPlus,
  Bell,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { UnpaidTrainingsDialog } from './UnpaidTrainingsDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ActionItem {
  id: string;
  type: 'unpaid' | 'debt' | 'unassigned' | 'followup';
  icon: React.ElementType;
  title: string;
  subtitle: string;
  count: number;
  severity: 'warning' | 'error' | 'info';
  action?: () => void;
  actionLabel?: string;
}

interface ActionCenterCardProps {
  unpaidCount: number;
  unpaidAmount: number;
  debtCount: number;
  debtAmount: number;
  unassignedCount?: number;
  followupCount?: number;
  isLoading?: boolean;
}

export const ActionCenterCard = memo(function ActionCenterCard({
  unpaidCount,
  unpaidAmount,
  debtCount,
  debtAmount,
  unassignedCount = 0,
  followupCount = 0,
  isLoading,
}: ActionCenterCardProps) {
  const navigate = useNavigate();
  const [showUnpaidDialog, setShowUnpaidDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

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

  const actions: ActionItem[] = [];

  if (unpaidCount > 0) {
    actions.push({
      id: 'unpaid',
      type: 'unpaid',
      icon: Clock,
      title: `${unpaidCount} neuhrazených tréninků`,
      subtitle: formatCurrency(unpaidAmount),
      count: unpaidCount,
      severity: 'warning',
      action: () => setShowUnpaidDialog(true),
      actionLabel: 'Uhradit',
    });
  }

  if (debtCount > 0) {
    actions.push({
      id: 'debt',
      type: 'debt',
      icon: CreditCard,
      title: `${debtCount} klientů s dluhem`,
      subtitle: formatCurrency(debtAmount),
      count: debtCount,
      severity: 'error',
      action: () => navigate('/clients?filter=debt'),
      actionLabel: 'Zobrazit',
    });
  }

  if (unassignedCount > 0) {
    actions.push({
      id: 'unassigned',
      type: 'unassigned',
      icon: UserPlus,
      title: `${unassignedCount} tréninků k přiřazení`,
      subtitle: 'Čekají na přiřazení klienta',
      count: unassignedCount,
      severity: 'warning',
      action: () => navigate('/calendar'),
      actionLabel: 'Přiřadit',
    });
  }

  if (followupCount > 0) {
    actions.push({
      id: 'followup',
      type: 'followup',
      icon: Bell,
      title: `${followupCount} připomenutí`,
      subtitle: 'Aktivní připomenutí k vyřízení',
      count: followupCount,
      severity: 'info',
      action: () => navigate('/pripomenuti'),
      actionLabel: 'Zobrazit',
    });
  }

  if (actions.length === 0) {
    return null;
  }

  const totalCount = actions.reduce((sum, a) => sum + a.count, 0);
  const hasErrors = actions.some(a => a.severity === 'error');

  const getSeverityStyles = (severity: ActionItem['severity']) => {
    switch (severity) {
      case 'error':
        return {
          border: 'border-destructive/30 hover:border-destructive/50',
          bg: 'bg-destructive/5',
          icon: 'bg-destructive/10 text-destructive',
          text: 'text-destructive',
          button: 'border-destructive/50 text-destructive hover:bg-destructive/10',
        };
      case 'warning':
        return {
          border: 'border-warning/30 hover:border-warning/50',
          bg: 'bg-warning/5',
          icon: 'bg-warning/10 text-warning',
          text: 'text-warning',
          button: 'border-warning/50 text-warning hover:bg-warning/10',
        };
      default:
        return {
          border: 'border-primary/30 hover:border-primary/50',
          bg: 'bg-primary/5',
          icon: 'bg-primary/10 text-primary',
          text: 'text-primary',
          button: 'border-primary/50 text-primary hover:bg-primary/10',
        };
    }
  };

  return (
    <>
      <Card variant="floating" className={cn(
        'overflow-hidden',
        hasErrors 
          ? 'ring-1 ring-destructive/40 shadow-[0_0_20px_hsl(0_84%_60%/0.1)]' 
          : 'ring-1 ring-warning/40 shadow-[0_0_20px_hsl(38_92%_50%/0.1)]'
      )}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-accent/30 transition-colors">
              <CardTitle className="flex items-center gap-2 text-base">
                <motion.div
                  animate={hasErrors ? { scale: [1, 1.1, 1] } : undefined}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className={cn(
                    'w-5 h-5',
                    hasErrors ? 'text-destructive' : 'text-warning'
                  )} />
                </motion.div>
                Vyžaduje akci
                <Badge 
                  variant={hasErrors ? 'destructive' : 'secondary'}
                  className={cn(
                    'ml-auto',
                    !hasErrors && 'bg-warning/20 text-warning border-warning/30'
                  )}
                >
                  {totalCount}
                </Badge>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-2 pb-4">
              <AnimatePresence mode="popLayout">
                {actions.map((action, index) => {
                  const styles = getSeverityStyles(action.severity);
                  const Icon = action.icon;
                  
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.15, delay: index * 0.05 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-all',
                        'bg-card/60 backdrop-blur-sm border',
                        styles.border,
                        styles.bg
                      )}
                    >
                      <div className={cn(
                        'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                        styles.icon
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium text-sm', styles.text)}>
                          {action.title}
                        </p>
                        <p className={cn('text-xs', styles.text, 'opacity-70')}>
                          {action.subtitle}
                        </p>
                      </div>
                      
                      {action.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn('shrink-0 h-8', styles.button)}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.action?.();
                          }}
                        >
                          {action.actionLabel}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      <UnpaidTrainingsDialog
        open={showUnpaidDialog}
        onOpenChange={setShowUnpaidDialog}
      />
    </>
  );
});
