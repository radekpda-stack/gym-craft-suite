import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';
import type { PeriodType } from '@/hooks/useExerciseAnalytics';

interface PeriodToggleProps {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
  compact?: boolean;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string; shortLabel: string }[] = [
  { value: 'month', label: 'Tento měsíc', shortLabel: 'Měsíc' },
  { value: 'year', label: 'Tento rok', shortLabel: 'Rok' },
  { value: '30days', label: '30 dní', shortLabel: '30d' },
  { value: '90days', label: '90 dní', shortLabel: '90d' },
];

export function PeriodToggle({ value, onChange, compact = false }: PeriodToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <Tabs value={value} onValueChange={(v) => onChange(v as PeriodType)}>
        <TabsList className={compact ? 'h-7' : 'h-8'}>
          {PERIOD_OPTIONS.map(opt => (
            <TabsTrigger 
              key={opt.value} 
              value={opt.value} 
              className={compact ? 'text-xs px-2 py-1' : 'text-xs px-3'}
            >
              {compact ? opt.shortLabel : opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
