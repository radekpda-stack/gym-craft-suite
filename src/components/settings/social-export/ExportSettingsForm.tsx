import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ExportFormat, ExportTheme, ExportPeriod, ExportSettings } from '@/types/socialExport';

interface ExportSettingsFormProps {
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  language?: 'cs' | 'en';
}

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; labelEn: string }> = [
  { value: 'instagram-post', label: 'Instagram Post (1080×1080)', labelEn: 'Instagram Post (1080×1080)' },
  { value: 'instagram-story', label: 'Instagram Stories (1080×1920)', labelEn: 'Instagram Stories (1080×1920)' },
  { value: 'facebook', label: 'Facebook (1200×630)', labelEn: 'Facebook (1200×630)' },
  { value: 'twitter', label: 'Twitter / X (1600×900)', labelEn: 'Twitter / X (1600×900)' },
];

const THEME_OPTIONS: Array<{ value: ExportTheme; label: string; labelEn: string; preview: string }> = [
  { value: 'dark', label: 'Tmavý', labelEn: 'Dark', preview: 'bg-zinc-900' },
  { value: 'light', label: 'Světlý', labelEn: 'Light', preview: 'bg-white border' },
  { value: 'gradient', label: 'Gradientový', labelEn: 'Gradient', preview: 'bg-gradient-to-r from-primary/40 to-accent/40' },
];

const PERIOD_OPTIONS: Array<{ value: ExportPeriod; label: string; labelEn: string }> = [
  { value: 'month', label: 'Tento měsíc', labelEn: 'This Month' },
  { value: 'year', label: 'Tento rok', labelEn: 'This Year' },
  { value: 'all', label: 'Celá kariéra', labelEn: 'All Time' },
];

export function ExportSettingsForm({ settings, onSettingsChange, language = 'cs' }: ExportSettingsFormProps) {
  const isCs = language === 'cs';

  const updateSetting = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-5">
        {/* Period */}
        <div className="space-y-2">
          <Label>{isCs ? 'Období' : 'Period'}</Label>
          <Select 
            value={settings.period} 
            onValueChange={(v) => updateSetting('period', v as ExportPeriod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {isCs ? opt.label : opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label>{isCs ? 'Formát' : 'Format'}</Label>
          <Select 
            value={settings.format} 
            onValueChange={(v) => updateSetting('format', v as ExportFormat)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {isCs ? opt.label : opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label>{isCs ? 'Styl' : 'Theme'}</Label>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                onClick={() => updateSetting('theme', theme.value)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  settings.theme === theme.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("w-8 h-8 rounded-md", theme.preview)} />
                <span className="text-xs font-medium">
                  {isCs ? theme.label : theme.labelEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm font-medium text-muted-foreground">
            {isCs ? 'Branding' : 'Branding'}
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-logo" className="text-sm">
              {isCs ? 'Zobrazit logo' : 'Show Logo'}
            </Label>
            <Switch
              id="show-logo"
              checked={settings.showLogo}
              onCheckedChange={(v) => updateSetting('showLogo', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-name" className="text-sm">
              {isCs ? 'Zobrazit jméno' : 'Show Name'}
            </Label>
            <Switch
              id="show-name"
              checked={settings.showTrainerName}
              onCheckedChange={(v) => updateSetting('showTrainerName', v)}
            />
          </div>

          {settings.showTrainerName && (
            <Input
              placeholder={isCs ? 'Jméno trenéra' : 'Trainer Name'}
              value={settings.trainerName || ''}
              onChange={(e) => updateSetting('trainerName', e.target.value)}
            />
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="show-social" className="text-sm">
              {isCs ? 'Zobrazit @handle' : 'Show @handle'}
            </Label>
            <Switch
              id="show-social"
              checked={settings.showSocialHandle}
              onCheckedChange={(v) => updateSetting('showSocialHandle', v)}
            />
          </div>

          {settings.showSocialHandle && (
            <Input
              placeholder="instagram_handle"
              value={settings.socialHandle || ''}
              onChange={(e) => updateSetting('socialHandle', e.target.value.replace('@', ''))}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
