import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';

interface Client {
  id: string;
  name: string;
  is_archived?: boolean;
}

interface AnalyticsFiltersBarProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  clientId: string | null;
  onClientChange: (clientId: string | null) => void;
  clients: Client[];
  includeTests: boolean;
  onIncludeTestsChange: (include: boolean) => void;
}

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

export function AnalyticsFiltersBar({
  period,
  onPeriodChange,
  clientId,
  onClientChange,
  clients,
  includeTests,
  onIncludeTestsChange,
}: AnalyticsFiltersBarProps) {
  const handlePeriodChange = (value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      onPeriodChange(numValue as AnalyticsPeriod);
    }
  };

  const handleClientChange = (value: string) => {
    if (!value) {
      onClientChange(null);
    } else {
      onClientChange(value);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 py-3 -mx-4 px-4 border-b border-border/50 shadow-sm rounded-t-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Period Tabs */}
        <Tabs value={String(period)} onValueChange={handlePeriodChange}>
          <TabsList className="h-8 bg-secondary/40 backdrop-blur-sm p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <TabsTrigger 
                key={opt.value} 
                value={String(opt.value)} 
                className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Client Selector */}
        <ClientSearchSelect
          clients={clients}
          value={clientId || ''}
          onValueChange={handleClientChange}
          placeholder="Všichni klienti"
          allowAll
          allLabel="Všichni klienti"
          filterArchived
          className="w-full sm:w-[180px]"
        />

        {/* Include Tests Toggle */}
        <div className="flex items-center gap-2 sm:ml-auto border-t border-border/30 pt-2 sm:border-0 sm:pt-0 w-full sm:w-auto">
          <Switch
            id="include-tests"
            checked={includeTests}
            onCheckedChange={onIncludeTestsChange}
            className="h-4 w-8"
          />
          <Label htmlFor="include-tests" className="text-xs text-muted-foreground cursor-pointer">
            Zahrnout testy
          </Label>
        </div>
      </div>
    </div>
  );
}
