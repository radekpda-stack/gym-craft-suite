/**
 * Heatmap Summary - Shows key insights from training heatmap data
 */
import { CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

interface HeatmapSummaryProps {
  busiestSlot: { day: number; hour: number; count: number } | null;
  totalTrainings: number;
}

export function HeatmapSummary({ busiestSlot, totalTrainings }: HeatmapSummaryProps) {
  if (!busiestSlot || totalTrainings === 0) {
    return null;
  }

  const dayName = DAYS[busiestSlot.day] || '';
  const hourFormatted = `${busiestSlot.hour}:00`;
  const percentage = Math.round((busiestSlot.count / totalTrainings) * 100);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground px-1">
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Nejčastěji:</span>
        <Badge variant="secondary" className="font-medium">
          {dayName}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <Badge variant="secondary" className="font-medium">
          {hourFormatted}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{percentage}%</span>
        <span>tréninků</span>
      </div>
    </div>
  );
}
