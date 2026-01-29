import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Cake, Calendar, MessageSquare, User, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseISO, differenceInYears, format } from "date-fns";
import { cs } from "date-fns/locale";
import { useClient } from "@/hooks/useClients";
import { useClientTrainingCounts } from "@/hooks/useClientTrainingCounts";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage } from "@/hooks/useChatMessages";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedNotification } from "@/hooks/useAggregatedNotifications";

interface BirthdayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

export function BirthdayDetailDialog({
  open,
  onOpenChange,
  notification,
}: BirthdayDetailDialogProps) {
  const navigate = useNavigate();
  const clientId = notification?.client_id;
  const { data: client } = useClient(clientId || undefined);
  const { data: trainingCounts = {} } = useClientTrainingCounts();
  const [message, setMessage] = useState("");
  const [showMessageInput, setShowMessageInput] = useState(false);
  const sendMessage = useSendMessage();

  const age = client?.birth_date 
    ? differenceInYears(new Date(), parseISO(client.birth_date))
    : null;

  const startDate = client?.training_start_date || client?.created_at;
  const formattedStartDate = startDate 
    ? format(parseISO(startDate), "d. MMMM yyyy", { locale: cs })
    : null;

  const clientTrainings = clientId ? trainingCounts[clientId]?.count || 0 : 0;

  const handleSendWish = async () => {
    if (!clientId || !message.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      await sendMessage.mutateAsync({
        clientId,
        trainerId: user.id,
        content: message.trim(),
        senderType: 'trainer',
      });
      toast.success("Přání bylo odesláno");
      setMessage("");
      setShowMessageInput(false);
      onOpenChange(false);
      navigate(`/clients/${clientId}?tab=chat`);
    } catch (error) {
      toast.error("Nepodařilo se odeslat zprávu");
    }
  };

  const handleViewProfile = () => {
    if (clientId) {
      onOpenChange(false);
      navigate(`/clients/${clientId}`);
    }
  };

  if (!notification) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-pink-500" />
            Narozeniny
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border border-pink-100 dark:border-pink-900/50">
            <Avatar className="h-14 w-14 border-2 border-pink-200 dark:border-pink-800">
              <AvatarFallback className="bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 text-lg">
                {client?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{client?.name || "Klient"}</p>
              {age && (
                <p className="text-sm text-muted-foreground">
                  Dnes slaví {age}. narozeniny! 🎉
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {formattedStartDate && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Začátek spolupráce</p>
                  <p className="text-sm font-medium">{formattedStartDate}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Počet tréninků</p>
                <p className="text-sm font-medium">{clientTrainings}</p>
              </div>
            </div>
          </div>

          {/* Message input */}
          {showMessageInput ? (
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Napište přání k narozeninám..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMessageInput(false)}
                  className="flex-1"
                >
                  Zrušit
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendWish}
                  disabled={!message.trim() || sendMessage.isPending}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Odeslat
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowMessageInput(true)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Poslat přání přes chat
            </Button>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Zavřít
            </Button>
            <Button onClick={handleViewProfile} className="flex-1">
              <User className="w-4 h-4 mr-2" />
              Zobrazit profil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
