import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Loader2, Dumbbell, Utensils, FileText, Briefcase } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';

interface SettingItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  defaultValue: boolean;
}

const CATEGORY_SETTINGS: SettingItem[] = [
  { 
    key: 'trainingNotifications', 
    label: 'Tréninky & Cvičení', 
    icon: <Dumbbell className="w-4 h-4 text-orange-600" />,
    description: 'Klienti cvičí, osobní rekordy',
    defaultValue: true,
  },
  { 
    key: 'nutritionNotifications', 
    label: 'Výživa & Zdraví', 
    icon: <Utensils className="w-4 h-4 text-green-600" />,
    description: 'Záznamy stravy, váha',
    defaultValue: true,
  },
  { 
    key: 'formsNotifications', 
    label: 'Formuláře & Zpětná vazba', 
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    description: 'Feedback, diagnostika',
    defaultValue: true,
  },
  { 
    key: 'adminNotifications', 
    label: 'Administrativa', 
    icon: <Briefcase className="w-4 h-4 text-muted-foreground" />,
    description: 'Balíčky, neaktivita (doporučeno skryté)',
    defaultValue: false,
  },
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
          <span>Nastavení kategorií</span>
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
                CATEGORY_SETTINGS.map((setting, index) => (
                  <div key={setting.key}>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          setting.key === 'adminNotifications' ? 'bg-muted' : 
                          setting.key === 'trainingNotifications' ? 'bg-orange-100 dark:bg-orange-900/30' :
                          setting.key === 'nutritionNotifications' ? 'bg-green-100 dark:bg-green-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        )}>
                          {setting.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{setting.label}</p>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[setting.key] ?? setting.defaultValue}
                        onCheckedChange={(checked) => handleChange(setting.key, checked)}
                        disabled={updateSetting.isPending}
                      />
                    </div>
                    {index < CATEGORY_SETTINGS.length - 1 && (
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
