import { useState, useEffect } from "react";
import { Settings, Save, Type, Palette, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { usePdfSettings, useUpdatePdfSettings, PdfSettings, FontFamily, FontSize, getDefaultPdfSettings } from "@/hooks/usePdfSettings";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PdfSettingsDialogProps {
  trigger?: React.ReactNode;
}

const fontFamilyOptions: { value: FontFamily; label: { cs: string; en: string } }[] = [
  { value: 'roboto', label: { cs: 'Roboto (výchozí)', en: 'Roboto (default)' } },
  { value: 'helvetica', label: { cs: 'Helvetica', en: 'Helvetica' } },
  { value: 'times', label: { cs: 'Times New Roman', en: 'Times New Roman' } },
  { value: 'courier', label: { cs: 'Courier', en: 'Courier' } },
];

const fontSizeOptions: { value: FontSize; label: { cs: string; en: string }; desc: { cs: string; en: string } }[] = [
  { value: 'small', label: { cs: 'Malé', en: 'Small' }, desc: { cs: '8-10pt', en: '8-10pt' } },
  { value: 'medium', label: { cs: 'Střední', en: 'Medium' }, desc: { cs: '9-11pt', en: '9-11pt' } },
  { value: 'large', label: { cs: 'Velké', en: 'Large' }, desc: { cs: '10-12pt', en: '10-12pt' } },
];

const colorPresets = [
  { name: 'Slate', primary: '#1e293b', text: '#0f172a', header: '#0f172a' },
  { name: 'Blue', primary: '#1e40af', text: '#1e3a8a', header: '#1e3a8a' },
  { name: 'Green', primary: '#166534', text: '#14532d', header: '#14532d' },
  { name: 'Orange', primary: '#c2410c', text: '#9a3412', header: '#9a3412' },
  { name: 'Purple', primary: '#7c3aed', text: '#5b21b6', header: '#5b21b6' },
];

export function PdfSettingsDialog({ trigger }: PdfSettingsDialogProps) {
  const { language } = useLanguage();
  const { data: settings, isLoading } = usePdfSettings();
  const updateSettings = useUpdatePdfSettings();
  
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<PdfSettings>(getDefaultPdfSettings());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = <K extends keyof PdfSettings>(key: K, value: PdfSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(localSettings, {
      onSuccess: () => setOpen(false),
    });
  };

  const handleReset = () => {
    const defaults = getDefaultPdfSettings();
    setLocalSettings(defaults);
    setHasChanges(true);
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setLocalSettings(prev => ({
      ...prev,
      primaryColor: preset.primary,
      textColor: preset.text,
      tableHeaderColor: preset.header,
      useThemeColors: false,
    }));
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'cs' ? 'Nastavení PDF' : 'PDF Settings'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{language === 'cs' ? 'Obsah' : 'Content'}</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-1.5 text-xs sm:text-sm">
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{language === 'cs' ? 'Písmo' : 'Font'}</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="gap-1.5 text-xs sm:text-sm">
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{language === 'cs' ? 'Barvy' : 'Colors'}</span>
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-0">
              {/* Custom title */}
              <div className="space-y-2">
                <Label htmlFor="customTitle">
                  {language === 'cs' ? 'Vlastní název dokumentu' : 'Custom document title'}
                </Label>
                <Input
                  id="customTitle"
                  placeholder={language === 'cs' ? 'Výpis čerpání kreditu' : 'Credit Usage Statement'}
                  value={localSettings.customTitle}
                  onChange={(e) => handleChange('customTitle', e.target.value)}
                />
              </div>

              {/* Section toggles */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {language === 'cs' ? 'Zobrazené sekce' : 'Visible sections'}
                </Label>
                
                {[
                  { key: 'showLogo' as const, label: { cs: 'Logo firmy', en: 'Company logo' }, desc: { cs: 'V záhlaví dokumentu', en: 'In document header' } },
                  { key: 'showCompanyInfo' as const, label: { cs: 'Firemní údaje', en: 'Company details' }, desc: { cs: 'IČ, adresa, kontakt', en: 'ID, address, contact' } },
                  { key: 'showSummary' as const, label: { cs: 'Souhrn', en: 'Summary' }, desc: { cs: 'Přehled celkového čerpání', en: 'Total usage overview' } },
                  { key: 'showClientContact' as const, label: { cs: 'Kontakt klienta', en: 'Client contact' }, desc: { cs: 'Email a telefon', en: 'Email and phone' } },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div className="space-y-0.5">
                      <Label htmlFor={item.key} className="font-normal cursor-pointer">
                        {item.label[language]}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.desc[language]}</p>
                    </div>
                    <Switch
                      id={item.key}
                      checked={localSettings[item.key]}
                      onCheckedChange={(checked) => handleChange(item.key, checked)}
                    />
                  </div>
                ))}
              </div>

              {/* Custom footer */}
              <div className="space-y-2">
                <Label htmlFor="customFooter">
                  {language === 'cs' ? 'Vlastní patička' : 'Custom footer'}
                </Label>
                <Textarea
                  id="customFooter"
                  placeholder={language === 'cs' 
                    ? 'Např.: Děkujeme za vaši důvěru!' 
                    : 'E.g.: Thank you for your trust!'}
                  value={localSettings.customFooter}
                  onChange={(e) => handleChange('customFooter', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-4 mt-0">
              {/* Font family */}
              <div className="space-y-2">
                <Label>{language === 'cs' ? 'Rodina písma' : 'Font family'}</Label>
                <Select
                  value={localSettings.fontFamily}
                  onValueChange={(value: FontFamily) => handleChange('fontFamily', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span style={{ fontFamily: option.value === 'roboto' ? 'Roboto, sans-serif' : option.value }}>
                          {option.label[language]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {language === 'cs' 
                    ? 'Roboto podporuje českou diakritiku' 
                    : 'Roboto supports Czech diacritics'}
                </p>
              </div>

              {/* Font size */}
              <div className="space-y-2">
                <Label>{language === 'cs' ? 'Velikost písma' : 'Font size'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {fontSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleChange('fontSize', option.value)}
                      className={cn(
                        'p-3 rounded-lg border text-center transition-all',
                        localSettings.fontSize === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-secondary/50'
                      )}
                    >
                      <div className="font-medium text-sm">{option.label[language]}</div>
                      <div className="text-xs text-muted-foreground">{option.desc[language]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4 mt-0">
              {/* Use theme colors */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="useThemeColors" className="font-normal cursor-pointer">
                    {language === 'cs' ? 'Použít barvy z tématu' : 'Use theme colors'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'cs' 
                      ? 'Elegantní tmavé barvy pro profesionální vzhled' 
                      : 'Elegant dark colors for professional look'}
                  </p>
                </div>
                <Switch
                  id="useThemeColors"
                  checked={localSettings.useThemeColors}
                  onCheckedChange={(checked) => handleChange('useThemeColors', checked)}
                />
              </div>

              {!localSettings.useThemeColors && (
                <>
                  {/* Color presets */}
                  <div className="space-y-2">
                    <Label>{language === 'cs' ? 'Barevné předvolby' : 'Color presets'}</Label>
                    <div className="flex gap-2 flex-wrap">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyColorPreset(preset)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary/50 transition-all"
                        >
                          <div 
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span className="text-sm">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom colors */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">
                        {language === 'cs' ? 'Hlavní barva' : 'Primary color'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={localSettings.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          value={localSettings.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          placeholder="#1e293b"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="textColor">
                        {language === 'cs' ? 'Barva textu' : 'Text color'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={localSettings.textColor}
                          onChange={(e) => handleChange('textColor', e.target.value)}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          value={localSettings.textColor}
                          onChange={(e) => handleChange('textColor', e.target.value)}
                          placeholder="#0f172a"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tableHeaderColor">
                        {language === 'cs' ? 'Barva záhlaví tabulky' : 'Table header color'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="tableHeaderColor"
                          type="color"
                          value={localSettings.tableHeaderColor}
                          onChange={(e) => handleChange('tableHeaderColor', e.target.value)}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          value={localSettings.tableHeaderColor}
                          onChange={(e) => handleChange('tableHeaderColor', e.target.value)}
                          placeholder="#0f172a"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {language === 'cs' ? 'Obnovit výchozí' : 'Reset defaults'}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateSettings.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSettings.isPending 
              ? (language === 'cs' ? 'Ukládám...' : 'Saving...') 
              : (language === 'cs' ? 'Uložit' : 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
