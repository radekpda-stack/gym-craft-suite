import { useState, useMemo } from "react";
import { Bell, Check, Trash2, CreditCard, Cake, Trophy, Dumbbell, TrendingDown, AlertTriangle, Clock, Gift, MessageSquare, User, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import { useTrainerConversations, useMarkMessagesAsRead, useMarkAllMessagesAsRead } from "@/hooks/useChatMessages";
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { FeedbackDetailDialog } from "@/components/feedback/FeedbackDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingFeedback } from "@/hooks/useTrainingFeedback";
import { NotificationSettingsDialog } from "./NotificationSettingsDialog";

const notificationIcons: Record<string, typeof Bell> = {
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
  client_anniversary: Gift,
  pr_achieved: Trophy,
  package_low: CreditCard,
  package_expiring: Clock,
  inactivity_warning: AlertTriangle,
  training_streak: Trophy,
};

const notificationColors: Record<string, string> = {
  low_credit: "text-warning",
  negative_credit: "text-destructive",
  birthday: "text-primary",
  milestone_100: "text-success",
  milestone_500: "text-success",
  milestone_1000: "text-success",
  incomplete_training: "text-warning",
  feedback_received: "text-green-500",
  feedback_red_flag: "text-destructive",
  feedback_trend_alert: "text-orange-500",
  client_anniversary: "text-amber-500",
  pr_achieved: "text-warning",
  package_low: "text-warning",
  package_expiring: "text-orange-500",
  inactivity_warning: "text-destructive",
  training_streak: "text-success",
};

// Category definitions for grouping
const NOTIFICATION_CATEGORIES = {
  messages: {
    label: "Zprávy",
    icon: MessageSquare,
    color: "text-primary",
    types: [] as string[], // Handled separately
  },
  feedback: {
    label: "Feedback",
    icon: MessageSquare,
    color: "text-green-500",
    types: ["feedback_received", "feedback_red_flag", "feedback_trend_alert"],
  },
  trainings: {
    label: "Tréninky",
    icon: Dumbbell,
    color: "text-orange-500",
    types: ["incomplete_training", "pr_achieved", "training_streak"],
  },
  packages: {
    label: "Balíčky & finance",
    icon: CreditCard,
    color: "text-warning",
    types: ["low_credit", "negative_credit", "package_low", "package_expiring"],
  },
  clients: {
    label: "Klienti",
    icon: User,
    color: "text-blue-500",
    types: ["birthday", "client_anniversary", "inactivity_warning"],
  },
  achievements: {
    label: "Úspěchy",
    icon: Trophy,
    color: "text-success",
    types: ["milestone_100", "milestone_500", "milestone_1000"],
  },
};

function extractTrainingId(message: string): string | null {
  const match = message.match(/ID: ([a-f0-9-]+)/);
  return match ? match[1] : null;
}

interface NotificationCenterProps {
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function NotificationCenter({ onOpenChange, children }: NotificationCenterProps = {}) {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  
  const { data: conversations = [] } = useTrainerConversations();
  const markMessagesRead = useMarkMessagesAsRead();
  const markAllMessagesRead = useMarkAllMessagesAsRead();
  const unreadConversations = conversations.filter(c => c.unreadCount > 0);
  const totalUnread = unreadCount + unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [feedbackMeta, setFeedbackMeta] = useState<{ clientName?: string; trainingDate?: string }>({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["messages"]));

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    onOpenChange?.(open);
  };

  // Group notifications by category
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = {};
    
    Object.keys(NOTIFICATION_CATEGORIES).forEach(key => {
      if (key !== "messages") {
        groups[key] = [];
      }
    });
    groups.other = [];

    notifications.forEach(notification => {
      let placed = false;
      for (const [key, category] of Object.entries(NOTIFICATION_CATEGORIES)) {
        if (key !== "messages" && category.types.includes(notification.type)) {
          groups[key].push(notification);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groups.other.push(notification);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [notifications]);

  // Group notifications by date for display
  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Dnes";
    if (isYesterday(date)) return "Včera";
    return formatDistanceToNow(date, { addSuffix: true, locale: cs });
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle chat notification click - navigate to client with chat open and mark as read
  const handleChatClick = (clientId: string, conversationId: string) => {
    markMessagesRead.mutate({ conversationId });
    setSheetOpen(false);
    navigate(`/clients/${clientId}?tab=chat`);
  };

  // Mark all notifications AND messages as read
  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
    if (unreadConversations.length > 0) {
      markAllMessagesRead.mutate();
    }
  };

  const handleFeedbackNotificationClick = async (notification: typeof notifications[0]) => {
    const trainingId = notification.entity_type === 'training' ? notification.entity_id : null;
    
    if (!trainingId) {
      setSheetOpen(false);
      navigate('/feedback-overview');
      return;
    }

    setLoadingFeedback(true);

    try {
      const { data: feedback, error: feedbackError } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('training_session_id', trainingId)
        .maybeSingle();

      if (feedbackError) throw feedbackError;

      if (feedback) {
        const { data: training } = await supabase
          .from('training_sessions')
          .select('date, client_id')
          .eq('id', trainingId)
          .maybeSingle();

        let clientName = 'Neznámý klient';
        if (training?.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', training.client_id)
            .maybeSingle();
          clientName = client?.name || clientName;
        }

        setSelectedFeedback(feedback as TrainingFeedback);
        setFeedbackMeta({ clientName, trainingDate: training?.date });
        setFeedbackDialogOpen(true);
      } else {
        setSheetOpen(false);
        navigate(`/trainings/${trainingId}`);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      setSheetOpen(false);
      navigate(`/trainings/${trainingId}`);
    } finally {
      setLoadingFeedback(false);
    }

    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
  };

  const renderNotificationItem = (notification: typeof notifications[0]) => {
    const Icon = notificationIcons[notification.type] || Bell;
    const colorClass = notificationColors[notification.type] || "text-foreground";
    const isFeedbackNotification = ['feedback_received', 'feedback_red_flag', 'feedback_trend_alert'].includes(notification.type);
    const trainingId = notification.type === 'incomplete_training' 
      ? extractTrainingId(notification.message) 
      : notification.entity_type === 'training' ? notification.entity_id : null;
    const clientId = notification.client_id || 
      (notification.entity_type === 'client' ? notification.entity_id : null);

    const linkTo = isFeedbackNotification 
      ? null
      : trainingId 
        ? `/trainings/${trainingId}`
        : clientId 
          ? `/clients/${clientId}`
          : null;

    const displayMessage = notification.message.replace(/\s*ID:\s*[a-f0-9-]+/i, '');

    const handleClick = () => {
      if (isFeedbackNotification) {
        handleFeedbackNotificationClick(notification);
      } else if (linkTo) {
        if (!notification.is_read) {
          markRead.mutate(notification.id);
        }
        setSheetOpen(false);
        navigate(linkTo);
      }
    };

    return (
      <div
        key={notification.id}
        onClick={linkTo || isFeedbackNotification ? handleClick : undefined}
        className={cn(
          "flex items-start gap-3 p-3 rounded-xl border transition-colors",
          (linkTo || isFeedbackNotification) && "cursor-pointer hover:border-primary/40",
          notification.is_read 
            ? "bg-background border-border" 
            : "bg-secondary/50 border-primary/20"
        )}
      >
        <div className={cn("mt-0.5 shrink-0", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{displayMessage}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {getDateLabel(notification.created_at)}
          </p>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                markRead.mutate(notification.id);
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification.mutate(notification.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          {children || (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {totalUnread > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-destructive text-destructive-foreground text-xs"
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </Badge>
              )}
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between shrink-0">
            <SheetTitle className="text-lg">Notifikace</SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllRead.isPending || markAllMessagesRead.isPending}
                  className="text-xs h-8"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Vše přečteno
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Unread Messages Section */}
              {unreadConversations.length > 0 && (
                <Collapsible open={expandedCategories.has("messages")} onOpenChange={() => toggleCategory("messages")}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Zprávy</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadConversations.length} nepřečtených konverzací
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">
                        {unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                      </Badge>
                      {expandedCategories.has("messages") ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {unreadConversations.map((conv) => (
                      <div
                        key={conv.conversationId}
                        onClick={() => handleChatClick(conv.clientId, conv.conversationId)}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-secondary/50 border-primary/20 hover:border-primary/40 cursor-pointer transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {conv.clientName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{conv.clientName}</p>
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {conv.unreadCount}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {conv.lastMessage}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {getDateLabel(conv.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Grouped Notifications */}
              {Object.entries(groupedNotifications).map(([categoryKey, categoryNotifications]) => {
                const category = NOTIFICATION_CATEGORIES[categoryKey as keyof typeof NOTIFICATION_CATEGORIES];
                const CategoryIcon = category?.icon || Bell;
                const unreadInCategory = categoryNotifications.filter(n => !n.is_read).length;
                const categoryLabel = category?.label || "Ostatní";
                const categoryColor = category?.color || "text-muted-foreground";

                return (
                  <Collapsible 
                    key={categoryKey} 
                    open={expandedCategories.has(categoryKey)} 
                    onOpenChange={() => toggleCategory(categoryKey)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", 
                          categoryColor.replace("text-", "bg-") + "/10"
                        )}>
                          <CategoryIcon className={cn("w-4 h-4", categoryColor)} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{categoryLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {categoryNotifications.length} {categoryNotifications.length === 1 ? "notifikace" : "notifikací"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadInCategory > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {unreadInCategory} nové
                          </Badge>
                        )}
                        {expandedCategories.has(categoryKey) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {categoryNotifications.map(renderNotificationItem)}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Empty State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : notifications.length === 0 && unreadConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-4 opacity-30" />
                  <p className="font-medium">Žádné notifikace</p>
                  <p className="text-sm">Vše je vyřízeno</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={feedbackDialogOpen}
        onOpenChange={(open) => {
          setFeedbackDialogOpen(open);
          if (!open) {
            setSelectedFeedback(null);
            setFeedbackMeta({});
          }
        }}
        clientName={feedbackMeta.clientName}
        trainingDate={feedbackMeta.trainingDate}
      />

      <NotificationSettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </>
  );
}
