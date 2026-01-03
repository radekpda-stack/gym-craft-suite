/**
 * ClientPainMapPreview Component
 * 
 * Visual preview of recent pain areas from feedback
 */
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientInjuryHistory } from '@/hooks/useClientInjuryHistory';

interface ClientPainMapPreviewProps {
  clientId: string;
}

// Simple body area mapping for display
const BODY_AREA_LABELS: Record<string, string> = {
  'neck': 'Krk',
  'shoulder': 'Rameno',
  'shoulders': 'Ramena',
  'upper_back': 'Hrudní páteř',
  'thoracic': 'Hrudní páteř',
  'lower_back': 'Bederní páteř',
  'lumbar': 'Bederní páteř',
  'hip': 'Kyčel',
  'hips': 'Kyčle',
  'knee': 'Koleno',
  'knees': 'Kolena',
  'ankle': 'Kotník',
  'ankles': 'Kotníky',
  'wrist': 'Zápěstí',
  'elbow': 'Loket',
  'si': 'SI kloub',
  'Nespecifikováno': 'Nespecifikováno',
};

export function ClientPainMapPreview({ clientId }: ClientPainMapPreviewProps) {
  const { data, isLoading } = useClientInjuryHistory(clientId);

  if (isLoading) {
    return <Skeleton className="h-16 rounded-xl" />;
  }

  if (!data || Object.keys(data.painFrequency).length === 0) {
    return null;
  }

  // Get top 4 pain areas by frequency
  const topPainAreas = Object.entries(data.painFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const hasActivePain = data.activeInjuries.some(i => i.type === 'feedback_pain');

  return (
    <div className={cn(
      'rounded-xl p-3 border',
      hasActivePain ? 'bg-warning/5 border-warning/20' : 'bg-secondary/30 border-transparent'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className={cn(
          'w-4 h-4',
          hasActivePain ? 'text-warning' : 'text-muted-foreground'
        )} />
        <span className="text-sm font-medium text-foreground">Mapa bolesti</span>
        {hasActivePain && (
          <Badge variant="outline" className="text-xs text-warning border-warning/30">
            Aktivní
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topPainAreas.map(([area, count]) => {
          const isActive = data.activeInjuries.some(
            i => i.type === 'feedback_pain' && i.bodyArea === area
          );
          const label = BODY_AREA_LABELS[area.toLowerCase()] || area;

          return (
            <Badge 
              key={area}
              variant={isActive ? 'destructive' : 'secondary'}
              className={cn(
                'text-xs',
                isActive && 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30'
              )}
            >
              {label}
              <span className="ml-1 opacity-70">({count}×)</span>
            </Badge>
          );
        })}
      </div>

      {/* Most recent pain info */}
      {data.mostRecentPainArea && (
        <p className="text-xs text-muted-foreground mt-2">
          Naposledy: <span className="text-foreground">
            {BODY_AREA_LABELS[data.mostRecentPainArea.toLowerCase()] || data.mostRecentPainArea}
          </span>
        </p>
      )}
    </div>
  );
}
