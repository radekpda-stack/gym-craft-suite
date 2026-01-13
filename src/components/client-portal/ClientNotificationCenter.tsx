import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  ClipboardList,
  Trophy,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useClientPortalNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  ClientPortalNotification,
} from "@/hooks/useClientPortalNotifications";

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  feedback_reminder: ClipboardList,
  message: MessageSquare,
  trainer_pr_challenge: Trophy,
  beat_trainer: Trophy,
  broadcast: MessageSquare,
  credentials_change_required: KeyRound,
  default: Bell,
};

interface NotificationItemProps {
  notification: ClientPortalNotification;
  onMarkRead: (id: string) => void;
  onAction?: (notification: ClientPortalNotification) => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onAction,
}: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "p-3 border-b border-border last:border-b-0 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            notification.type === "feedback_reminder"
              ? "bg-primary/20 text-primary"
              : notification.type === "trainer_pr_challenge"
              ? "bg-warning/20 text-warning"
              : notification.type === "beat_trainer"
              ? "bg-success/20 text-success"
              : notification.type === "broadcast"
              ? "bg-accent/20 text-accent"
              : notification.type === "credentials_change_required"
              ? "bg-warning/20 text-warning"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium truncate",
                !notification.is_read && "text-foreground",
                notification.is_read && "text-muted-foreground"
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Označit jako přečtené"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: cs,
              })}
            </span>
            {notification.type === "feedback_reminder" &&
              !notification.action_completed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => onAction?.(notification)}
                >
                  Vyplnit
                </Button>
              )}
            {notification.type === "broadcast" && notification.action_url && (
              <a
                href={notification.action_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Zobrazit →
              </a>
            )}
            {notification.type === "credentials_change_required" &&
              !notification.action_completed && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs bg-warning/10 border-warning/30 hover:bg-warning/20 text-warning"
                  onClick={() => onAction?.(notification)}
                >
                  Nastavit
                </Button>
              )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ClientNotificationCenterProps {
  onFeedbackAction?: (trainingSessionId: string) => void;
}

export function ClientNotificationCenter({
  onFeedbackAction,
}: ClientNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useClientPortalNotifications();
  const unreadCount = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleAction = (notification: ClientPortalNotification) => {
    if (
      notification.type === "feedback_reminder" &&
      notification.metadata?.training_session_id
    ) {
      onFeedbackAction?.(notification.metadata.training_session_id);
      setIsOpen(false);
    } else if (notification.type === "credentials_change_required") {
      // Navigate to settings page with credentials section
      const basePath = window.location.pathname.startsWith('/zona') ? '/zona' : '/client';
      navigate(`${basePath}/settings`);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifikace"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifikace</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" />
              Označit vše
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Načítám...
            </div>
          ) : notifications && notifications.length > 0 ? (
            <AnimatePresence>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Žádné notifikace
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
