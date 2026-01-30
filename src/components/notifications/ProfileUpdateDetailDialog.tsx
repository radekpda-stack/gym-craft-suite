import { useEffect, useState } from "react";
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
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

// Field configuration with icons, labels, and database column mapping
const FIELD_CONFIG: Record<string, { icon: typeof Mail; label: string; dbColumn?: string }> = {
  email: { icon: Mail, label: "Email", dbColumn: "email" },
  telefon: { icon: Phone, label: "Telefon", dbColumn: "phone" },
  "datum narození": { icon: Calendar, label: "Datum narození", dbColumn: "birth_date" },
  pohlaví: { icon: User, label: "Pohlaví", dbColumn: "gender" },
  "dominantní ruka": { icon: Hand, label: "Dominantní ruka", dbColumn: "handedness" },
  "typ práce": { icon: Briefcase, label: "Typ práce", dbColumn: "occupation" },
  "hodiny vsedě": { icon: Armchair, label: "Hodiny vsedě denně", dbColumn: "sitting_hours_daily" },
  spánek: { icon: Moon, label: "Průměrný spánek", dbColumn: "sleep_hours" },
  "úroveň stresu": { icon: Brain, label: "Úroveň stresu", dbColumn: "stress_level" },
  "zdravotní omezení": { icon: Stethoscope, label: "Zdravotní omezení", dbColumn: "health_restrictions" },
  "sportovní historie": { icon: Trophy, label: "Sportovní historie", dbColumn: "sports_history" },
  "aktuální aktivity": { icon: Activity, label: "Aktuální aktivity", dbColumn: "current_activities" },
  "tréninkové cíle": { icon: Target, label: "Tréninkové cíle", dbColumn: "training_goals" },
  "doplňky stravy": { icon: Pill, label: "Doplňky stravy", dbColumn: "supplements" },
  "stravovací omezení": { icon: Salad, label: "Stravovací omezení", dbColumn: "dietary_restrictions" },
};

// Parse field names from message for older notifications without metadata
function parseFieldsFromMessage(message: string): string[] {
  // Message format: "Jana upravil(a): email, telefon, datum narození"
  const match = message.match(/upravil\(a\):\s*(.+)$/i);
  if (!match) return [];
  
  return match[1].split(",").map(field => field.trim()).filter(Boolean);
}

function formatValue(value: string | number | string[] | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return value || "—";
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
  if (strValue === "—") return strValue;
  
  if (fieldKey === "pohlaví") return formatGender(strValue);
  if (fieldKey === "dominantní ruka") return formatHandedness(strValue);
  if (fieldKey === "hodiny vsedě") return `${strValue} hodin`;
  if (fieldKey === "spánek") return `${strValue} hodin`;
  if (fieldKey === "úroveň stresu") return `${strValue}/10`;
  
  return strValue;
}

interface ClientData {
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  handedness?: string | null;
  occupation?: string | null;
  sitting_hours_daily?: number | null;
  sleep_hours?: number | null;
  stress_level?: number | null;
  health_restrictions?: string | null;
  sports_history?: string | null;
  current_activities?: string[] | null;
  training_goals?: string[] | null;
  supplements?: string[] | null;
  dietary_restrictions?: string[] | null;
}

export function ProfileUpdateDetailDialog({
  open,
  onOpenChange,
  notification,
  clientName,
}: ProfileUpdateDetailDialogProps) {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const clientId = notification?.client_id || notification?.entity_id;
  
  // Fetch client data when dialog opens and we need it (for legacy notifications)
  useEffect(() => {
    if (!open || !notification || !clientId) {
      setClientData(null);
      return;
    }
    
    const metadata = notification.metadata as ProfileUpdateMetadata | null;
    const hasMetadata = metadata?.changes && Object.keys(metadata.changes).length > 0;
    
    // Only fetch if we don't have metadata
    if (hasMetadata) {
      setClientData(null);
      return;
    }
    
    const fetchClientData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select(`
            email, phone, birth_date, gender, handedness, occupation,
            sitting_hours_daily, sleep_hours, stress_level, health_restrictions,
            sports_history, current_activities, training_goals, supplements,
            dietary_restrictions
          `)
          .eq("id", clientId)
          .maybeSingle();
        
        if (!error && data) {
          setClientData(data);
        }
      } catch (error) {
        console.error("[ProfileUpdateDetailDialog] Error fetching client:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientData();
  }, [open, notification, clientId]);
  
  if (!notification) return null;

  const metadata = notification.metadata as ProfileUpdateMetadata | null;
  const changes = metadata?.changes || {};
  const hasChanges = Object.keys(changes).length > 0;
  
  // For older notifications without metadata, parse field names from message
  const parsedFieldsFromMessage = !hasChanges && notification.message
    ? parseFieldsFromMessage(notification.message)
    : [];
  
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
  
  // Get value from client data for a field key
  const getClientValue = (fieldKey: string): string | number | string[] | null | undefined => {
    if (!clientData) return undefined;
    const config = FIELD_CONFIG[fieldKey];
    if (!config?.dbColumn) return undefined;
    return clientData[config.dbColumn as keyof ClientData];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0 z-[120]">
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasChanges ? (
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
            ) : parsedFieldsFromMessage.length > 0 ? (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Změněné údaje
                </p>
                <div className="space-y-3">
                  {parsedFieldsFromMessage.map((fieldKey) => {
                    const config = FIELD_CONFIG[fieldKey] || { 
                      icon: User, 
                      label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1) 
                    };
                    const Icon = config.icon;
                    const value = getClientValue(fieldKey);
                    const formattedValue = formatFieldValue(fieldKey, value);

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
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Zobrazeny aktuální hodnoty z profilu klienta
                </p>
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
