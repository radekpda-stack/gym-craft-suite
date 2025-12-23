import { useState } from "react";
import { Bell, Check, Trash2, CreditCard, Cake, Trophy, X, Dumbbell, TrendingDown, AlertTriangle, Clock, Gift, MessageSquare } from "lucide-react";
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
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { FeedbackDetailDialog } from "@/components/feedback/FeedbackDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingFeedback } from "@/hooks/useTrainingFeedback";

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
  // reminder removed
  client_anniversary: Gift,
  // Smart notifications
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
  // reminder removed
  client_anniversary: "text-amber-500",
  // Smart notifications
  pr_achieved: "text-warning",
  package_low: "text-warning",
  package_expiring: "text-orange-500",
  inactivity_warning: "text-destructive",
  training_streak: "text-success",
};

// Extract training ID from notification message
function extractTrainingId(message: string): string | null {
  const match = message.match(/ID: ([a-f0-9-]+)/);
  return match ? match[1] : null;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [feedbackMeta, setFeedbackMeta] = useState<{ clientName?: string; trainingDate?: string }>({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Handle feedback notification click
  const handleFeedbackNotificationClick = async (notification: typeof notifications[0]) => {
    const trainingId = notification.entity_type === 'training' ? notification.entity_id : null;
    
    if (!trainingId) {
      // No training ID, just navigate to feedback overview
      setSheetOpen(false);
      navigate('/feedback-overview');
      return;
    }

    setLoadingFeedback(true);

    try {
      // Get feedback for this training
      const { data: feedback, error: feedbackError } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('training_session_id', trainingId)
        .maybeSingle();

      if (feedbackError) throw feedbackError;

      if (feedback) {
        // Get training date and client info
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
        setFeedbackMeta({
          clientName,
          trainingDate: training?.date,
        });
        setFeedbackDialogOpen(true);
      } else {
        // No feedback found, navigate to training detail
        setSheetOpen(false);
        navigate(`/trainings/${trainingId}`);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      // Fallback to training detail
      setSheetOpen(false);
      navigate(`/trainings/${trainingId}`);
    } finally {
      setLoadingFeedback(false);
    }

    // Mark as read
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-destructive text-destructive-foreground text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Notifikace</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Označit vše přečtené
              </Button>
            )}
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-50" />
                <p>Žádné notifikace</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const colorClass = notificationColors[notification.type] || "text-foreground";
                  const isFeedbackNotification = ['feedback_received', 'feedback_red_flag', 'feedback_trend_alert'].includes(notification.type);
                  const trainingId = notification.type === 'incomplete_training' 
                    ? extractTrainingId(notification.message) 
                    : notification.entity_type === 'training' ? notification.entity_id : null;
                  const clientId = notification.client_id || 
                    (notification.entity_type === 'client' ? notification.entity_id : null);

                  // Determine link destination - feedback notifications open dialog
                  const linkTo = isFeedbackNotification 
                    ? null  // Handled by click handler
                    : trainingId 
                      ? `/trainings/${trainingId}`
                      : clientId 
                        ? `/clients/${clientId}`
                        : null;

                  // Clean message (remove ID part for display)
                  const displayMessage = notification.message.replace(/\s*ID:\s*[a-f0-9-]+/i, '');

                  const NotificationContent = (
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {displayMessage}
                        </p>
                        {(linkTo || isFeedbackNotification) && (
                          <p className="text-xs text-primary mt-1 hover:underline">
                            {isFeedbackNotification 
                              ? "Zobrazit detail feedbacku →" 
                              : trainingId 
                                ? "Otevřít detail tréninku →" 
                                : "Otevřít kartu klienta →"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: cs,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead.mutate(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );

                  // Feedback notifications use button with dialog
                  if (isFeedbackNotification) {
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleFeedbackNotificationClick(notification)}
                        disabled={loadingFeedback}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-colors hover:border-primary/40",
                          notification.is_read 
                            ? "bg-background border-border" 
                            : "bg-secondary border-primary/20"
                        )}
                      >
                        {NotificationContent}
                      </button>
                    );
                  }

                  return linkTo ? (
                    <Link
                      key={notification.id}
                      to={linkTo}
                      className={cn(
                        "block p-4 rounded-xl border transition-colors hover:border-primary/40",
                        notification.is_read 
                          ? "bg-background border-border" 
                          : "bg-secondary border-primary/20"
                      )}
                      onClick={() => {
                        if (!notification.is_read) {
                          markRead.mutate(notification.id);
                        }
                        setSheetOpen(false);
                      }}
                    >
                      {NotificationContent}
                    </Link>
                  ) : (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        notification.is_read 
                          ? "bg-background border-border" 
                          : "bg-secondary border-primary/20"
                      )}
                    >
                      {NotificationContent}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Feedback Detail Dialog */}
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
    </>
  );
}
