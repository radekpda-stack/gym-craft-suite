/**
 * PreviousTrainingFeedbackCard - Displays client feedback from previous training
 * Shows visual progress bars for soreness, energy, pain, and session fit
 */

import { cn } from '@/lib/utils';
import { LastTrainingFeedback } from '@/hooks/useLastTraining';
import { Progress } from '@/components/ui/progress';
import { MessageSquare } from 'lucide-react';

interface PreviousTrainingFeedbackCardProps {
  feedback: LastTrainingFeedback;
}

interface MetricConfig {
  key: keyof LastTrainingFeedback;
  label: string;
  inverted?: boolean; // Higher = worse (soreness, pain)
  getLabel: (value: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'soreness',
    label: 'Svalovka',
    inverted: true,
    getLabel: (v) => {
      if (v <= 2) return 'Minimální';
      if (v <= 4) return 'Mírná';
      if (v <= 6) return 'Střední';
      if (v <= 8) return 'Výrazná';
      return 'Extrémní';
    },
  },
  {
    key: 'energy_rating',
    label: 'Energie',
    inverted: false,
    getLabel: (v) => {
      if (v <= 2) return 'Vyčerpaný';
      if (v <= 4) return 'Unavený';
      if (v <= 6) return 'OK';
      if (v <= 8) return 'Dobrá';
      return 'Plný energie';
    },
  },
  {
    key: 'pain',
    label: 'Bolest',
    inverted: true,
    getLabel: (v) => {
      if (v <= 2) return 'Minimální';
      if (v <= 4) return 'Mírná';
      if (v <= 6) return 'Střední';
      if (v <= 8) return 'Silná';
      return 'Extrémní';
    },
  },
  {
    key: 'session_fit',
    label: 'Seděl mu',
    inverted: false,
    getLabel: (v) => {
      if (v <= 2) return 'Vůbec ne';
      if (v <= 4) return 'Trochu';
      if (v <= 6) return 'OK';
      if (v <= 8) return 'Dobře';
      return 'Výborně';
    },
  },
];

function getProgressColor(value: number, inverted: boolean): string {
  const effectiveValue = inverted ? 11 - value : value;
  
  if (effectiveValue <= 3) return 'bg-destructive';
  if (effectiveValue <= 5) return 'bg-warning';
  if (effectiveValue <= 7) return 'bg-primary';
  return 'bg-success';
}

function isAlertValue(value: number, config: MetricConfig): boolean {
  if (config.inverted) {
    return value >= 7; // High soreness/pain is a concern
  }
  return value <= 3; // Low energy/session_fit is a concern
}

export function PreviousTrainingFeedbackCard({ feedback }: PreviousTrainingFeedbackCardProps) {
  const hasAnyData = METRICS.some((m) => {
    const val = feedback[m.key];
    return typeof val === 'number' && val > 0;
  });

  if (!hasAnyData) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <MessageSquare className="w-3 h-3" />
        Feedback od klienta (D+1)
      </div>
      
      <div className="space-y-2.5">
        {METRICS.map((metric) => {
          const value = feedback[metric.key];
          if (typeof value !== 'number' || value <= 0) return null;

          const isAlert = isAlertValue(value, metric);
          const colorClass = getProgressColor(value, metric.inverted ?? false);

          return (
            <div key={metric.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  "font-medium",
                  isAlert && "text-warning"
                )}>
                  {metric.label}
                </span>
                <span className={cn(
                  "text-muted-foreground",
                  isAlert && "text-warning font-medium"
                )}>
                  {value}/10 · {metric.getLabel(value)}
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full transition-all", colorClass)}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Muscle soreness areas */}
      {feedback.muscle_soreness && feedback.muscle_soreness.length > 0 && (
        <div className="pt-1">
          <span className="text-xs text-muted-foreground">
            Svalovka: {feedback.muscle_soreness.join(', ')}
          </span>
        </div>
      )}

      {/* Client comment */}
      {feedback.comment && (
        <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground italic">
          "{feedback.comment}"
        </div>
      )}
    </div>
  );
}
