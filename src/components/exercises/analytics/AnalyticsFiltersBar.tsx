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
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 -mx-4 px-4 border-b">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Period Tabs */}
        <Tabs value={String(period)} onValueChange={handlePeriodChange}>
          <TabsList className="h-8">
            {PERIOD_OPTIONS.map((opt) => (
              <TabsTrigger 
                key={opt.value} 
                value={String(opt.value)} 
                className="text-xs px-3 h-7"
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
        <div className="flex items-center gap-2 ml-auto">
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
