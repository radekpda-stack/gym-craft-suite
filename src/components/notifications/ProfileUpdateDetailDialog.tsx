import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { 
  Mail, 
  Phone, 
  Calendar, 
  User, 
  Hand, 
  Briefcase, 
  Armchair, 
  Moon, 
  Brain, 
  Stethoscope, 
  Trophy, 
  Activity, 
  Target, 
  Pill, 
  Salad,
  UserCircle,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UnifiedNotification } from "@/hooks/useAggregatedNotifications";

interface ProfileChange {
  value: string | number | string[] | null;
}

interface ProfileUpdateMetadata {
  changes?: Record<string, ProfileChange>;
}

interface ProfileUpdateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
  clientName?: string;
}

// Field configuration with icons and labels
const FIELD_CONFIG: Record<string, { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: "Email" },
  telefon: { icon: Phone, label: "Telefon" },
  "datum narození": { icon: Calendar, label: "Datum narození" },
  pohlaví: { icon: User, label: "Pohlaví" },
  "dominantní ruka": { icon: Hand, label: "Dominantní ruka" },
  "typ práce": { icon: Briefcase, label: "Typ práce" },
  "hodiny vsedě": { icon: Armchair, label: "Hodiny vsedě denně" },
  spánek: { icon: Moon, label: "Průměrný spánek" },
  "úroveň stresu": { icon: Brain, label: "Úroveň stresu" },
  "zdravotní omezení": { icon: Stethoscope, label: "Zdravotní omezení" },
  "sportovní historie": { icon: Trophy, label: "Sportovní historie" },
  "aktuální aktivity": { icon: Activity, label: "Aktuální aktivity" },
  "tréninkové cíle": { icon: Target, label: "Tréninkové cíle" },
  "doplňky stravy": { icon: Pill, label: "Doplňky stravy" },
  "stravovací omezení": { icon: Salad, label: "Stravovací omezení" },
};

function formatValue(value: string | number | string[] | null | undefined): string {
  if (value === null || value === undefined) return "Odstraněno";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Žádné";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return value || "Prázdné";
}

function formatGender(value: string): string {
  if (value === "male") return "Muž";
  if (value === "female") return "Žena";
  return value;
}

function formatHandedness(value: string): string {
  if (value === "left") return "Levák";
  if (value === "right") return "Pravák";
  if (value === "ambidextrous") return "Obouruký";
  return value;
}

function formatFieldValue(fieldKey: string, value: string | number | string[] | null | undefined): string {
  const strValue = formatValue(value);
  
  if (fieldKey === "pohlaví") return formatGender(strValue);
  if (fieldKey === "dominantní ruka") return formatHandedness(strValue);
  if (fieldKey === "hodiny vsedě") return `${strValue} hodin`;
  if (fieldKey === "spánek") return `${strValue} hodin`;
  if (fieldKey === "úroveň stresu") return `${strValue}/10`;
  
  return strValue;
}

export function ProfileUpdateDetailDialog({
  open,
  onOpenChange,
  notification,
  clientName,
}: ProfileUpdateDetailDialogProps) {
  const navigate = useNavigate();
  
  if (!notification) return null;

  const metadata = notification.metadata as ProfileUpdateMetadata | null;
  const changes = metadata?.changes || {};
  const hasChanges = Object.keys(changes).length > 0;
  
  const clientId = notification.client_id || notification.entity_id;
  const displayName = clientName || notification.title?.split(" upravil")?.[0] || "Klient";
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true, 
    locale: cs 
  });

  const handleViewProfile = () => {
    if (clientId) {
      navigate(`/clients/${clientId}?tab=profile`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Aktualizace profilu
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {displayName} • {timeAgo}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="p-6 space-y-4">
            {hasChanges ? (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Změněné údaje
                </p>
                <div className="space-y-3">
                  {Object.entries(changes).map(([fieldKey, change]) => {
                    const config = FIELD_CONFIG[fieldKey] || { 
                      icon: User, 
                      label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1) 
                    };
                    const Icon = config.icon;
                    const formattedValue = formatFieldValue(fieldKey, change?.value);

                    return (
                      <div
                        key={fieldKey}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">
                              {config.label}
                            </p>
                            <p className="text-sm font-medium mt-0.5 break-words">
                              {formattedValue}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Detail změn není k dispozici.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Klikněte níže pro zobrazení aktuálního profilu.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Zavřít
          </Button>
          {clientId && (
            <Button onClick={handleViewProfile} className="flex-1">
              <User className="w-4 h-4 mr-2" />
              Zobrazit profil
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
