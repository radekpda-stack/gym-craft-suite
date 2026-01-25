import { useMemo } from 'react';
import { useNotifications, type Notification } from './useNotifications';
import { useSmartAlerts, type SmartAlert } from './useSmartAlerts';
import type { NotificationPriority, UnifiedNotification } from '@/components/notifications/UnifiedNotificationItem';

// Types that should be aggregated when there are 3+ of the same type
const AGGREGATABLE_TYPES = [
  'low_credit',
  'negative_credit',
  'incomplete_training',
  'birthday',
  'package_expiring',
  'inactivity_warning',
];

// Map notification types to priority levels
const TYPE_PRIORITY: Record<string, NotificationPriority> = {
  // Urgent (red)
  negative_credit: 'urgent',
  feedback_red_flag: 'urgent',
  inactivity_warning: 'urgent',
  
  // Important (orange)
  low_credit: 'important',
  package_expiring: 'important',
  package_low: 'important',
  incomplete_training: 'important',
  feedback_trend_alert: 'important',
  nutrition_inactive: 'important',
  
  // Info (blue) - lower priority alerts
  no_training_scheduled: 'info', // Demoted from default to explicitly info
  birthday: 'info',
  birthdays_this_month: 'info',
  client_anniversary: 'info',
  pr_achieved: 'info',
  pr_created: 'info',
  pr_updated: 'info',
  milestone_100: 'info',
  milestone_500: 'info',
  milestone_1000: 'info',
  training_streak: 'info',
  feedback_received: 'info',
  feedback_pending: 'info',
  diagnostic_completed: 'info',
  pre_diagnostic_completed: 'info',
  nutrition_entry_added: 'info',
  client_weight_added: 'info',
  client_workout_logged: 'info',
};

function getPriority(type: string): NotificationPriority {
  return TYPE_PRIORITY[type] || 'info';
}

function convertNotification(notification: Notification): UnifiedNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    created_at: notification.created_at,
    client_id: notification.client_id,
    entity_type: notification.entity_type,
    entity_id: notification.entity_id,
    priority: getPriority(notification.type),
  };
}

function convertSmartAlert(alert: SmartAlert): UnifiedNotification {
  return {
    id: alert.id,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    is_read: false, // Smart alerts are always "unread"
    created_at: alert.createdAt.toISOString(),
    client_id: alert.clientId,
    priority: alert.severity === 'warning' ? 'important' : alert.severity === 'success' ? 'info' : 'info',
  };
}

function aggregateNotifications(notifications: UnifiedNotification[]): UnifiedNotification[] {
  const typeGroups = new Map<string, UnifiedNotification[]>();
  const standalone: UnifiedNotification[] = [];

  // Group by type
  notifications.forEach((notification) => {
    if (AGGREGATABLE_TYPES.includes(notification.type)) {
      const existing = typeGroups.get(notification.type) || [];
      existing.push(notification);
      typeGroups.set(notification.type, existing);
    } else {
      standalone.push(notification);
    }
  });

  const aggregated: UnifiedNotification[] = [];

  // Create aggregated notifications for groups >= 3
  typeGroups.forEach((group, type) => {
    if (group.length >= 3) {
      // Find the most recent one for the aggregated entry
      const sorted = [...group].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      const unreadCount = group.filter((n) => !n.is_read).length;

      const aggregatedNotification: UnifiedNotification = {
        ...latest,
        id: `aggregated-${type}`,
        title: getAggregatedTitle(type, group.length),
        message: getAggregatedMessage(type, group),
        is_read: unreadCount === 0,
        isAggregated: true,
        aggregatedCount: group.length,
        aggregatedItems: sorted,
      };

      aggregated.push(aggregatedNotification);
    } else {
      // Less than 3, keep as standalone
      standalone.push(...group);
    }
  });

  return [...aggregated, ...standalone];
}

function getAggregatedTitle(type: string, count: number): string {
  const titles: Record<string, string> = {
    low_credit: `${count} klientů má nízký kredit`,
    negative_credit: `${count} klientů má záporný kredit`,
    incomplete_training: `${count} tréninků čeká na dokončení`,
    birthday: `${count} narozenin tento měsíc`,
    package_expiring: `${count} balíčků brzy expiruje`,
    inactivity_warning: `${count} klientů dlouho netrénuje`,
  };
  return titles[type] || `${count} notifikací`;
}

function getAggregatedMessage(type: string, notifications: UnifiedNotification[]): string {
  const names = notifications
    .slice(0, 3)
    .map((n) => n.title.split(':')[0] || n.title)
    .join(', ');
  
  const remaining = notifications.length - 3;
  
  if (remaining > 0) {
    return `${names} a ${remaining} dalších`;
  }
  return names;
}

export interface AggregatedNotificationsResult {
  urgent: UnifiedNotification[];
  important: UnifiedNotification[];
  info: UnifiedNotification[];
  all: UnifiedNotification[];
  unreadCount: number;
  isLoading: boolean;
}

export function useAggregatedNotifications(): AggregatedNotificationsResult {
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { data: smartAlerts = [], isLoading: alertsLoading } = useSmartAlerts();

  const result = useMemo(() => {
    // Convert and merge all notifications
    const dbNotifications = notifications.map(convertNotification);
    const alertNotifications = smartAlerts.map(convertSmartAlert);
    
    // Merge, avoiding duplicates (smart alerts with similar titles)
    const merged = [...dbNotifications];
    alertNotifications.forEach((alert) => {
      const isDuplicate = merged.some(
        (n) => n.type === alert.type && n.client_id === alert.client_id
      );
      if (!isDuplicate) {
        merged.push(alert);
      }
    });

    // Aggregate similar notifications
    const aggregated = aggregateNotifications(merged);

    // Sort by priority and recency
    const sorted = aggregated.sort((a, b) => {
      const priorityOrder: Record<NotificationPriority, number> = { 
        urgent: 0, 
        important: 1, 
        info: 2 
      };
      
      // First by read status (unread first)
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      
      // Then by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Then by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Split by priority
    const urgent = sorted.filter((n) => n.priority === 'urgent' && !n.is_read);
    const important = sorted.filter((n) => n.priority === 'important' && !n.is_read);
    const info = sorted.filter((n) => n.priority === 'info' || n.is_read);

    const unreadCount = sorted.filter((n) => !n.is_read).length;

    return {
      urgent,
      important,
      info,
      all: sorted,
      unreadCount,
    };
  }, [notifications, smartAlerts]);

  return {
    ...result,
    isLoading: notificationsLoading || alertsLoading,
  };
}
