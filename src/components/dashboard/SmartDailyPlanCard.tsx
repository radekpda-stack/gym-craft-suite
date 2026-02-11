import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Brain, Clock, AlertCircle, CreditCard, MessageSquare, 
  ChevronRight, CheckCircle2, Sparkles 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSmartDailyPlan, type DailyPlanItem } from '@/hooks/useSmartDailyPlan';

const typeConfig: Record<string, { icon: typeof Brain; color: string }> = {
  'training-prep': { icon: Clock, color: 'text-primary' },
  'unpaid': { icon: CreditCard, color: 'text-destructive' },
  'low-credit': { icon: AlertCircle, color: 'text-warning' },
  'feedback-missing': { icon: MessageSquare, color: 'text-muted-foreground' },
};

const PlanItem = memo(function PlanItem({ 
  item, index 
}: { 
  item: DailyPlanItem; 
  index: number; 
}) {
  const navigate = useNavigate();
  const config = typeConfig[item.type] || typeConfig['training-prep'];
  const Icon = config.icon;
  const isCompleted = item.subtitle.startsWith('✅');

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      onClick={() => item.actionUrl && navigate(item.actionUrl)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
        'hover:bg-secondary/50 active:scale-[0.98]',
        isCompleted && 'opacity-50'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
        item.severity === 'error' ? 'bg-destructive/10' :
        item.severity === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
      )}>
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : (
          <Icon className={cn('w-4 h-4', config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {item.time && !isCompleted && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
              {item.time}
            </span>
          )}
          <span className={cn(
            'font-medium truncate text-sm',
            isCompleted && 'line-through text-muted-foreground'
          )}>
            {item.title}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.subtitle}
        </p>
        {item.detail && !isCompleted && (
          <p className={cn(
            'text-xs mt-1 font-medium',
            item.severity === 'error' ? 'text-destructive' :
            item.severity === 'warning' ? 'text-warning' : 'text-muted-foreground'
          )}>
            {item.detail}
          </p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
    </motion.button>
  );
});

export const SmartDailyPlanCard = memo(function SmartDailyPlanCard() {
  const { items, isLoading } = useSmartDailyPlan();

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 justify-center text-success">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Vše vyřízeno — žádné úkoly na dnes</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Split into trainings and actions
  const trainings = items.filter(i => i.type === 'training-prep');
  const actions = items.filter(i => i.type !== 'training-prep');

  return (
    <Card variant="floating" className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1 rounded-lg bg-primary/10">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          Tvůj plán na dnes
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {items.length} {items.length === 1 ? 'položka' : items.length < 5 ? 'položky' : 'položek'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {/* Today's trainings with context */}
        {trainings.map((item, i) => (
          <PlanItem key={item.id} item={item} index={i} />
        ))}
        
        {/* Separator if both exist */}
        {trainings.length > 0 && actions.length > 0 && (
          <div className="h-px bg-border/50 mx-3 my-1" />
        )}

        {/* Action items */}
        {actions.map((item, i) => (
          <PlanItem key={item.id} item={item} index={trainings.length + i} />
        ))}
      </CardContent>
    </Card>
  );
});
