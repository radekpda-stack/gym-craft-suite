import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Bell, Check, MessageSquare, ChevronDown, ChevronRight, Search, X, Utensils, FileText, PartyPopper } from "lucide-react";
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

// Category section config
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

// Detect touch device
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Pending action types
type PendingActionType = 
  | { type: 'nutrition'; notification: UnifiedNotification }
  | { type: 'workout'; notification: UnifiedNotification }
  | { type: 'birthday'; notification: UnifiedNotification }
  | { type: 'anniversary'; notification: UnifiedNotification }
  | { type: 'profile'; notification: UnifiedNotification }
  | { type: 'feedback'; notification: UnifiedNotification }
  | { type: 'navigate'; path: string };

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

  // Touch device detection
  const isTouch = useMemo(() => isTouchDevice(), []);

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

  // Dialog states
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["messages", "activity", "forms", "events"]));

  // Pending action system - action executes AFTER sheet closes
  const pendingActionRef = useRef<PendingActionType | null>(null);

  // Load feedback data and open dialog - defined as useCallback so it's stable
  const loadAndOpenFeedback = useCallback(async (notification: UnifiedNotification) => {
    const trainingId = notification.entity_type === 'training' ? notification.entity_id : null;
    
    if (!trainingId) {
      if (notification.client_id) {
        navigate(`/clients/${notification.client_id}?tab=history`);
      }
      return;
    }
    
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
      } else {
        navigate(`/trainings/${trainingId}`);
      }
    } catch (error) {
      console.error('[NotificationCenter] Error loading feedback:', error);
      navigate(`/trainings/${trainingId}`);
    } finally {
      setLoadingFeedback(false);
    }
  }, [navigate]);

  // Execute pending action after sheet closes
  const flushPendingAction = useCallback(async () => {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;

    // Small delay to ensure sheet animation completes
    await new Promise(resolve => setTimeout(resolve, 50));

    switch (action.type) {
      case 'nutrition':
        setSelectedNutritionNotification(action.notification);
        setNutritionDialogOpen(true);
        break;
      case 'workout':
        setSelectedWorkoutNotification(action.notification);
        setWorkoutDialogOpen(true);
        break;
      case 'birthday':
        setSelectedBirthdayNotification(action.notification);
        setBirthdayDialogOpen(true);
        break;
      case 'anniversary':
        setSelectedAnniversaryNotification(action.notification);
        setAnniversaryDialogOpen(true);
        break;
      case 'profile':
        setSelectedProfileNotification(action.notification);
        setProfileUpdateDialogOpen(true);
        break;
      case 'feedback':
        await loadAndOpenFeedback(action.notification);
        break;
      case 'navigate':
        navigate(action.path);
        break;
    }
  }, [navigate, loadAndOpenFeedback]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    onOpenChange?.(open);
    if (!open) {
      setSearchQuery("");
      setSettingsExpanded(false);
      // Execute pending action after sheet closes
      requestAnimationFrame(() => {
        flushPendingAction();
      });
    }
  }, [onOpenChange, flushPendingAction]);

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

  // Handle chat notification click - direct navigation (no dialog)
  const handleChatClick = (clientId: string, conversationId: string) => {
    markMessagesRead.mutate({ conversationId });
    pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}?tab=chat` };
    setSheetOpen(false);
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

  // Unified click handler - sets pending action and closes sheet
  const handleNotificationClick = useCallback((notification: UnifiedNotification) => {
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
      pendingActionRef.current = { type: 'birthday', notification };
      setSheetOpen(false);
      return;
    }

    // Anniversary → AnniversaryDetailDialog
    if (isAnniversaryNotification && clientId) {
      pendingActionRef.current = { type: 'anniversary', notification };
      setSheetOpen(false);
      return;
    }

    // Weight → Navigate to client progress tab
    if (isWeightNotification && clientId) {
      pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}?tab=progress` };
      setSheetOpen(false);
      return;
    }

    // Diagnostic → Navigate to client profile
    if (isDiagnosticNotification && clientId) {
      pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}?tab=profile` };
      setSheetOpen(false);
      return;
    }

    // Nutrition notifications → Open nutrition dialog
    if (isNutritionNotification && clientId) {
      pendingActionRef.current = { type: 'nutrition', notification };
      setSheetOpen(false);
      return;
    }

    // Profile update notifications → Open detail dialog
    if (isProfileUpdateNotification) {
      pendingActionRef.current = { type: 'profile', notification };
      setSheetOpen(false);
      return;
    }

    // Workout log notifications → Open workout detail dialog
    if (isWorkoutLogNotification && notification.entity_id) {
      pendingActionRef.current = { type: 'workout', notification };
      setSheetOpen(false);
      return;
    }

    // Feedback notifications → Open feedback dialog
    if (isFeedbackNotification && trainingId) {
      pendingActionRef.current = { type: 'feedback', notification };
      setSheetOpen(false);
      return;
    }
    
    // Training entity → Navigate to training detail
    if (trainingId) {
      pendingActionRef.current = { type: 'navigate', path: `/trainings/${trainingId}` };
      setSheetOpen(false);
      return;
    }
    
    // Fallback: Navigate to client profile
    if (clientId) {
      pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}` };
      setSheetOpen(false);
    }
  }, [markRead]);

  // Handle nutrition item click (for aggregated items)
  const handleNutritionItemClick = useCallback((item: UnifiedNotification) => {
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    pendingActionRef.current = { type: 'nutrition', notification: item };
    setSheetOpen(false);
  }, [markRead]);

  // Handle workout item click (for aggregated items)
  const handleWorkoutItemClick = useCallback((item: UnifiedNotification) => {
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    pendingActionRef.current = { type: 'workout', notification: item };
    setSheetOpen(false);
  }, [markRead]);

  // Handle feedback item click (for aggregated items)
  const handleFeedbackItemClick = useCallback((item: UnifiedNotification) => {
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    pendingActionRef.current = { type: 'feedback', notification: item };
    setSheetOpen(false);
  }, [markRead]);

  // Handle event item click (birthdays, anniversaries)
  const handleEventItemClick = useCallback((item: UnifiedNotification) => {
    if (!item.is_read && !item.id.startsWith('aggregated-')) {
      markRead.mutate(item.id);
    }
    
    if (item.type === 'birthday') {
      pendingActionRef.current = { type: 'birthday', notification: item };
    } else if (item.type === 'client_anniversary') {
      pendingActionRef.current = { type: 'anniversary', notification: item };
    }
    setSheetOpen(false);
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
                  onItemClick={(item: UnifiedNotification) => {
                    if (category === 'activity') {
                      if (item.type === 'client_workout_logged') {
                        handleWorkoutItemClick(item);
                      } else {
                        handleNutritionItemClick(item);
                      }
                    } else if (category === 'forms') {
                      if (item.type === 'feedback_received' || item.type === 'feedback_red_flag') {
                        handleFeedbackItemClick(item);
                      } else {
                        handleNotificationClick(item);
                      }
                    } else if (category === 'events') {
                      handleEventItemClick(item);
                    }
                  }}
                  enableSwipe={!isTouch}
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
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden z-[80]">
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
          <div className="px-4 py-2 border-b shrink-0">
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

          {/* Content - flex-1 with min-h-0 for proper overflow */}
          <ScrollArea className="flex-1 min-h-0">
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

                  {/* Category Sections */}
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
          <div className="shrink-0 pb-safe">
            <InlineNotificationSettings
              isExpanded={settingsExpanded}
              onToggle={() => setSettingsExpanded(!settingsExpanded)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs with higher z-index to appear above everything */}
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
