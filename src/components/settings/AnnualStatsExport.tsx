import { useState } from 'react';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { FileBarChart2, Download, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAnnualStats, StatsPeriod } from '@/hooks/useAnnualStats';
import { downloadAnnualStatsPdf } from '@/lib/annualStatsPdf';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AnnualStatsExport() {
  const { language } = useLanguage();
  const locale = language === 'cs' ? cs : enUS;
  const [period, setPeriod] = useState<StatsPeriod>('year');
  const [customStart, setCustomStart] = useState<Date | undefined>(subYears(new Date(), 1));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [pdfLanguage, setPdfLanguage] = useState<'cs' | 'en'>('cs');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: settings } = useAppSettings();
  const companyProfile = settings?.company_profile as {
    name?: string;
    ico?: string;
    address?: string;
    logoUrl?: string;
  } | undefined;

  const { data: stats, isLoading, error } = useAnnualStats(
    period,
    period === 'custom' ? customStart : undefined,
    period === 'custom' ? customEnd : undefined
  );

  const handleGeneratePdf = async () => {
    if (!stats) {
      toast.error(language === 'cs' ? 'Data nejsou k dispozici' : 'Data not available');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadAnnualStatsPdf(stats, {
        language: pdfLanguage,
        companyName: companyProfile?.name,
        companyId: companyProfile?.ico,
        companyAddress: companyProfile?.address,
        companyLogoUrl: companyProfile?.logoUrl,
      });
      toast.success(language === 'cs' ? 'PDF vygenerováno' : 'PDF generated');
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      toast.error(language === 'cs' ? 'Chyba při generování PDF' : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, language === 'cs' ? 'd. M. yyyy' : 'MMM d, yyyy', { locale });
  };

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">
          {language === 'cs' ? 'Období' : 'Period'}
        </Label>
        <RadioGroup
          value={period}
          onValueChange={(v) => setPeriod(v as StatsPeriod)}
          className="flex flex-wrap gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="cursor-pointer">
              {language === 'cs' ? 'Celkem' : 'All time'}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="year" id="year" />
            <Label htmlFor="year" className="cursor-pointer">
              {language === 'cs' ? 'Tento rok' : 'This year'}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer">
              {language === 'cs' ? 'Vlastní období' : 'Custom period'}
            </Label>
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
                {customStart ? formatDate(customStart) : (language === 'cs' ? 'Od' : 'From')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                locale={locale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="self-center text-muted-foreground">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 glass-subtle border-0">
                <Calendar className="w-4 h-4" />
                {customEnd ? formatDate(customEnd) : (language === 'cs' ? 'Do' : 'To')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                locale={locale}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* PDF Language Selection */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">
          {language === 'cs' ? 'Jazyk PDF' : 'PDF Language'}
        </Label>
        <div className="flex gap-3">
          <button
            onClick={() => setPdfLanguage('cs')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm',
              pdfLanguage === 'cs'
                ? 'bg-primary text-primary-foreground'
                : 'glass-subtle hover:bg-secondary/50 text-foreground'
            )}
          >
            <span>🇨🇿</span>
            <span>Čeština</span>
          </button>
          <button
            onClick={() => setPdfLanguage('en')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm',
              pdfLanguage === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'glass-subtle hover:bg-secondary/50 text-foreground'
            )}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
        </div>
      </div>

      {/* Stats Preview */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive text-center py-4">
          {language === 'cs' ? 'Chyba při načítání dat' : 'Failed to load data'}
        </div>
      ) : stats ? (
        <div className="glass-subtle rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-sm text-foreground">
            {language === 'cs' ? 'Náhled statistik' : 'Stats Preview'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'Tréninky:' : 'Trainings:'}</span>
              <span className="ml-2 font-medium text-foreground">{stats.completedTrainings}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'Klienti:' : 'Clients:'}</span>
              <span className="ml-2 font-medium text-foreground">{stats.activeClients}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'Cviky:' : 'Exercises:'}</span>
              <span className="ml-2 font-medium text-foreground">{stats.totalExerciseEntries}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'Příjem:' : 'Income:'}</span>
              <span className="ml-2 font-medium text-foreground">
                {stats.totalIncome.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'PR:' : 'PRs:'}</span>
              <span className="ml-2 font-medium text-foreground">{stats.totalPRs}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{language === 'cs' ? 'Měření:' : 'Measurements:'}</span>
              <span className="ml-2 font-medium text-foreground">{stats.totalMeasurements}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Generate Button */}
      <Button
        onClick={handleGeneratePdf}
        disabled={isLoading || isGenerating || !stats}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {language === 'cs' ? 'Generuji...' : 'Generating...'}
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {language === 'cs' ? 'Stáhnout PDF statistiky' : 'Download PDF Statistics'}
          </>
        )}
      </Button>
    </div>
  );
}
