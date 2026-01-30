import { useState, useMemo, useCallback } from "react";
import { Bell, Check, MessageSquare, ChevronDown, ChevronRight, Search, X, Utensils, FileText, PartyPopper, Scale } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import { useTrainerConversations, useMarkMessagesAsRead, useMarkAllMessagesAsRead } from "@/hooks/useChatMessages";
import { useAggregatedNotifications, type NotificationCategory, type UnifiedNotification } from "@/hooks/useAggregatedNotifications";
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { FeedbackDetailDialog } from "@/components/feedback/FeedbackDetailDialog";
import { ProfileUpdateDetailDialog } from "./ProfileUpdateDetailDialog";
import { NutritionEntryDetailDialog } from "./NutritionEntryDetailDialog";
import { WorkoutLogDetailDialog } from "./WorkoutLogDetailDialog";
import { BirthdayDetailDialog } from "./BirthdayDetailDialog";
import { AnniversaryDetailDialog } from "./AnniversaryDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingFeedback } from "@/hooks/useTrainingFeedback";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { UnifiedNotificationItem } from "./UnifiedNotificationItem";
import { InlineNotificationSettings } from "./InlineNotificationSettings";
import { motion, AnimatePresence } from "framer-motion";

// Category section config - NEW 3-category structure
const CATEGORY_SECTIONS: Record<NotificationCategory, {
  label: string;
  icon: typeof Bell;
  color: string;
  bgColor: string;
  emoji: string;
}> = {
  activity: {
    label: "Klientská aktivita",
    icon: Utensils,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    emoji: "🍎",
  },
  forms: {
    label: "Zpětná vazba & Formuláře",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    emoji: "📝",
  },
  events: {
    label: "Důležité události",
    icon: PartyPopper,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    emoji: "🎉",
  },
};

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Dnes";
  if (isYesterday(date)) return "Včera";
  return formatDistanceToNow(date, { addSuffix: true, locale: cs });
}

interface NotificationCenterProps {
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function NotificationCenter({ onOpenChange, children }: NotificationCenterProps = {}) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  
  const { data: conversations = [] } = useTrainerConversations();
  const markMessagesRead = useMarkMessagesAsRead();
  const markAllMessagesRead = useMarkAllMessagesAsRead();
  const unreadConversations = conversations.filter(c => c.unreadCount > 0);
  
  const { activity, forms, events, all, unreadCount, isLoading } = useAggregatedNotifications();
  
  const totalUnread = unreadCount + unreadConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleMarkRead = useCallback((id: string) => {
    if (!id.startsWith('aggregated-')) {
      markRead.mutate(id);
    }
  }, [markRead]);

