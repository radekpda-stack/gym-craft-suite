import { useState } from 'react';
import { FileBarChart2, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useFinancialReportSettings, 
  getDefaultFinancialReportSettings 
} from '@/hooks/useFinancialReportSettings';
import { useFinancialReportData, type ReportPeriod } from '@/hooks/useFinancialReportData';
import { downloadFinancialReportPdf } from '@/lib/financialReportPdf';
import { useAppSettings } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

interface QuickFinancialReportButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  showPeriodSelector?: boolean;
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  year: 'Aktuální rok',
  '12months': 'Posledních 12 měsíců',
  custom: 'Vlastní období',
};

export function QuickFinancialReportButton({ 
  variant = 'outline', 
  size = 'default',
  showLabel = true,
  showPeriodSelector = false,
}: QuickFinancialReportButtonProps) {
  const { data: settings } = useFinancialReportSettings();
  const { data: appSettings } = useAppSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | null>(null);

  const effectiveSettings = settings || getDefaultFinancialReportSettings();
  const activePeriod = selectedPeriod || effectiveSettings.defaultPeriod;
  
  const { data: reportData, isLoading, refetch } = useFinancialReportData({
    period: activePeriod,
    settings: effectiveSettings,
  });

  const companyProfile = appSettings?.company_profile as {
    name?: string;
    logoUrl?: string;
  } | undefined;

  const handleGenerate = async (periodOverride?: ReportPeriod) => {
    const period = periodOverride || activePeriod;
    
    // If period changed, we need to refetch
    if (periodOverride && periodOverride !== activePeriod) {
      setSelectedPeriod(periodOverride);
      // Wait for next tick to allow query to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!reportData) {
      toast.error('Data nejsou k dispozici');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadFinancialReportPdf(reportData, {
        companyName: companyProfile?.name,
        companyLogoUrl: companyProfile?.logoUrl,
        settings: effectiveSettings,
      });
      toast.success('PDF report stažen');
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      toast.error('Chyba při generování PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!effectiveSettings.isEnabled) {
    return null;
  }

  const isDisabled = isGenerating || isLoading;

  // Simple button for icon size or when period selector not needed
  if (size === 'icon' || !showPeriodSelector) {
    const button = (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleGenerate()}
        disabled={isDisabled}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileBarChart2 className="w-4 h-4" />
        )}
        {showLabel && size !== 'icon' && 'Finanční report'}
      </Button>
    );

    if (size === 'icon' || !showLabel) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>Stáhnout finanční PDF report</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }

  // Button with dropdown for period selection
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={() => handleGenerate()}
        disabled={isDisabled}
        className="gap-2 rounded-r-none"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileBarChart2 className="w-4 h-4" />
        )}
        {showLabel && 'Finanční report'}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isDisabled}
            className="px-2 rounded-l-none border-l-0"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleGenerate('year')}>
            {PERIOD_LABELS.year}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleGenerate('12months')}>
            {PERIOD_LABELS['12months']}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
