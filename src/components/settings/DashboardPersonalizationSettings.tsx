import { LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardLayout, useUpdateSetting, DashboardLayout } from '@/hooks/useAppSettings';
import { useLanguage } from '@/lib/i18n';

const DASHBOARD_SECTIONS = [
  { key: 'showIncomeChart', labelCs: 'Graf příjmů', labelEn: 'Income chart' },
  { key: 'showMonthlyChart', labelCs: 'Měsíční přehled', labelEn: 'Monthly overview' },
  { key: 'showClientCredits', labelCs: 'Kredity klientů', labelEn: 'Client credits' },
  { key: 'showProductBreakdown', labelCs: 'Rozložení produktů', labelEn: 'Product breakdown' },
  { key: 'showTaxCalculator', labelCs: 'Daňová kalkulačka', labelEn: 'Tax calculator' },
  { key: 'showQuickActions', labelCs: 'Rychlé akce', labelEn: 'Quick actions' },
  { key: 'showTrainingTrend', labelCs: 'Trend tréninků', labelEn: 'Training trend' },
  { key: 'showTrainingStats', labelCs: 'Statistiky tréninků', labelEn: 'Training stats' },
  { key: 'showTopClients', labelCs: 'Top klienti', labelEn: 'Top clients' },
  { key: 'showProfitChart', labelCs: 'Graf zisku', labelEn: 'Profit chart' },
  { key: 'showSalesChart', labelCs: 'Graf prodejů', labelEn: 'Sales chart' },
] as const;

export function DashboardPersonalizationSettings() {
  const { language } = useLanguage();
  const layout = useDashboardLayout();
  const updateSetting = useUpdateSetting();

  const toggleSection = (key: keyof DashboardLayout) => {
    updateSetting.mutate({
      key: 'dashboard_layout',
      value: { ...layout, [key]: !layout[key] }
    });
  };

  const visibleCount = Object.values(layout).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          {language === 'cs' ? 'Viditelné sekce' : 'Visible sections'}
        </span>
        <span className="font-medium">
          {visibleCount}/{DASHBOARD_SECTIONS.length}
        </span>
      </div>
      
      <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
        {DASHBOARD_SECTIONS.map(section => {
          const isVisible = layout[section.key as keyof DashboardLayout];
          return (
            <div 
              key={section.key} 
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isVisible ? (
                  <Eye className="h-4 w-4 text-green-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-sm cursor-pointer">
                  {language === 'cs' ? section.labelCs : section.labelEn}
                </Label>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={() => toggleSection(section.key as keyof DashboardLayout)}
                disabled={updateSetting.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
