import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';

interface SettingItem {
  key: string;
  label: string;
  icon: string;
}

const QUICK_SETTINGS: SettingItem[] = [
  { key: 'chatNotifications', label: 'Zprávy', icon: '💬' },
  { key: 'lowCreditAlerts', label: 'Finance & balíčky', icon: '💰' },
  { key: 'noTrainingAlerts', label: 'Chybějící tréninky', icon: '📅' },
  { key: 'prAlerts', label: 'Osobní rekordy', icon: '🏆' },
  { key: 'birthdayAlerts', label: 'Narozeniny & výročí', icon: '🎂' },
  { key: 'feedbackAlerts', label: 'Zpětná vazba', icon: '📝' },
];

interface InlineNotificationSettingsProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function InlineNotificationSettings({ isExpanded, onToggle }: InlineNotificationSettingsProps) {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings?.notification_preferences) {
      setPreferences(settings.notification_preferences as Record<string, boolean>);
    }
  }, [settings]);

  const handleChange = (key: string, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setPendingChanges(prev => ({ ...prev, [key]: value }));
    
    // Debounced save
    const timeoutId = setTimeout(() => {
      updateSetting.mutate(
        { key: 'notification_preferences', value: newPreferences },
        { onSuccess: () => setPendingChanges({}) }
      );
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="border-t bg-muted/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>⚙️</span>
          <span>Nastavení notifikací</span>
          {hasPendingChanges && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                QUICK_SETTINGS.map((setting, index) => (
                  <div key={setting.key}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{setting.icon}</span>
                        <span className="text-sm">{setting.label}</span>
                      </div>
                      <Switch
                        checked={preferences[setting.key] ?? true}
                        onCheckedChange={(checked) => handleChange(setting.key, checked)}
                        disabled={updateSetting.isPending}
                      />
                    </div>
                    {index < QUICK_SETTINGS.length - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
