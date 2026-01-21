import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, Dumbbell, Trophy, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetricCategory } from '@/types/socialExport';

interface MetricsSelectorProps {
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
  language?: 'cs' | 'en';
}

interface MetricItem {
  id: string;
  label: string;
  labelEn: string;
}

const METRIC_CATEGORIES: Array<{
  id: MetricCategory;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
  metrics: MetricItem[];
}> = [
  {
    id: 'community',
    label: 'Klienti a komunita',
    labelEn: 'Clients & Community',
    icon: <Users className="w-4 h-4" />,
    metrics: [
      { id: 'activeClients', label: 'Aktivní klienti', labelEn: 'Active Clients' },
      { id: 'newClientsThisMonth', label: 'Noví klienti (měsíc)', labelEn: 'New Clients (month)' },
      { id: 'maleVsFemale', label: 'Muži vs Ženy', labelEn: 'Men vs Women' },
      { id: 'leftVsRight', label: 'Leváci vs Praváci', labelEn: 'Left vs Right Handed' },
      { id: 'avgClientAge', label: 'Průměrný věk', labelEn: 'Average Age' },
      { id: 'avgClientLifetimeMonths', label: 'Průměrná spolupráce', labelEn: 'Avg. Partnership' },
      { id: 'longestClientMonths', label: 'Nejdelší spolupráce', labelEn: 'Longest Partnership' },
    ],
  },
  {
    id: 'trainings',
    label: 'Tréninky a hodiny',
    labelEn: 'Trainings & Hours',
    icon: <Dumbbell className="w-4 h-4" />,
    metrics: [
      { id: 'trainingsThisMonth', label: 'Tréninky (měsíc)', labelEn: 'Trainings (month)' },
      { id: 'trainingsThisYear', label: 'Tréninky (rok)', labelEn: 'Trainings (year)' },
      { id: 'trainingsTotal', label: 'Celkem tréninků', labelEn: 'Total Trainings' },
      { id: 'hoursThisMonth', label: 'Hodin (měsíc)', labelEn: 'Hours (month)' },
      { id: 'hoursThisYear', label: 'Hodin (rok)', labelEn: 'Hours (year)' },
      { id: 'hoursTotal', label: 'Celkem hodin', labelEn: 'Total Hours' },
      { id: 'avgTrainingsPerWeek', label: 'Tréninků za týden', labelEn: 'Trainings per Week' },
      { id: 'mostActiveDay', label: 'Nejaktivnější den', labelEn: 'Most Active Day' },
    ],
  },
  {
    id: 'performance',
    label: 'Výkony a rekordy',
    labelEn: 'Performance & PRs',
    icon: <Trophy className="w-4 h-4" />,
    metrics: [
      { id: 'prsThisMonth', label: 'PR tento měsíc', labelEn: 'PRs this Month' },
      { id: 'prsThisYear', label: 'PR tento rok', labelEn: 'PRs this Year' },
      { id: 'prsTotal', label: 'Celkem PR', labelEn: 'Total PRs' },
      { id: 'maxWeightLifted', label: 'Maximální váha', labelEn: 'Max Weight Lifted' },
      { id: 'prVelocity', label: 'PR za týden (průměr)', labelEn: 'PRs per Week (avg)' },
      { id: 'totalVolumeTons', label: 'Celkový objem (tuny)', labelEn: 'Total Volume (tons)' },
    ],
  },
  {
    id: 'exercises',
    label: 'Cviky',
    labelEn: 'Exercises',
    icon: <Target className="w-4 h-4" />,
    metrics: [
      { id: 'uniqueExercises', label: 'Unikátních cviků', labelEn: 'Unique Exercises' },
    ],
  },
];

export function MetricsSelector({ selectedMetrics, onMetricsChange, language = 'cs' }: MetricsSelectorProps) {
  const toggleMetric = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      onMetricsChange(selectedMetrics.filter(m => m !== metricId));
    } else if (selectedMetrics.length < 6) {
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };

  const isCs = language === 'cs';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">
            {isCs ? 'Vyberte metriky' : 'Select Metrics'}
          </p>
          <span className="text-xs text-muted-foreground">
            {selectedMetrics.length}/6 {isCs ? 'vybráno' : 'selected'}
          </span>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {METRIC_CATEGORIES.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-primary">{category.icon}</span>
                  <span className="font-medium text-sm">
                    {isCs ? category.label : category.labelEn}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid grid-cols-1 gap-2">
                  {category.metrics.map((metric) => {
                    const isSelected = selectedMetrics.includes(metric.id);
                    const isDisabled = !isSelected && selectedMetrics.length >= 6;

                    return (
                      <label
                        key={metric.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          isSelected 
                            ? "bg-primary/10 border border-primary/30" 
                            : "hover:bg-muted/50",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMetric(metric.id)}
                          disabled={isDisabled}
                        />
                        <span className="text-sm">
                          {isCs ? metric.label : metric.labelEn}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {selectedMetrics.length >= 6 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {isCs 
              ? 'Maximální počet metrik (6) byl dosažen' 
              : 'Maximum number of metrics (6) reached'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
