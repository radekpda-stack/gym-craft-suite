import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAppSettings, useUpdateSetting } from "@/hooks/useAppSettings";
import { useLanguage } from "@/lib/i18n";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { 
  Loader2, 
  CreditCard, 
  Dumbbell, 
  MessageSquare, 
  Cake, 
  Bell,
  BellOff,
  BellRing,
  AlertCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
export interface NotificationPreferences {
  // Global
  emailNotifications: boolean;
  
  // Finance & Packages
  lowCreditAlerts: boolean;
  packageAlerts: boolean;
  
  // Trainings
  trainingReminders: boolean;
  incompleteTrainingAlerts: boolean;
  
  // Feedback
  feedbackAlerts: boolean;
  feedbackRedFlags: boolean;
  
  // Clients
  birthdayAlerts: boolean;
  milestoneAlerts: boolean;
  anniversaryAlerts: boolean;
  
  // Chat
  chatNotifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  lowCreditAlerts: true,
  packageAlerts: true,
  trainingReminders: true,
  incompleteTrainingAlerts: true,
  feedbackAlerts: true,
  feedbackRedFlags: true,
  birthdayAlerts: true,
  milestoneAlerts: true,
  anniversaryAlerts: false,
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
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    permission: pushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    vapidKeyConfigured
  } = usePushSubscription();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [pushActionLoading, setPushActionLoading] = useState(false);

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

  const handlePushToggle = async () => {
    setPushActionLoading(true);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
    } finally {
      setPushActionLoading(false);
    }
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
          key: "milestoneAlerts",
          label: language === 'cs' ? "Milníky" : "Milestones",
          description: language === 'cs' ? "Úspěchy klientů (100, 500, 1000 tréninků)" : "Client achievements (100, 500, 1000 trainings)",
        },
        {
          key: "anniversaryAlerts",
          label: language === 'cs' ? "Výročí" : "Anniversaries",
          description: language === 'cs' ? "Výročí spolupráce s klientem" : "Client collaboration anniversaries",
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
      {/* Web Push Notifications Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BellRing className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">
              {language === 'cs' ? 'Push notifikace' : 'Push Notifications'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPushSupported ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'cs' 
                  ? 'Push notifikace nejsou v tomto prohlížeči podporovány.'
                  : 'Push notifications are not supported in this browser.'}
              </AlertDescription>
            </Alert>
          ) : !vapidKeyConfigured ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'cs' 
                  ? 'Push notifikace nejsou nakonfigurovány.'
                  : 'Push notifications are not configured.'}
              </AlertDescription>
            </Alert>
          ) : pushPermission === 'denied' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'cs' 
                  ? 'Push notifikace jsou zablokované v prohlížeči. Povolte je v nastavení prohlížeče.'
                  : 'Push notifications are blocked in the browser. Enable them in browser settings.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {language === 'cs' ? 'Dostávat push notifikace' : 'Receive push notifications'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPushSubscribed 
                    ? (language === 'cs' ? 'Notifikace jsou povoleny' : 'Notifications are enabled')
                    : (language === 'cs' ? 'Povolit notifikace v prohlížeči' : 'Enable browser notifications')}
                </p>
              </div>
              <Button 
                variant={isPushSubscribed ? "outline" : "default"}
                size="sm"
                onClick={handlePushToggle}
                disabled={pushActionLoading || isPushLoading}
              >
                {pushActionLoading || isPushLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPushSubscribed ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    {language === 'cs' ? 'Vypnout' : 'Disable'}
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    {language === 'cs' ? 'Povolit' : 'Enable'}
                  </>
                )}
              </Button>
            </div>
          )}
          
          <Separator />
          
          <p className="text-xs text-muted-foreground">
            {language === 'cs' 
              ? 'Push notifikace vás upozorní na nové osobní rekordy klientů i když aplikace není otevřená.'
              : 'Push notifications will alert you about new client personal records even when the app is closed.'}
          </p>
        </CardContent>
      </Card>

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
