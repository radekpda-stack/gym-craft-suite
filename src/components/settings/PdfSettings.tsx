import { useState, useEffect } from "react";
import { FileText, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { usePdfSettings, useUpdatePdfSettings, PdfSettings as PdfSettingsType, getDefaultPdfSettings } from "@/hooks/usePdfSettings";
import { getCurrentThemeId, getThemeDisplayName, getPdfColorsFromTheme } from "@/lib/pdfTheme";
import { useLanguage } from "@/lib/i18n";

export function PdfSettings() {
  const { language } = useLanguage();
  const { data: settings, isLoading } = usePdfSettings();
  const updateSettings = useUpdatePdfSettings();
  
  const [localSettings, setLocalSettings] = useState<PdfSettingsType>(getDefaultPdfSettings());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = <K extends keyof PdfSettingsType>(key: K, value: PdfSettingsType[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(localSettings);
    setHasChanges(false);
  };

  // Get current theme colors for preview
  const currentTheme = getCurrentThemeId();
  const themeColors = getPdfColorsFromTheme(currentTheme);
  const themeName = getThemeDisplayName(currentTheme, language);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme color preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {language === 'cs' ? 'Barvy dokumentu' : 'Document colors'}
        </Label>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
          <div className="flex gap-1">
            <div 
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: `rgb(${themeColors.primary.join(',')})` }}
              title="Primary"
            />
            <div 
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: `rgb(${themeColors.primaryDark.join(',')})` }}
              title="Primary Dark"
            />
            <div 
              className="w-6 h-6 rounded-full border border-border"
              style={{ backgroundColor: `rgb(${themeColors.primaryLight.join(',')})` }}
              title="Primary Light"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {themeName}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {language === 'cs' ? '(podle zvoleného tématu)' : '(based on selected theme)'}
          </span>
        </div>
      </div>

      {/* Section visibility toggles */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          {language === 'cs' ? 'Zobrazené sekce' : 'Visible sections'}
        </Label>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showLogo" className="font-normal cursor-pointer">
                {language === 'cs' ? 'Logo firmy' : 'Company logo'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === 'cs' ? 'Zobrazit logo v záhlaví' : 'Show logo in header'}
              </p>
            </div>
            <Switch
              id="showLogo"
              checked={localSettings.showLogo}
              onCheckedChange={(checked) => handleChange('showLogo', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showCompanyInfo" className="font-normal cursor-pointer">
                {language === 'cs' ? 'Firemní údaje' : 'Company details'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === 'cs' ? 'IČ, adresa, kontakt' : 'ID, address, contact'}
              </p>
            </div>
            <Switch
              id="showCompanyInfo"
              checked={localSettings.showCompanyInfo}
              onCheckedChange={(checked) => handleChange('showCompanyInfo', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showSummary" className="font-normal cursor-pointer">
                {language === 'cs' ? 'Souhrn na začátku' : 'Summary at top'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === 'cs' ? 'Přehled celkového čerpání' : 'Overview of total usage'}
              </p>
            </div>
            <Switch
              id="showSummary"
              checked={localSettings.showSummary}
              onCheckedChange={(checked) => handleChange('showSummary', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showClientContact" className="font-normal cursor-pointer">
                {language === 'cs' ? 'Kontakt klienta' : 'Client contact'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === 'cs' ? 'Email a telefon klienta' : 'Client email and phone'}
              </p>
            </div>
            <Switch
              id="showClientContact"
              checked={localSettings.showClientContact}
              onCheckedChange={(checked) => handleChange('showClientContact', checked)}
            />
          </div>
        </div>
      </div>

      {/* Custom footer */}
      <div className="space-y-2">
        <Label htmlFor="customFooter" className="text-sm font-medium">
          {language === 'cs' ? 'Vlastní patička' : 'Custom footer'}
        </Label>
        <Textarea
          id="customFooter"
          placeholder={language === 'cs' 
            ? 'Např.: Děkujeme za vaši důvěru! www.vase-fitko.cz' 
            : 'E.g.: Thank you for your trust! www.your-gym.com'}
          value={localSettings.customFooter}
          onChange={(e) => handleChange('customFooter', e.target.value)}
          rows={2}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {language === 'cs' 
            ? 'Text zobrazený na konci každého PDF dokumentu' 
            : 'Text displayed at the end of each PDF document'}
        </p>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateSettings.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateSettings.isPending 
            ? (language === 'cs' ? 'Ukládám...' : 'Saving...') 
            : (language === 'cs' ? 'Uložit nastavení' : 'Save settings')}
        </Button>
      </div>
    </div>
  );
}
