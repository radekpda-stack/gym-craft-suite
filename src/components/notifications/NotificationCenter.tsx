import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Bell, Check, MessageSquare, Search, X, Filter, BellOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { WeightDetailDialog } from "./WeightDetailDialog";
import { DiagnosticDetailDialog } from "./DiagnosticDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingFeedback } from "@/hooks/useTrainingFeedback";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { UnifiedNotificationItem } from "./UnifiedNotificationItem";
import { motion, AnimatePresence } from "framer-motion";

// Tab definitions
const TABS = [
  { key: 'all' as const, label: 'Vše', icon: Bell },
  { key: 'activity' as const, label: 'Aktivita', emoji: '🍎' },
  { key: 'forms' as const, label: 'Formuláře', emoji: '📝' },
  { key: 'events' as const, label: 'Události', emoji: '🎉' },
  { key: 'messages' as const, label: 'Zprávy', icon: MessageSquare },
];

type TabKey = 'all' | NotificationCategory | 'messages';

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Dnes";
  if (isYesterday(date)) return "Včera";
  return formatDistanceToNow(date, { addSuffix: true, locale: cs });
}

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
  | { type: 'weight'; notification: UnifiedNotification }
  | { type: 'diagnostic'; notification: UnifiedNotification }
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
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [selectedWeightNotification, setSelectedWeightNotification] = useState<UnifiedNotification | null>(null);
  const [diagnosticDialogOpen, setDiagnosticDialogOpen] = useState(false);
  const [selectedDiagnosticNotification, setSelectedDiagnosticNotification] = useState<UnifiedNotification | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Pending action system
  const pendingActionRef = useRef<PendingActionType | null>(null);

  const loadAndOpenFeedback = useCallback(async (notification: UnifiedNotification) => {
    const trainingId = notification.entity_type === 'training' ? notification.entity_id : null;
    if (!trainingId) {
      if (notification.client_id) navigate(`/clients/${notification.client_id}?tab=history`);
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
            .from('clients').select('name').eq('id', training.client_id).maybeSingle();
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

  const flushPendingAction = useCallback(async () => {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    await new Promise(resolve => setTimeout(resolve, 50));
    switch (action.type) {
      case 'nutrition': setSelectedNutritionNotification(action.notification); setNutritionDialogOpen(true); break;
      case 'workout': setSelectedWorkoutNotification(action.notification); setWorkoutDialogOpen(true); break;
      case 'birthday': setSelectedBirthdayNotification(action.notification); setBirthdayDialogOpen(true); break;
      case 'anniversary': setSelectedAnniversaryNotification(action.notification); setAnniversaryDialogOpen(true); break;
      case 'profile': setSelectedProfileNotification(action.notification); setProfileUpdateDialogOpen(true); break;
      case 'feedback': await loadAndOpenFeedback(action.notification); break;
      case 'weight': setSelectedWeightNotification(action.notification); setWeightDialogOpen(true); break;
      case 'diagnostic': setSelectedDiagnosticNotification(action.notification); setDiagnosticDialogOpen(true); break;
      case 'navigate': navigate(action.path); break;
    }
  }, [navigate, loadAndOpenFeedback]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    onOpenChange?.(open);
    if (!open) {
      setSearchQuery("");
      setShowSearch(false);
      requestAnimationFrame(() => { flushPendingAction(); });
    }
  }, [onOpenChange, flushPendingAction]);

  // Safety net: flush pending action when sheet closes, even if onOpenChange doesn't fire
  useEffect(() => {
    if (!sheetOpen && pendingActionRef.current) {
      const timer = setTimeout(() => { flushPendingAction(); }, 100);
      return () => clearTimeout(timer);
    }
  }, [sheetOpen, flushPendingAction]);

  // Filter notifications by search query
  const filteredNotifications = useMemo(() => {
    const filterFn = (notifications: UnifiedNotification[]) => {
      if (!searchQuery.trim()) return notifications;
      const query = searchQuery.toLowerCase();
      return notifications.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    };
    return {
      activity: filterFn(activity),
      forms: filterFn(forms),
      events: filterFn(events),
      all: filterFn(all),
    };
  }, [activity, forms, events, all, searchQuery]);

  // Current view based on active tab
  const currentNotifications = useMemo(() => {
    switch (activeTab) {
      case 'activity': return filteredNotifications.activity;
      case 'forms': return filteredNotifications.forms;
      case 'events': return filteredNotifications.events;
      case 'messages': return []; // Messages rendered separately
      default: return filteredNotifications.all;
    }
  }, [activeTab, filteredNotifications]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: all.filter(n => !n.is_read).length + unreadConversations.reduce((s, c) => s + c.unreadCount, 0),
    activity: activity.filter(n => !n.is_read).length,
    forms: forms.filter(n => !n.is_read).length,
    events: events.filter(n => !n.is_read).length,
    messages: unreadConversations.reduce((s, c) => s + c.unreadCount, 0),
  }), [all, activity, forms, events, unreadConversations]);

  const handleChatClick = (clientId: string, conversationId: string) => {
    markMessagesRead.mutate({ conversationId });
    pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}?tab=chat` };
    setSheetOpen(false);
  };

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount > 0) markAllRead.mutate();
    if (unreadConversations.length > 0) markAllMessagesRead.mutate();
  }, [unreadCount, markAllRead, unreadConversations.length, markAllMessagesRead]);

  // Unified click handler
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

    if (!notification.is_read && !notification.id.startsWith('aggregated-')) {
      markRead.mutate(notification.id);
    }

    if (isBirthdayNotification && clientId) { pendingActionRef.current = { type: 'birthday', notification }; setSheetOpen(false); return; }
    if (isAnniversaryNotification && clientId) { pendingActionRef.current = { type: 'anniversary', notification }; setSheetOpen(false); return; }
    if (isWeightNotification && clientId) { pendingActionRef.current = { type: 'weight', notification }; setSheetOpen(false); return; }
    if (isDiagnosticNotification && clientId) { pendingActionRef.current = { type: 'diagnostic', notification }; setSheetOpen(false); return; }
    if (isNutritionNotification && clientId) { pendingActionRef.current = { type: 'nutrition', notification }; setSheetOpen(false); return; }
    if (isProfileUpdateNotification) { pendingActionRef.current = { type: 'profile', notification }; setSheetOpen(false); return; }
    if (isWorkoutLogNotification && notification.entity_id) { pendingActionRef.current = { type: 'workout', notification }; setSheetOpen(false); return; }
    if (isFeedbackNotification && trainingId) { pendingActionRef.current = { type: 'feedback', notification }; setSheetOpen(false); return; }
    if (trainingId) { pendingActionRef.current = { type: 'navigate', path: `/trainings/${trainingId}` }; setSheetOpen(false); return; }
    if (clientId) { pendingActionRef.current = { type: 'navigate', path: `/clients/${clientId}` }; setSheetOpen(false); }
  }, [markRead]);

  const handleItemClick = useCallback((item: UnifiedNotification) => {
    if (!item.is_read && !item.id.startsWith('aggregated-')) markRead.mutate(item.id);
    
    if (item.type === 'client_workout_logged') {
      pendingActionRef.current = { type: 'workout', notification: item };
    } else if (item.type === 'nutrition_entry_added' || item.type === 'client_nutrition_started') {
      pendingActionRef.current = { type: 'nutrition', notification: item };
    } else if (item.type === 'feedback_received' || item.type === 'feedback_red_flag') {
      pendingActionRef.current = { type: 'feedback', notification: item };
    } else if (item.type === 'birthday') {
      pendingActionRef.current = { type: 'birthday', notification: item };
    } else if (item.type === 'client_anniversary') {
      pendingActionRef.current = { type: 'anniversary', notification: item };
    } else {
      handleNotificationClick(item);
      return;
    }
    setSheetOpen(false);
  }, [markRead, handleNotificationClick]);

  const hasAnyNotifications = all.length > 0 || unreadConversations.length > 0;

  // Render message cards
  const renderMessages = () => (
    <div className="space-y-2">
      {unreadConversations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Žádné nepřečtené zprávy</p>
          <p className="text-xs mt-1 opacity-70">Všechny konverzace jsou aktuální</p>
        </div>
      ) : (
        unreadConversations.map((conv) => (
          <motion.div
            key={conv.conversationId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleChatClick(conv.clientId, conv.conversationId)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/15 hover:bg-primary/10 hover:border-primary/25 cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {conv.clientName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{conv.clientName}</p>
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                  {conv.unreadCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conv.lastMessage}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{getDateLabel(conv.lastMessageAt)}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          {children || (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-in zoom-in-50">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[440px] p-0 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden z-[80] gap-0">
          {/* Premium Header */}
          <div className="shrink-0 bg-gradient-to-b from-primary/8 to-transparent">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 pr-12">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Notifikace</h2>
                {totalUnread > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalUnread} nepřečtených
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="w-4 h-4" />
                </Button>
                {totalUnread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllRead.isPending || markAllMessagesRead.isPending}
                    className="text-xs h-8 rounded-full gap-1.5 text-primary hover:text-primary"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Vše přečteno
                  </Button>
                )}
              </div>
            </div>

            {/* Search bar - animated */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden px-5"
                >
                  <div className="relative pb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Hledat v notifikacích..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-9 text-sm rounded-xl bg-background/80"
                      autoFocus
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab Navigation - pill style */}
            <div className="px-5 pb-3">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {TABS.map((tab) => {
                  const count = tabCounts[tab.key];
                  const isActive = activeTab === tab.key;
                  // Hide messages tab if no conversations
                  if (tab.key === 'messages' && conversations.length === 0) return null;
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                        isActive
                          ? 'bg-foreground text-background shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {'emoji' in tab ? (
                        <span className="text-sm leading-none">{tab.emoji}</span>
                      ) : tab.icon ? (
                        <tab.icon className="w-3.5 h-3.5" />
                      ) : null}
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className={cn(
                          'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold',
                          isActive
                            ? 'bg-background/20 text-background'
                            : 'bg-primary/15 text-primary'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3 space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Načítám notifikace…</p>
                </div>
              ) : activeTab === 'messages' ? (
                renderMessages()
              ) : !hasAnyNotifications ? (
                <NotificationEmptyState />
              ) : currentNotifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  {searchQuery ? (
                    <>
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Žádné výsledky pro „{searchQuery}"</p>
                      <p className="text-xs mt-1 opacity-70">Zkuste jiný hledaný výraz</p>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Žádné notifikace v této kategorii</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Show unread messages in "all" tab */}
                  {activeTab === 'all' && unreadConversations.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zprávy</span>
                      </div>
                      {unreadConversations.slice(0, 2).map((conv) => (
                        <motion.div
                          key={conv.conversationId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleChatClick(conv.clientId, conv.conversationId)}
                          className="flex items-center gap-3 p-3 mb-1.5 rounded-2xl bg-primary/5 border border-primary/15 hover:bg-primary/10 cursor-pointer transition-all"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                            {conv.clientName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{conv.clientName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                          </div>
                          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                            {conv.unreadCount}
                          </span>
                        </motion.div>
                      ))}
                      {unreadConversations.length > 2 && (
                        <button
                          onClick={() => setActiveTab('messages')}
                          className="w-full text-xs text-primary font-medium py-1.5 hover:underline"
                        >
                          +{unreadConversations.length - 2} dalších zpráv
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notification items */}
                  <AnimatePresence mode="popLayout">
                    {currentNotifications.map((notification, i) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -80 }}
                        transition={{ delay: i * 0.03 }}
                        layout
                      >
                        <UnifiedNotificationItem
                          notification={notification}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                          onClick={() => handleNotificationClick(notification)}
                          onItemClick={handleItemClick}
                          enableSwipe={!isTouch}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={feedbackDialogOpen}
        onOpenChange={(open) => { setFeedbackDialogOpen(open); if (!open) { setSelectedFeedback(null); setFeedbackMeta({}); }}}
        clientName={feedbackMeta.clientName}
        trainingDate={feedbackMeta.trainingDate}
      />
      <ProfileUpdateDetailDialog
        open={profileUpdateDialogOpen}
        onOpenChange={(open) => { setProfileUpdateDialogOpen(open); if (!open) setSelectedProfileNotification(null); }}
        notification={selectedProfileNotification}
      />
      <NutritionEntryDetailDialog
        open={nutritionDialogOpen}
        onOpenChange={(open) => { setNutritionDialogOpen(open); if (!open) setSelectedNutritionNotification(null); }}
        notification={selectedNutritionNotification}
      />
      <WorkoutLogDetailDialog
        open={workoutDialogOpen}
        onOpenChange={(open) => { setWorkoutDialogOpen(open); if (!open) setSelectedWorkoutNotification(null); }}
        notification={selectedWorkoutNotification}
      />
      <BirthdayDetailDialog
        open={birthdayDialogOpen}
        onOpenChange={(open) => { setBirthdayDialogOpen(open); if (!open) setSelectedBirthdayNotification(null); }}
        notification={selectedBirthdayNotification}
      />
      <AnniversaryDetailDialog
        open={anniversaryDialogOpen}
        onOpenChange={(open) => { setAnniversaryDialogOpen(open); if (!open) setSelectedAnniversaryNotification(null); }}
        notification={selectedAnniversaryNotification}
      />
      <WeightDetailDialog
        open={weightDialogOpen}
        onOpenChange={(open) => { setWeightDialogOpen(open); if (!open) setSelectedWeightNotification(null); }}
        notification={selectedWeightNotification}
      />
      <DiagnosticDetailDialog
        open={diagnosticDialogOpen}
        onOpenChange={(open) => { setDiagnosticDialogOpen(open); if (!open) setSelectedDiagnosticNotification(null); }}
        notification={selectedDiagnosticNotification}
      />
    </>
  );
}
