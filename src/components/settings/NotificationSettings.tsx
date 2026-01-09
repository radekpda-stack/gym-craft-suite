import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAppSettings, useUpdateSetting } from "@/hooks/useAppSettings";
import { useLanguage } from "@/lib/i18n";
import { 
  Loader2, 
  CreditCard, 
  Dumbbell, 
  MessageSquare, 
  Cake,
  Medal,
  Trophy
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface NotificationPreferences {
  // Global
  emailNotifications: boolean;
  
  // Finance & Packages
  lowCreditAlerts: boolean;
  packageAlerts: boolean;
  
  // Trainings
  trainingReminders: boolean;
  incompleteTrainingAlerts: boolean;
  
  // Personal Records (PR)
  prAlerts: boolean;
  
  // Feedback
  feedbackAlerts: boolean;
  feedbackRedFlags: boolean;
  
  // Clients
  birthdayAlerts: boolean;
  milestoneAlerts: boolean;
  anniversaryAlerts: boolean;
  inactivityAlerts: boolean;
  
  // Chat
  chatNotifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  lowCreditAlerts: true,
  packageAlerts: true,
  trainingReminders: true,
  incompleteTrainingAlerts: true,
  prAlerts: true,
  feedbackAlerts: true,
  feedbackRedFlags: true,
  birthdayAlerts: true,
  milestoneAlerts: true,
  anniversaryAlerts: false,
  inactivityAlerts: true,
  chatNotifications: true,
};

interface NotificationCategory {
  title: string;
  icon: React.ElementType;
  items: {
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }[];
}

export function NotificationSettings() {
  const { language } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.notification_preferences) {
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...settings.notification_preferences,
      });
    }
  }, [settings]);

  const handleChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSetting.mutate(
      { key: "notification_preferences", value: preferences },
      {
        onSuccess: () => setHasChanges(false),
      }
    );
  };

  const categories: NotificationCategory[] = [
    {
      title: language === 'cs' ? "Komunikace" : "Communication",
      icon: MessageSquare,
      items: [
        {
          key: "chatNotifications",
          label: language === 'cs' ? "Zprávy od klientů" : "Client messages",
          description: language === 'cs' ? "Notifikace o nových zprávách v chatu" : "Notifications about new chat messages",
        },
        {
          key: "emailNotifications",
          label: language === 'cs' ? "E-mailové notifikace" : "Email notifications",
          description: language === 'cs' ? "Dostávat důležité notifikace na e-mail" : "Receive important notifications via email",
        },
      ],
    },
    {
      title: language === 'cs' ? "Finance a balíčky" : "Finance & Packages",
      icon: CreditCard,
      items: [
        {
          key: "lowCreditAlerts",
          label: language === 'cs' ? "Nízký kredit" : "Low credit",
          description: language === 'cs' ? "Upozornění při nízkém kreditu klienta" : "Alert when client has low credit",
        },
        {
          key: "packageAlerts",
          label: language === 'cs' ? "Balíčky" : "Packages",
          description: language === 'cs' ? "Upozornění na docházející nebo expirující balíčky" : "Alerts for expiring packages",
        },
      ],
    },
    {
      title: language === 'cs' ? "Tréninky" : "Trainings",
      icon: Dumbbell,
      items: [
        {
          key: "trainingReminders",
          label: language === 'cs' ? "Připomínky tréninků" : "Training reminders",
          description: language === 'cs' ? "Připomenutí nadcházejících tréninků" : "Reminders for upcoming trainings",
        },
        {
          key: "incompleteTrainingAlerts",
          label: language === 'cs' ? "Nedokončené tréninky" : "Incomplete trainings",
          description: language === 'cs' ? "Upozornění na tréninky, které nebyly dokončeny" : "Alerts for trainings not completed",
        },
      ],
    },
    {
      title: language === 'cs' ? "Osobní rekordy (PR)" : "Personal Records (PR)",
      icon: Medal,
      items: [
        {
          key: "prAlerts",
          label: language === 'cs' ? "Nová PR" : "New PRs",
          description: language === 'cs' ? "Notifikace při dosažení nového osobního rekordu klientem" : "Notifications when client achieves a new personal record",
        },
      ],
    },
    {
      title: "Zpětná vazba",
      icon: MessageSquare,
      items: [
        {
          key: "feedbackAlerts",
          label: language === 'cs' ? "Nová zpětná vazba" : "New feedback",
          description: language === 'cs' ? "Notifikace o nové zpětné vazbě od klientů" : "Notifications about new client feedback",
        },
        {
          key: "feedbackRedFlags",
          label: language === 'cs' ? "Problémová zpětná vazba" : "Problem feedback",
          description: language === 'cs' ? "Upozornění na red flags (únava, bolest, nízké hodnocení)" : "Alerts for red flags (fatigue, pain, low ratings)",
        },
      ],
    },
    {
      title: language === 'cs' ? "Klienti" : "Clients",
      icon: Cake,
      items: [
        {
          key: "birthdayAlerts",
          label: language === 'cs' ? "Narozeniny" : "Birthdays",
          description: language === 'cs' ? "Připomenutí narozenin klientů" : "Client birthday reminders",
        },
        {
          key: "anniversaryAlerts",
          label: language === 'cs' ? "Výročí" : "Anniversaries",
          description: language === 'cs' ? "Výročí spolupráce s klientem" : "Client collaboration anniversaries",
        },
        {
          key: "inactivityAlerts",
          label: language === 'cs' ? "Neaktivita" : "Inactivity",
          description: language === 'cs' ? "Upozornění na dlouho neaktivní klienty" : "Alerts for inactive clients",
        },
      ],
    },
    {
      title: language === 'cs' ? "Úspěchy & Milníky" : "Achievements & Milestones",
      icon: Trophy,
      items: [
        {
          key: "milestoneAlerts",
          label: language === 'cs' ? "Milníky tréninků" : "Training milestones",
          description: language === 'cs' ? "Úspěchy klientů (5, 10, 50, 100, 500 tréninků)" : "Client achievements (5, 10, 50, 100, 500 trainings)",
        },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {categories.map((category) => {
        const CategoryIcon = category.icon;
        return (
          <Card key={category.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base">{category.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.items.map((item, index) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={item.key} className="text-sm font-medium">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      id={item.key}
                      checked={preferences[item.key]}
                      onCheckedChange={(checked) => handleChange(item.key, checked)}
                    />
                  </div>
                  {index < category.items.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {hasChanges && (
        <div className="sticky bottom-4">
          <Button 
            onClick={handleSave} 
            disabled={updateSetting.isPending}
            className="w-full"
          >
            {updateSetting.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'cs' ? 'Ukládám...' : 'Saving...'}
              </>
            ) : (
              language === 'cs' ? "Uložit změny" : "Save changes"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
