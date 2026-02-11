import { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  Bell, Check, Trash2, ChevronRight, ChevronDown,
  CreditCard, Cake, Trophy, Dumbbell, TrendingDown, 
  AlertTriangle, Clock, Gift, MessageSquare, Medal, 
  Target, Stethoscope, Utensils, Scale, Bike, 
  Footprints, PersonStanding, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday, parseISO, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { NotificationCategory, UnifiedNotification } from '@/hooks/useAggregatedNotifications';

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
  client_profile_updated: PersonStanding,
  client_nutrition_started: Sparkles,
};

const WORKOUT_TYPE_ICONS: Record<string, { icon: typeof Dumbbell; emoji: string }> = {
  gym: { icon: Dumbbell, emoji: '💪' },
  strength: { icon: Dumbbell, emoji: '💪' },
  cardio: { icon: Footprints, emoji: '🏃' },
  run: { icon: Footprints, emoji: '🏃' },
  running: { icon: Footprints, emoji: '🏃' },
  cycling: { icon: Bike, emoji: '🚴' },
  bike: { icon: Bike, emoji: '🚴' },
  yoga: { icon: PersonStanding, emoji: '🧘' },
  stretching: { icon: PersonStanding, emoji: '🧘' },
  other: { icon: Dumbbell, emoji: '🏋️' },
};

// Category accent colors using semantic tokens
const CATEGORY_ACCENT: Record<NotificationCategory, {
  dot: string;
  iconBg: string;
  iconColor: string;
  unreadBg: string;
  unreadBorder: string;
}> = {
  activity: {
    dot: 'bg-success',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    unreadBg: 'bg-success/5',
    unreadBorder: 'border-success/15',
  },
  forms: {
    dot: 'bg-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    unreadBg: 'bg-primary/5',
    unreadBorder: 'border-primary/15',
  },
  events: {
    dot: 'bg-warning',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    unreadBg: 'bg-warning/5',
    unreadBorder: 'border-warning/15',
  },
};

function getSmartDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, 'HH:mm', { locale: cs });
  if (isYesterday(date)) return 'včera';
  return formatDistanceToNow(date, { addSuffix: true, locale: cs });
}

function getClientNameFromMessage(message: string, _type: string): string {
  const workoutMatch = message.match(/^(.+?)\s+si zapsal/);
  if (workoutMatch) return workoutMatch[1];
  const feedbackMatch = message.match(/^(.+?):\s+💪/);
  if (feedbackMatch) return feedbackMatch[1];
  const nutritionMatch = message.match(/^(.+?)\s+přidal/);
  if (nutritionMatch) return nutritionMatch[1];
  const genericMatch = message.match(/^(.+?)(?::|–|-)/);
  if (genericMatch) return genericMatch[1].trim();
  return message.split(':')[0] || message;
}

function getWorkoutTypeInfo(notification: UnifiedNotification) {
  const metadata = notification.metadata as Record<string, unknown> | null;
  const workoutType = (metadata?.workout_type as string) || 'other';
  const typeInfo = WORKOUT_TYPE_ICONS[workoutType.toLowerCase()] || WORKOUT_TYPE_ICONS.other;
  return { ...typeInfo, label: workoutType };
}

function getFeedbackPreview(notification: UnifiedNotification): string | null {
  const metadata = notification.metadata as Record<string, unknown> | null;
  if (metadata?.muscle_soreness !== undefined && metadata?.body_feeling !== undefined) {
    return `Svalovka ${metadata.muscle_soreness} · Pocit ${metadata.body_feeling}`;
  }
  const match = notification.message.match(/💪\s*Svalovka[:\s]+(\d+)[^📊]*📊[^:]+[:\s]+(\d+)/);
  if (match) return `Svalovka ${match[1]} · Pocit ${match[2]}`;
  return null;
}

interface UnifiedNotificationItemProps {
  notification: UnifiedNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
  onItemClick?: (item: UnifiedNotification) => void;
  enableSwipe?: boolean;
}

