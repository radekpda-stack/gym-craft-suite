import { useState, useEffect } from 'react';
import { FileBarChart2, Download, Calendar, Loader2, Settings2 } from 'lucide-react';
import { format, startOfYear, subYears } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  useFinancialReportSettings, 
  useUpdateFinancialReportSettings,
  type FinancialReportSettings as SettingsType,
  getDefaultFinancialReportSettings 
} from '@/hooks/useFinancialReportSettings';
import { useFinancialReportData, type ReportPeriod } from '@/hooks/useFinancialReportData';
import { downloadFinancialReportPdf } from '@/lib/financialReportPdf';
import { useAppSettings } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FinancialReportSettings() {
  const { data: savedSettings, isLoading: loadingSettings } = useFinancialReportSettings();
  const updateSettings = useUpdateFinancialReportSettings();
  const { data: appSettings } = useAppSettings();
  
  const [settings, setSettings] = useState<SettingsType>(getDefaultFinancialReportSettings());
  const [period, setPeriod] = useState<ReportPeriod>('year');
  const [customStart, setCustomStart] = useState<Date | undefined>(subYears(new Date(), 1));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Load saved settings
  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
      setPeriod(savedSettings.defaultPeriod);
    }
  }, [savedSettings]);

  const companyProfile = appSettings?.company_profile as {
    name?: string;
    logoUrl?: string;
  } | undefined;

  const { data: reportData, isLoading: loadingData, refetch } = useFinancialReportData({
    period,
    customStart: period === 'custom' ? customStart : undefined,
    customEnd: period === 'custom' ? customEnd : undefined,
    settings,
  });

  const handleSettingsChange = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSectionChange = (key: keyof SettingsType['sections'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      sections: { ...prev.sections, [key]: value },
    }));
  };

  const handleBrandingChange = (key: keyof SettingsType['branding'], value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      branding: { ...prev.branding, [key]: value },
    }));
  };

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync({
      ...settings,
      defaultPeriod: period,
    });
  };

  const handleGeneratePdf = async () => {
    if (!reportData) {
      toast.error('Data nejsou k dispozici');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadFinancialReportPdf(reportData, {
        companyName: companyProfile?.name,
        companyLogoUrl: companyProfile?.logoUrl,
        settings,
      });
      toast.success('PDF vygenerováno');
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      toast.error('Chyba při generování PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (date: Date) => format(date, 'd. M. yyyy', { locale: cs });

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Modul aktivní</Label>
          <p className="text-xs text-muted-foreground">Zapnout/vypnout finanční report</p>
        </div>
        <Switch
          checked={settings.isEnabled}
          onCheckedChange={(v) => handleSettingsChange('isEnabled', v)}
        />
      </div>

      {settings.isEnabled && (
        <>
          <Separator />

          {/* Period Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Období</Label>
            <RadioGroup
              value={period}
              onValueChange={(v) => setPeriod(v as ReportPeriod)}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="year" id="fr-year" />
                <Label htmlFor="fr-year" className="cursor-pointer">Tento rok</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12months" id="fr-12months" />
                <Label htmlFor="fr-12months" className="cursor-pointer">Posledních 12 měsíců</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="fr-custom" />
                <Label htmlFor="fr-custom" className="cursor-pointer">Vlastní období</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <div className="flex flex-wrap gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 glass-subtle border-0">
                    <Calendar className="w-4 h-4" />
                    {customStart ? formatDate(customStart) : 'Od'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    locale={cs}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 glass-subtle border-0">
                    <Calendar className="w-4 h-4" />
                    {customEnd ? formatDate(customEnd) : 'Do'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    locale={cs}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Separator />

          {/* Configuration */}
          <Collapsible open={showConfig} onOpenChange={setShowConfig}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Konfigurace reportu
                </span>
                <span className="text-xs text-muted-foreground">
                  {showConfig ? 'Skrýt' : 'Zobrazit'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Sections */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sekce v PDF</Label>
                <div className="grid gap-2">
                  {[
                    { key: 'yearSummary' as const, label: 'Souhrn období' },
                    { key: 'monthlyOverview' as const, label: 'Měsíční přehled' },
                    { key: 'weeklyOverview' as const, label: 'Týdenní přehled' },
                    { key: 'clientsBreakdown' as const, label: 'Klienti a částky' },
                    { key: 'trainingTypeBreakdown' as const, label: 'Rozpad typů tréninku' },
                    { key: 'managerialMetrics' as const, label: 'Manažerské metriky' },
                    { key: 'dataValidation' as const, label: 'Kontrola dat' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <Label className="text-sm font-normal">{label}</Label>
                      <Switch
                        checked={settings.sections[key]}
                        onCheckedChange={(v) => handleSectionChange(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Client Definition */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Definice aktivního klienta</Label>
                <RadioGroup
                  value={settings.clientDefinition}
                  onValueChange={(v) => handleSettingsChange('clientDefinition', v as 'trainings' | 'payments' | 'both')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trainings" id="def-trainings" />
                    <Label htmlFor="def-trainings" className="cursor-pointer text-sm font-normal">
                      Alespoň 1 trénink v období
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="payments" id="def-payments" />
                    <Label htmlFor="def-payments" className="cursor-pointer text-sm font-normal">
                      Alespoň 1 platba v období
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="def-both" />
                    <Label htmlFor="def-both" className="cursor-pointer text-sm font-normal">
                      Obojí (trénink nebo platba)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Branding */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Branding</Label>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-sm font-normal">Zobrazit logo</Label>
                    <Switch
                      checked={settings.branding.showLogo}
                      onCheckedChange={(v) => handleBrandingChange('showLogo', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-sm font-normal">Zobrazit název firmy</Label>
                    <Switch
                      checked={settings.branding.showCompanyName}
                      onCheckedChange={(v) => handleBrandingChange('showCompanyName', v)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">Vlastní titulek</Label>
                    <Input
                      value={settings.branding.customTitle}
                      onChange={(e) => handleBrandingChange('customTitle', e.target.value)}
                      placeholder="Finanční report"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Save Settings Button */}
              <Button 
                onClick={handleSaveSettings} 
                variant="outline" 
                className="w-full"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Uložit nastavení
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Preview Stats */}
          {reportData && (
            <div className="glass-subtle rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Náhled dat</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Příjmy:</div>
                <div className="font-medium">{reportData.summary.totalIncome.toLocaleString('cs-CZ')} Kč</div>
                <div className="text-muted-foreground">Tréninky:</div>
                <div className="font-medium">{reportData.summary.totalTrainings}</div>
                <div className="text-muted-foreground">Klienti:</div>
                <div className="font-medium">{reportData.summary.totalClients}</div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGeneratePdf} 
            disabled={isGenerating || loadingData || !reportData}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? 'Generuji PDF...' : 'Stáhnout PDF report'}
          </Button>
        </>
      )}
    </div>
  );
}