  const handleDelete = useCallback((id: string) => {
    if (!id.startsWith('aggregated-')) {
      deleteNotification.mutate(id);
    }
  }, [deleteNotification]);

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [feedbackMeta, setFeedbackMeta] = useState<{ clientName?: string; trainingDate?: string }>({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [profileUpdateDialogOpen, setProfileUpdateDialogOpen] = useState(false);
  const [selectedProfileNotification, setSelectedProfileNotification] = useState<UnifiedNotification | null>(null);
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [selectedNutritionNotification, setSelectedNutritionNotification] = useState<UnifiedNotification | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutNotification, setSelectedWorkoutNotification] = useState<UnifiedNotification | null>(null);
  const [birthdayDialogOpen, setBirthdayDialogOpen] = useState(false);
  const [selectedBirthdayNotification, setSelectedBirthdayNotification] = useState<UnifiedNotification | null>(null);
  const [anniversaryDialogOpen, setAnniversaryDialogOpen] = useState(false);
  const [selectedAnniversaryNotification, setSelectedAnniversaryNotification] = useState<UnifiedNotification | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // All sections expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["messages", "activity", "forms", "events"]));

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    onOpenChange?.(open);
    if (!open) {
      setSearchQuery("");
      setSettingsExpanded(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Filter notifications by search query
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) {
      return { activity, forms, events };
    }
    
    const query = searchQuery.toLowerCase();
    const filter = (notifications: UnifiedNotification[]) =>
      notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
      );

    return {
      activity: filter(activity),
      forms: filter(forms),
      events: filter(events),
    };
  }, [activity, forms, events, searchQuery]);

  // Handle chat notification click
  const handleChatClick = (clientId: string, conversationId: string) => {
    markMessagesRead.mutate({ conversationId });
    setSheetOpen(false);
    navigate(`/clients/${clientId}?tab=chat`);
  };

  // Mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
    if (unreadConversations.length > 0) {
      markAllMessagesRead.mutate();
    }
  }, [unreadCount, markAllRead, unreadConversations.length, markAllMessagesRead]);

  // Handle notification click with improved navigation - every notification is actionable
  const handleNotificationClick = async (notification: UnifiedNotification) => {
    const isFeedbackNotification = ['feedback_received', 'feedback_red_flag'].includes(notification.type);
    const isNutritionNotification = notification.type === 'nutrition_entry_added' || notification.type === 'client_nutrition_started';
    const isProfileUpdateNotification = notification.type === 'client_profile_updated';
    const isWorkoutLogNotification = notification.type === 'client_workout_logged';
    const isBirthdayNotification = notification.type === 'birthday';
    const isAnniversaryNotification = notification.type === 'client_anniversary';
    const isWeightNotification = notification.type === 'client_weight_added';
    const isDiagnosticNotification = ['diagnostic_completed', 'pre_diagnostic_completed'].includes(notification.type);
    
    const trainingId = notification.entity_type === 'training' ? notification.entity_id : null;
    const clientId = notification.client_id || (notification.entity_type === 'client' ? notification.entity_id : null);

    // Mark as read first
    if (!notification.is_read && !notification.id.startsWith('aggregated-')) {
      markRead.mutate(notification.id);
    }

    // Birthday → BirthdayDetailDialog
    if (isBirthdayNotification && clientId) {
      setSelectedBirthdayNotification(notification);
      setBirthdayDialogOpen(true);
      setSheetOpen(false);
      return;
    }

    // Anniversary → AnniversaryDetailDialog
    if (isAnniversaryNotification && clientId) {
      setSelectedAnniversaryNotification(notification);
      setAnniversaryDialogOpen(true);
      setSheetOpen(false);
      return;
    }

    // Weight → Navigate to client progress tab
    if (isWeightNotification && clientId) {
      setSheetOpen(false);
      navigate(`/clients/${clientId}?tab=progress`);
      return;
    }

    // Diagnostic → Navigate to client profile
    if (isDiagnosticNotification && clientId) {
      setSheetOpen(false);
      navigate(`/clients/${clientId}?tab=profile`);
      return;
    }

    // Nutrition notifications → Navigate to nutrition diary
    if (isNutritionNotification && clientId) {
      setSheetOpen(false);
      navigate(`/nutrition/client/${clientId}`);
      return;
    }

    // Profile update notifications → Open detail dialog
    if (isProfileUpdateNotification) {
      setSelectedProfileNotification(notification);
      setProfileUpdateDialogOpen(true);
      setSheetOpen(false);
      return;
    }

    // Workout log notifications → Open workout detail dialog
    if (isWorkoutLogNotification && notification.entity_id) {
      setSelectedWorkoutNotification(notification);
      setWorkoutDialogOpen(true);
      setSheetOpen(false);
      return;
    }

    // Feedback notifications → Open feedback dialog
    if (isFeedbackNotification && trainingId) {
      setLoadingFeedback(true);
      try {
        const { data: feedbacks } = await supabase
          .from('training_feedback')
          .select('*')
          .eq('training_session_id', trainingId)
          .order('created_at', { ascending: false })
          .limit(1);

        const feedback = feedbacks?.[0];
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
          setSheetOpen(false);
        } else {
          setSheetOpen(false);
          navigate(`/trainings/${trainingId}`);
        }
      } catch (error) {
        console.error('[NotificationCenter] Error loading feedback:', error);
        setSheetOpen(false);
        navigate(`/trainings/${trainingId}`);
      } finally {
        setLoadingFeedback(false);
      }
      return;
    }
    
    // Training entity → Navigate to training detail
    if (trainingId) {
      setSheetOpen(false);
      navigate(`/trainings/${trainingId}`);
      return;
    }
    
    // Fallback: Navigate to client profile
    if (clientId) {
      setSheetOpen(false);
      navigate(`/clients/${clientId}`);
    }
  };

  // Handle nutrition item click (for aggregated items)
  const handleNutritionItemClick = useCallback((item: UnifiedNotification) => {
    // Mark as read
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    // Open nutrition detail dialog
    setSelectedNutritionNotification(item);
    setNutritionDialogOpen(true);
  }, [markRead]);

  // Handle workout item click (for aggregated items)
  const handleWorkoutItemClick = useCallback((item: UnifiedNotification) => {
    // Mark as read
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    // Open workout detail dialog
    setSelectedWorkoutNotification(item);
    setWorkoutDialogOpen(true);
  }, [markRead]);

  const hasAnyNotifications = all.length > 0 || unreadConversations.length > 0;

  const renderCategorySection = (
    category: NotificationCategory,
    notifications: UnifiedNotification[]
  ) => {
    if (notifications.length === 0) return null;

    const config = CATEGORY_SECTIONS[category];
    const Icon = config.icon;
    const unreadInSection = notifications.filter(n => !n.is_read).length;

    return (
      <Collapsible
        key={category}
        open={expandedSections.has(category)}
        onOpenChange={() => toggleSection(category)}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgColor)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {notifications.length} {notifications.length === 1 ? "položka" : "položek"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadInSection > 0 && (
              <Badge 
                variant="secondary" 
                className="text-[10px]"
              >
                {unreadInSection} nové
              </Badge>
            )}
            {expandedSections.has(category) ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                layout
              >
                <UnifiedNotificationItem
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  onClick={() => handleNotificationClick(notification)}
                  onItemClick={
                    category === 'activity' 
                      ? (item: UnifiedNotification) => {
                          // Route to correct handler based on notification type
                          if (item.type === 'client_workout_logged') {
                            handleWorkoutItemClick(item);
                          } else {
                            handleNutritionItemClick(item);
                          }
                        }
                      : undefined
                  }
                  enableSwipe={true}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
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
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col z-[80]">
          {/* Header */}
          <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between shrink-0 pr-12">
            <SheetTitle className="text-lg">Notifikace</SheetTitle>
            <div className="flex items-center gap-1">
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

          {/* Search Bar */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat v notifikacích..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !hasAnyNotifications ? (
                <NotificationEmptyState onOpenSettings={() => setSettingsExpanded(true)} />
              ) : (
                <>
                  {/* Unread Messages Section */}
                  {unreadConversations.length > 0 && (
                    <Collapsible 
                      open={expandedSections.has("messages")} 
                      onOpenChange={() => toggleSection("messages")}
                    >
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
                          {expandedSections.has("messages") ? (
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
                            className="flex items-start gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20 hover:border-primary/40 cursor-pointer transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                              {conv.clientName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{conv.clientName}</p>
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
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

                  {/* Category Sections - New order: Activity → Forms → Events */}
                  {renderCategorySection('activity', filteredNotifications.activity)}
                  {renderCategorySection('forms', filteredNotifications.forms)}
                  {renderCategorySection('events', filteredNotifications.events)}

                  {/* No results for search */}
                  {searchQuery && 
                   filteredNotifications.activity.length === 0 && 
                   filteredNotifications.forms.length === 0 &&
                   filteredNotifications.events.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Žádné výsledky pro "{searchQuery}"</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Inline Settings */}
          <InlineNotificationSettings
            isExpanded={settingsExpanded}
            onToggle={() => setSettingsExpanded(!settingsExpanded)}
          />
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

      <ProfileUpdateDetailDialog
        open={profileUpdateDialogOpen}
        onOpenChange={(open) => {
          setProfileUpdateDialogOpen(open);
          if (!open) {
            setSelectedProfileNotification(null);
          }
        }}
        notification={selectedProfileNotification}
      />

      <NutritionEntryDetailDialog
        open={nutritionDialogOpen}
        onOpenChange={(open) => {
          setNutritionDialogOpen(open);
          if (!open) {
            setSelectedNutritionNotification(null);
          }
        }}
        notification={selectedNutritionNotification}
      />

      <WorkoutLogDetailDialog
        open={workoutDialogOpen}
        onOpenChange={(open) => {
          setWorkoutDialogOpen(open);
          if (!open) {
            setSelectedWorkoutNotification(null);
          }
        }}
        notification={selectedWorkoutNotification}
      />

      <BirthdayDetailDialog
        open={birthdayDialogOpen}
        onOpenChange={(open) => {
          setBirthdayDialogOpen(open);
          if (!open) {
            setSelectedBirthdayNotification(null);
          }
        }}
        notification={selectedBirthdayNotification}
      />

      <AnniversaryDetailDialog
        open={anniversaryDialogOpen}
        onOpenChange={(open) => {
          setAnniversaryDialogOpen(open);
          if (!open) {
            setSelectedAnniversaryNotification(null);
          }
        }}
        notification={selectedAnniversaryNotification}
      />
    </>
  );
}
