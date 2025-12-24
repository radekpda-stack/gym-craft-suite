import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp } from 'lucide-react';
import type { ComparisonMode } from '@/hooks/useExerciseAnalytics';

interface ComparisonModeToggleProps {
  value: ComparisonMode | undefined;
  onChange: (value: ComparisonMode | undefined) => void;
  labels?: {
    none?: string;
    clients?: string;
    average?: string;
    history?: string;
  };
}

const DEFAULT_LABELS = {
  none: 'Přehled',
  clients: 'Subjekty',
  average: 'Průměr',
  history: 'Historie',
};

export function ComparisonModeToggle({ 
  value, 
  onChange, 
  labels = DEFAULT_LABELS 
}: ComparisonModeToggleProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  
  return (
    <div className="flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-muted-foreground" />
      <Tabs 
        value={value || 'none'} 
        onValueChange={(v) => onChange(v === 'none' ? undefined : v as ComparisonMode)}
      >
        <TabsList className="h-8">
          <TabsTrigger value="none" className="text-xs px-2">{mergedLabels.none}</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs px-2">{mergedLabels.clients}</TabsTrigger>
          <TabsTrigger value="average" className="text-xs px-2">{mergedLabels.average}</TabsTrigger>
          <TabsTrigger value="history" className="text-xs px-2">{mergedLabels.history}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
