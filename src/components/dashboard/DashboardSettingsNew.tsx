import { Settings2, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

export interface NewDashboardLayout {
  showKPICards: boolean;
  showFinancialChart: boolean;
  showProductSales: boolean;
  showTrainingActivity: boolean;
  showCapacityTrend: boolean;
  showTopClients: boolean;
  showPerformanceMetrics: boolean;
  showFeedbackTrends: boolean;
}

interface DashboardSettingsNewProps {
  layout: NewDashboardLayout;
  onToggleSection: (key: keyof NewDashboardLayout) => void;
  onResetDefaults: () => void;
}

const SECTIONS = [
  { key: 'showKPICards' as const, label: 'KPI karty', description: 'Hlavní metriky (příjem, zisk, tréninky...)' },
  { key: 'showFinancialChart' as const, label: 'Finanční přehled', description: 'Graf příjmů, nákladů a zisku' },
  { key: 'showProductSales' as const, label: 'Prodeje produktů', description: 'Trend prodejů a top produkty' },
  { key: 'showTrainingActivity' as const, label: 'Tréninková aktivita', description: 'Graf tréninkové aktivity' },
  { key: 'showCapacityTrend' as const, label: 'Trend obsazenosti', description: 'Vývoj obsazenosti kapacity v čase' },
  { key: 'showTopClients' as const, label: 'Nejčastější klienti', description: 'Žebříček top 5 klientů' },
  { key: 'showPerformanceMetrics' as const, label: 'Výkonnostní metriky', description: 'Cviky, PR, vývoj síly' },
  { key: 'showFeedbackTrends' as const, label: 'Negativní trendy', description: 'Klienti s opakovaně špatnými hodnotami' },
];

export function DashboardSettingsNew({ layout, onToggleSection, onResetDefaults }: DashboardSettingsNewProps) {
  const enabledCount = Object.values(layout).filter(Boolean).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nastavení dashboardu</SheetTitle>
          <SheetDescription>
            Vyberte sekce, které chcete zobrazit na dashboardu
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="p-3 rounded-xl bg-secondary/50">
            <p className="text-sm text-muted-foreground">
              Aktivní sekce: <span className="font-medium text-foreground">{enabledCount}</span> z {SECTIONS.length}
            </p>
          </div>

          {/* Sections list */}
          <div className="space-y-4">
            {SECTIONS.map((section) => (
              <div
                key={section.key}
                className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Label htmlFor={section.key} className="cursor-pointer font-medium">
                    {section.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                </div>
                <Switch
                  id={section.key}
                  checked={layout[section.key]}
                  onCheckedChange={() => onToggleSection(section.key)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Reset button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onResetDefaults}
          >
            <RotateCcw className="w-4 h-4" />
            Obnovit výchozí nastavení
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