export function UnifiedNotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClick,
  onItemClick,
  enableSwipe = true,
}: UnifiedNotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const x = useMotionValue(0);
  const background = useTransform(
    x, [-100, 0, 100],
    ['hsl(var(--destructive))', 'transparent', 'hsl(var(--success))']
  );
  const leftOpacity = useTransform(x, [0, 40, 100], [0, 0.5, 1]);
  const rightOpacity = useTransform(x, [-100, -40, 0], [1, 0.5, 0]);

  const draggedRef = useRef(false);

  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const accent = CATEGORY_ACCENT[notification.category];

  const handleDragStart = useCallback(() => { draggedRef.current = true; }, []);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      if (!notification.is_read) onMarkRead(notification.id);
    } else if (info.offset.x < -threshold) {
      onDelete(notification.id);
    }
    // Keep draggedRef true briefly so the subsequent onClick is suppressed
    setTimeout(() => { draggedRef.current = false; }, 300);
  }, [notification.id, notification.is_read, onMarkRead, onDelete]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Suppress click if it was actually a drag/swipe
    if (draggedRef.current) return;
    if (notification.isAggregated) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  }, [notification.isAggregated, isExpanded, onClick]);

  const handleSubItemClick = useCallback((e: React.MouseEvent, item: UnifiedNotification) => {
    e.stopPropagation();
    e.preventDefault();
    onItemClick?.(item);
  }, [onItemClick]);

  const displayMessage = notification.message.replace(/\s*ID:\s*[a-f0-9-]+/i, '');

  return (
    <div className="relative overflow-hidden rounded-2xl mb-1.5">
      {/* Swipe Background */}
      {enableSwipe && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-between px-5 rounded-2xl"
          style={{ background }}
        >
          <motion.div style={{ opacity: leftOpacity }} className="text-white flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-xs font-semibold">Přečteno</span>
          </motion.div>
          <motion.div style={{ opacity: rightOpacity }} className="text-white flex items-center gap-2">
            <span className="text-xs font-semibold">Smazat</span>
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
        onClick={handleClick}
        className={cn(
          'relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
          'active:scale-[0.98]',
          notification.is_read 
            ? 'bg-background border-border/50 hover:bg-muted/40' 
            : cn(accent.unreadBg, accent.unreadBorder, 'hover:shadow-sm')
        )}
      >
        {/* Icon with accent */}
        <div className="relative shrink-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            notification.is_read ? 'bg-muted' : accent.iconBg
          )}>
            <Icon className={cn(
              'w-[18px] h-[18px]',
              notification.is_read ? 'text-muted-foreground' : accent.iconColor
            )} />
          </div>
          {/* Unread dot */}
          {!notification.is_read && (
            <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background', accent.dot)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm leading-snug line-clamp-1',
                notification.is_read ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground'
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {displayMessage}
              </p>
            </div>

            {notification.isAggregated && notification.aggregatedCount && (
              <span className={cn(
                'inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-lg text-[10px] font-bold shrink-0',
                notification.is_read 
                  ? 'bg-muted text-muted-foreground' 
                  : cn(accent.iconBg, accent.iconColor)
              )}>
                {notification.aggregatedCount}
              </span>
            )}
          </div>

          {/* Footer: time + actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground font-medium">
              {getSmartDate(notification.created_at)}
            </span>

            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {!notification.is_read && !notification.id.startsWith('aggregated-') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                  onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              {!notification.id.startsWith('aggregated-') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              {notification.isAggregated && (
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )} />
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
          transition={{ duration: 0.2 }}
          className="ml-5 mt-1 space-y-1 border-l-2 border-muted-foreground/15 pl-4 pb-1"
        >
          {notification.aggregatedItems.map((item) => {
            const isWorkout = item.type === 'client_workout_logged';
            const isFeedback = item.type === 'feedback_received' || item.type === 'feedback_red_flag';
            const clientName = getClientNameFromMessage(item.message, item.type);
            const workoutInfo = isWorkout ? getWorkoutTypeInfo(item) : null;
            const feedbackPreview = isFeedback ? getFeedbackPreview(item) : null;
            
            return (
              <button
                key={item.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleSubItemClick(e, item)}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-xl text-sm cursor-pointer w-full text-left',
                  'hover:bg-muted/70 active:bg-muted transition-colors group',
                  !item.is_read && 'bg-muted/30'
                )}
              >
                {isWorkout && workoutInfo && (
                  <span className="text-base shrink-0">{workoutInfo.emoji}</span>
                )}
                {isFeedback && <span className="text-base shrink-0">📬</span>}
                {!isWorkout && !isFeedback && <span className="text-base shrink-0">📝</span>}
                
                <span className={cn(
                  "flex-1 truncate",
                  !item.is_read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                )}>
                  {clientName}
                </span>
                
                {isWorkout && workoutInfo && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0">
                    {workoutInfo.label}
                  </span>
                )}
                {isFeedback && feedbackPreview && (
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                    {feedbackPreview}
                  </span>
                )}
                
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {getSmartDate(item.created_at)}
                </span>
                
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-foreground transition-colors" />
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export type { UnifiedNotification, NotificationCategory };
