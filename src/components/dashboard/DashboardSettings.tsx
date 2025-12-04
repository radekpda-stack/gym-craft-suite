import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DashboardLayout, useUpdateSetting } from '@/hooks/useAppSettings';

interface DashboardSettingsProps {
  layout: DashboardLayout;
}

export function DashboardSettings({ layout }: DashboardSettingsProps) {
  const updateSetting = useUpdateSetting();

  const toggleSection = (key: keyof DashboardLayout) => {
    updateSetting.mutate({
      key: 'dashboard_layout',
      value: {
        ...layout,
        [key]: !layout[key],
      },
    });
  };

  const sections = [
    { key: 'showIncomeChart' as const, label: 'Graf příjmů (30 dní)' },
    { key: 'showMonthlyChart' as const, label: 'Měsíční přehled' },
    { key: 'showClientCredits' as const, label: 'Přehled kreditů' },
    { key: 'showProductBreakdown' as const, label: 'Prodej produktů' },
    { key: 'showTaxCalculator' as const, label: 'Kalkulátor daní' },
    { key: 'showQuickActions' as const, label: 'Rychlé akce' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground">Zobrazení dashboardu</h4>
            <p className="text-sm text-muted-foreground">
              Vyberte sekce, které chcete zobrazit
            </p>
          </div>
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.key} className="flex items-center justify-between">
                <Label htmlFor={section.key} className="cursor-pointer">
                  {section.label}
                </Label>
                <Switch
                  id={section.key}
                  checked={layout[section.key]}
                  onCheckedChange={() => toggleSection(section.key)}
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}