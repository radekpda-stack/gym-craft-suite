/**
 * Pain Area Timeline
 * Visualizes pain area occurrences over time with intensity and trends
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MapPin,
  Activity
} from 'lucide-react';
import { useRecoveryAnalytics, PainAreaHistory } from '@/hooks/useRecoveryAnalytics';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface PainAreaTimelineProps {
  clientId: string;
  className?: string;
  maxAreas?: number;
}

// Localized pain area names
const PAIN_AREA_LABELS: Record<string, string> = {
  knee: 'Koleno',
  knee_left: 'Koleno (L)',
  knee_right: 'Koleno (P)',
  back: 'Záda',
  shoulder: 'Rameno',
  shoulder_left: 'Rameno (L)',
  shoulder_right: 'Rameno (P)',
  hip: 'Kyčel',
  hip_left: 'Kyčel (L)',
  hip_right: 'Kyčel (P)',
  ankle: 'Kotník',
  ankle_left: 'Kotník (L)',
  ankle_right: 'Kotník (P)',
  wrist: 'Zápěstí',
  wrist_left: 'Zápěstí (L)',
  wrist_right: 'Zápěstí (P)',
  neck: 'Krk',
  elbow: 'Loket',
  elbow_left: 'Loket (L)',
  elbow_right: 'Loket (P)',
  other: 'Jiné',
};

const trendConfig = {
  worsening: { 
    icon: TrendingUp, 
    color: 'text-red-500',
    label: 'Zhoršuje se',
    bgColor: 'bg-red-500/10 border-red-500/20',
  },
  stable: { 
    icon: Minus, 
    color: 'text-muted-foreground',
    label: 'Stabilní',
    bgColor: 'bg-muted',
  },
  improving: { 
    icon: TrendingDown, 
    color: 'text-green-500',
    label: 'Zlepšuje se',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
  unknown: { 
    icon: Minus, 
    color: 'text-muted-foreground',
    label: 'Nedostatek dat',
    bgColor: 'bg-muted',
  },
};

function PainAreaRow({ area }: { area: PainAreaHistory }) {
  const TrendIcon = trendConfig[area.trend].icon;
  const trendCfg = trendConfig[area.trend];
  const label = PAIN_AREA_LABELS[area.area] || area.area;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      area.isRecurring ? trendCfg.bgColor : 'bg-muted/30'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{label}</span>
            {area.isRecurring && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Opakující se problém ({area.totalCount}×)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{area.totalCount}× za 30 dní</span>
            {area.averageIntensity && (
              <span>Ø intenzita: {area.averageIntensity.toFixed(1)}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <TrendIcon className={cn("h-4 w-4", trendCfg.color)} />
          <span className={cn("text-xs", trendCfg.color)}>{trendCfg.label}</span>
        </div>
      </div>
      
      {/* Intensity bar */}
      {area.averageIntensity && (
        <div className="mt-2">
          <Progress 
            value={(area.averageIntensity / 10) * 100} 
            className={cn(
              "h-1.5",
              area.averageIntensity >= 7 ? "[&>div]:bg-red-500" :
              area.averageIntensity >= 4 ? "[&>div]:bg-orange-500" :
              "[&>div]:bg-yellow-500"
            )}
          />
        </div>
      )}
      
      {/* Timeline dots */}
      {area.occurrences.length > 1 && (
        <div className="flex items-center gap-1 mt-2 overflow-x-auto">
          {area.occurrences.slice(0, 10).map((occ, i) => (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      occ.intensity >= 7 ? "bg-red-500" :
                      occ.intensity >= 4 ? "bg-orange-500" :
                      "bg-yellow-500",
                      occ.isNew === false && "ring-1 ring-offset-1 ring-blue-500"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p>{format(new Date(occ.date), 'd.M.yyyy', { locale: cs })}</p>
                    <p>Intenzita: {occ.intensity}/10</p>
                    {occ.isNew === false && <p className="text-blue-400">Přetrvávající</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {area.occurrences.length > 10 && (
            <span className="text-xs text-muted-foreground ml-1">
              +{area.occurrences.length - 10}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PainAreaTimeline({ clientId, className, maxAreas = 5 }: PainAreaTimelineProps) {
  const { data, isLoading } = useRecoveryAnalytics(clientId);
  
  if (isLoading) {
    return (
      <Card className={cn("jm-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-h3 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Problémové oblasti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  const painAreas = data?.painAreaHistory ?? [];
  const displayAreas = painAreas.slice(0, maxAreas);
  const recurringCount = painAreas.filter(a => a.isRecurring).length;
  
  if (painAreas.length === 0) {
    return (
      <Card className={cn("jm-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-h3 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Problémové oblasti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Žádné bolestivé oblasti za posledních 30 dní</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("jm-card", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-h3 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Problémové oblasti
          </CardTitle>
          {recurringCount > 0 && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              {recurringCount} opakující se
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayAreas.map((area) => (
          <PainAreaRow key={area.area} area={area} />
        ))}
        
        {painAreas.length > maxAreas && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{painAreas.length - maxAreas} dalších oblastí
          </p>
        )}
      </CardContent>
    </Card>
  );
}
