import { useState } from 'react';
import { FileBarChart2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useFinancialReportSettings, 
  getDefaultFinancialReportSettings 
} from '@/hooks/useFinancialReportSettings';
import { useFinancialReportData } from '@/hooks/useFinancialReportData';
import { downloadFinancialReportPdf } from '@/lib/financialReportPdf';
import { useAppSettings } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

interface QuickFinancialReportButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function QuickFinancialReportButton({ 
  variant = 'outline', 
  size = 'default',
  showLabel = true 
}: QuickFinancialReportButtonProps) {
  const { data: settings } = useFinancialReportSettings();
  const { data: appSettings } = useAppSettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const effectiveSettings = settings || getDefaultFinancialReportSettings();
  
  const { data: reportData, isLoading } = useFinancialReportData({
    period: effectiveSettings.defaultPeriod,
    settings: effectiveSettings,
  });

  const companyProfile = appSettings?.company_profile as {
    name?: string;
    logoUrl?: string;
  } | undefined;

  const handleGenerate = async () => {
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

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleGenerate}
      disabled={isGenerating || isLoading}
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileBarChart2 className="w-4 h-4" />
      )}
      {showLabel && (size !== 'icon' ? 'Finanční report' : null)}
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
