import { useMemo } from 'react';
import { useNotifications, type Notification } from './useNotifications';

// Notification categories - simplified for trainer workflow
export type NotificationCategory = 'activity' | 'forms' | 'events';

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
  metadata?: Record<string, unknown> | null;
  category: NotificationCategory;
  isAggregated?: boolean;
  aggregatedCount?: number;
  aggregatedItems?: UnifiedNotification[];
}

// Map notification types to NEW categories
const TYPE_CATEGORY: Record<string, NotificationCategory> = {
  // Klientská aktivita (priorita 1) - co klient aktivně dělá
  nutrition_entry_added: 'activity',
  client_nutrition_started: 'activity',
  client_workout_logged: 'activity',
  client_profile_updated: 'activity',
  client_weight_added: 'activity',
  
  // Zpětná vazba & Formuláře (priorita 2)
  feedback_received: 'forms',
  feedback_red_flag: 'forms',
  diagnostic_completed: 'forms',
  pre_diagnostic_completed: 'forms',
  
  // Důležité události (priorita 3)
  birthday: 'events',
  client_anniversary: 'events',
};

// Types EXCLUDED from notification center (dashboard only)
const EXCLUDED_TYPES = [
  'low_credit',
  'negative_credit',
  'package_low',
  'package_expiring',
  'inactivity_warning',
  'milestone_100',
  'milestone_500',
  'milestone_1000',
  'training_streak',
  'incomplete_training',
  'nutrition_inactive',
  'pr_achieved',
  'pr_created',
  'pr_updated',
  'feedback_pending',
  'feedback_trend_alert',
];

// Types that should be aggregated when there are 3+ of the same type
const AGGREGATABLE_TYPES = [
  'client_workout_logged',
  'nutrition_entry_added',
  'feedback_received',
];

function getCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY[type] || 'activity';
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
    metadata: notification.metadata,
    category: getCategory(notification.type),
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
    client_workout_logged: `${count} klientů cvičilo`,
    nutrition_entry_added: `${count} záznamů stravy`,
    feedback_received: `${count} nových zpětných vazeb`,
    pr_achieved: `${count} nových osobních rekordů`,
  };
  return titles[type] || `${count} notifikací`;
}

function getAggregatedMessage(_type: string, notifications: UnifiedNotification[]): string {
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

export interface CategorizedNotificationsResult {
  activity: UnifiedNotification[];
  forms: UnifiedNotification[];
  events: UnifiedNotification[];
  all: UnifiedNotification[];
  unreadCount: number;
  isLoading: boolean;
}

export function useAggregatedNotifications(): CategorizedNotificationsResult {
  // Only use database notifications - Smart Alerts are on dashboard
  const { data: notifications = [], isLoading } = useNotifications();

  const result = useMemo(() => {
    // Filter out excluded types AND filter by allowed types only
    const dbNotifications = notifications
      .filter(n => !EXCLUDED_TYPES.includes(n.type) && TYPE_CATEGORY[n.type])
      .map(convertNotification);

    // Aggregate similar notifications
    const aggregated = aggregateNotifications(dbNotifications);

    // Sort by recency (newest first), unread first
    const sorted = aggregated.sort((a, b) => {
      // First by read status (unread first)
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      
      // Then by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Split by NEW categories
    const activity = sorted.filter((n) => n.category === 'activity');
    const forms = sorted.filter((n) => n.category === 'forms');
    const events = sorted.filter((n) => n.category === 'events');

    const unreadCount = sorted.filter((n) => !n.is_read).length;

    return {
      activity,
      forms,
      events,
      all: sorted,
      unreadCount,
    };
  }, [notifications]);

  return {
    ...result,
    isLoading,
  };
}
