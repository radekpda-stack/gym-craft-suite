import { useState, useEffect } from 'react';
import { Bell, Mail, AlertCircle, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { useLanguage } from '@/lib/i18n';

interface NotificationPreferences {
  lowCreditAlerts: boolean;
  trainingReminders: boolean;
  emailNotifications: boolean;
  reminderHoursBefore: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  lowCreditAlerts: true,
  trainingReminders: true,
  emailNotifications: false,
  reminderHoursBefore: 24,
};

export function NotificationSettings() {
  const { language } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.notification_preferences) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...settings.notification_preferences });
    }
  }, [settings]);

  const handleChange = (key: keyof NotificationPreferences, value: boolean | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSetting.mutate(
      { key: 'notification_preferences', value: preferences },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Low Credit Alerts */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'Upozornění na nízký kredit' : 'Low credit alerts'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Zobrazit varování když klient má málo kreditu' 
                  : 'Show warning when client has low credit'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.lowCreditAlerts}
            onCheckedChange={(checked) => handleChange('lowCreditAlerts', checked)}
          />
        </div>

        {/* Training Reminders */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'Připomínky tréninků' : 'Training reminders'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Připomenout nadcházející tréninky' 
                  : 'Remind about upcoming trainings'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.trainingReminders}
            onCheckedChange={(checked) => handleChange('trainingReminders', checked)}
          />
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Mail className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'E-mailové notifikace' : 'Email notifications'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Zasílat důležité aktualizace e-mailem' 
                  : 'Send important updates via email'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.emailNotifications}
            onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
          />
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave}
            disabled={updateSetting.isPending}
            size="sm"
          >
            {updateSetting.isPending 
              ? (language === 'cs' ? 'Ukládám...' : 'Saving...') 
              : (language === 'cs' ? 'Uložit změny' : 'Save changes')}
          </Button>
        </div>
      )}
    </div>
  );
}
