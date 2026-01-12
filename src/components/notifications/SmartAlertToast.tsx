import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, TrendingUp, TrendingDown, Calendar, CreditCard, Cake, Trophy, Salad, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { SmartAlert } from '@/hooks/useSmartAlerts';

interface SmartAlertToastProps {
  alert: SmartAlert;
  onDismiss: () => void;
  duration?: number;
}

const ALERT_ICONS: Record<SmartAlert['type'], typeof Bell> = {
  no_training_scheduled: Calendar,
  low_credit: CreditCard,
  birthdays_this_month: Cake,
  profit_trend: TrendingUp,
  inactive_nutrition: Salad,
  new_badge: Trophy,
  client_milestone: Trophy,
};

const SEVERITY_STYLES: Record<SmartAlert['severity'], string> = {
  success: 'bg-success/10 border-success/30 text-success',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  info: 'bg-primary/10 border-primary/30 text-primary',
};

const SEVERITY_BG: Record<SmartAlert['severity'], string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-primary',
};

export function SmartAlertToast({ alert, onDismiss, duration = 8000 }: SmartAlertToastProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(Date.now());

  const Icon = alert.type === 'profit_trend' && (alert.value ?? 0) < 0 
    ? TrendingDown 
    : ALERT_ICONS[alert.type] || Bell;

  useEffect(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        onDismiss();
      } else {
        timerRef.current = setTimeout(updateProgress, 50);
      }
    };

    timerRef.current = setTimeout(updateProgress, 50);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onDismiss]);

  const handleClick = () => {
    if (alert.link) {
      navigate(alert.link);
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-lg',
        'w-full max-w-sm',
        SEVERITY_STYLES[alert.severity]
      )}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/20">
        <motion.div
          className={cn('h-full', SEVERITY_BG[alert.severity])}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>

      <div 
        className={cn(
          'flex items-start gap-3 p-4',
          alert.link && 'cursor-pointer hover:bg-background/5 transition-colors'
        )}
        onClick={handleClick}
      >
        {/* Icon */}
        <div className={cn(
          'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          SEVERITY_BG[alert.severity],
          'text-white'
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
          
          {alert.link && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-70 group-hover:opacity-100">
              <span>Zobrazit</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-6 w-6 rounded-full opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

interface SmartAlertContainerProps {
  alerts: SmartAlert[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export function SmartAlertContainer({ alerts, onDismiss, maxVisible = 3 }: SmartAlertContainerProps) {
  const visibleAlerts = alerts.slice(0, maxVisible);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <SmartAlertToast
              alert={alert}
              onDismiss={() => onDismiss(alert.id)}
            />
          </div>
        ))}
      </AnimatePresence>
      
      {alerts.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-center pointer-events-auto"
        >
          +{alerts.length - maxVisible} dalších upozornění
        </motion.div>
      )}
    </div>
  );
}
