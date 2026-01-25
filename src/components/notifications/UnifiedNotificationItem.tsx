import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  Bell, Check, Trash2, ChevronRight, ChevronDown,
  CreditCard, Cake, Trophy, Dumbbell, TrendingDown, 
  AlertTriangle, Clock, Gift, MessageSquare, Medal, 
  Target, Stethoscope, Utensils, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export type NotificationPriority = 'urgent' | 'important' | 'info';

export interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  client_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  priority: NotificationPriority;
  isAggregated?: boolean;
  aggregatedCount?: number;
  aggregatedItems?: UnifiedNotification[];
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  low_credit: CreditCard,
  negative_credit: CreditCard,
  birthday: Cake,
  milestone_100: Trophy,
  milestone_500: Trophy,
  milestone_1000: Trophy,
  incomplete_training: Dumbbell,
  feedback_received: MessageSquare,
  feedback_red_flag: AlertTriangle,
  feedback_trend_alert: TrendingDown,
  feedback_pending: MessageSquare,
  client_anniversary: Gift,
  pr_achieved: Medal,
  pr_created: Medal,
  pr_updated: Target,
  package_low: CreditCard,
  package_expiring: Clock,
  inactivity_warning: AlertTriangle,
  training_streak: Trophy,
  diagnostic_completed: Stethoscope,
  pre_diagnostic_completed: Stethoscope,
  nutrition_entry_added: Utensils,
  nutrition_inactive: AlertTriangle,
  client_weight_added: Scale,
  client_workout_logged: Dumbbell,
};

const PRIORITY_STYLES: Record<NotificationPriority, { bg: string; border: string; icon: string; badge: string }> = {
  urgent: {
    bg: 'bg-destructive/5',
    border: 'border-destructive/30',
    icon: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  important: {
    bg: 'bg-warning/5',
    border: 'border-warning/30',
    icon: 'text-warning',
    badge: 'bg-warning text-warning-foreground',
  },
  info: {
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    icon: 'text-primary',
    badge: 'bg-primary/10 text-primary',
  },
};

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Dnes';
  if (isYesterday(date)) return 'Včera';
  return formatDistanceToNow(date, { addSuffix: true, locale: cs });
}

interface UnifiedNotificationItemProps {
  notification: UnifiedNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
  enableSwipe?: boolean;
}

export function UnifiedNotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClick,
  enableSwipe = true,
}: UnifiedNotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['hsl(var(--destructive))', 'transparent', 'hsl(var(--success))']
  );
  const leftOpacity = useTransform(x, [0, 40, 100], [0, 0.5, 1]);
  const rightOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);

  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const styles = PRIORITY_STYLES[notification.priority];

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      setIsDragging(false);
      const threshold = 80;
      if (info.offset.x > threshold) {
        // Swipe right = mark as read
        if (!notification.is_read) {
          onMarkRead(notification.id);
        }
      } else if (info.offset.x < -threshold) {
        // Swipe left = delete
        onDelete(notification.id);
      }
    },
    [notification.id, notification.is_read, onMarkRead, onDelete]
  );

  const displayMessage = notification.message.replace(/\s*ID:\s*[a-f0-9-]+/i, '');

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe Background */}
      {enableSwipe && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-between px-4 rounded-xl"
          style={{ background }}
        >
          <motion.div style={{ opacity: leftOpacity }} className="text-white flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">Přečteno</span>
          </motion.div>
          <motion.div style={{ opacity: rightOpacity }} className="text-white flex items-center gap-2">
            <span className="text-sm font-medium">Smazat</span>
            <Trash2 className="w-5 h-5" />
          </motion.div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        drag={enableSwipe ? "x" : false}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => {
          if (isDragging) return;
          if (notification.isAggregated) {
            setIsExpanded(!isExpanded);
          } else {
            onClick?.();
          }
        }}
        className={cn(
          'relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer',
          'hover:shadow-sm active:scale-[0.99]',
          notification.is_read 
            ? 'bg-background border-border' 
            : cn(styles.bg, styles.border)
        )}
      >
        {/* Icon */}
        <div className={cn(
          'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
          notification.is_read ? 'bg-muted' : styles.bg,
          notification.is_read ? 'text-muted-foreground' : styles.icon
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight line-clamp-1">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {displayMessage}
              </p>
            </div>

            {notification.isAggregated && notification.aggregatedCount && (
              <Badge className={cn('text-[10px] shrink-0', styles.badge)}>
                {notification.aggregatedCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              {getDateLabel(notification.created_at)}
            </p>

            {/* Inline Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              {notification.isAggregated && (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expanded Aggregated Items */}
      {notification.isAggregated && isExpanded && notification.aggregatedItems && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3"
        >
          {notification.aggregatedItems.map((item) => (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg text-sm',
                item.is_read ? 'bg-background' : 'bg-muted/50'
              )}
            >
              <span className="flex-1 truncate">{item.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {getDateLabel(item.created_at)}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
