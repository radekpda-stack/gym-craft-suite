import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PartyPopper, Calendar, User, Dumbbell, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInYears } from "date-fns";
import { cs } from "date-fns/locale";
import { useClient } from "@/hooks/useClients";
import { useClientTrainingCounts } from "@/hooks/useClientTrainingCounts";
import type { UnifiedNotification } from "@/hooks/useAggregatedNotifications";

interface AnniversaryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

export function AnniversaryDetailDialog({
  open,
  onOpenChange,
  notification,
}: AnniversaryDetailDialogProps) {
  const navigate = useNavigate();
  const clientId = notification?.client_id;
  const { data: client } = useClient(clientId || undefined);
  const { data: trainingCounts = {} } = useClientTrainingCounts();

  const startDate = client?.training_start_date || client?.created_at;
  const years = startDate 
    ? differenceInYears(new Date(), parseISO(startDate))
    : null;
  
  const formattedStartDate = startDate 
    ? format(parseISO(startDate), "d. MMMM yyyy", { locale: cs })
    : null;

  const clientTrainings = clientId ? trainingCounts[clientId]?.count || 0 : 0;

  const handleViewProfile = () => {
    if (clientId) {
      onOpenChange(false);
      navigate(`/clients/${clientId}`);
    }
  };

  const handleViewProgress = () => {
    if (clientId) {
      onOpenChange(false);
      navigate(`/clients/${clientId}?tab=progress`);
    }
  };

  if (!notification) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-amber-500" />
            Výročí spolupráce
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900/50">
            <Avatar className="h-14 w-14 border-2 border-amber-200 dark:border-amber-800">
              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-lg">
                {client?.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{client?.name || "Klient"}</p>
              {years && years > 0 && (
                <p className="text-sm text-muted-foreground">
                  {years} {years === 1 ? "rok" : years < 5 ? "roky" : "let"} společného tréninku! 🎉
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
                  <p className="text-xs text-muted-foreground">Začátek</p>
                  <p className="text-sm font-medium">{formattedStartDate}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Celkem tréninků</p>
                <p className="text-sm font-medium">{clientTrainings}</p>
              </div>
            </div>
          </div>

          {/* Progress shortcut */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewProgress}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Zobrazit pokroky klienta
          </Button>

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
