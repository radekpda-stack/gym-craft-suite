import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Zap } from 'lucide-react';
import { StatInfoTooltip } from './StatInfoTooltip';
import { cn } from '@/lib/utils';
import type { GlobalTagStat } from '@/hooks/useGlobalTrainingTagStats';

const SECTION_CONFIG = {
  focus: {
    title: 'Zaměření',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    tooltip: {
      description: "Distribuce tréninků podle hlavního zaměření (síla, vytrvalost, mobilita, atd.).",
      calculation: "Počet přiřazených štítků typu 'focus' k dokončeným tréninkům ÷ celkový počet tréninků × 100."
    }
  },
  bodyPart: {
    title: 'Partie těla',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    tooltip: {
      description: "Které části těla trénujete nejčastěji.",
      calculation: "Počet přiřazených štítků typu 'body_part' k dokončeným tréninkům."
    }
  },
  intensity: {
    title: 'Intenzita',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    tooltip: {
      description: "Rozložení intenzity vašich tréninků.",
      calculation: "Počet přiřazených štítků typu 'intensity' k dokončeným tréninkům."
    }
  }
};

interface DistributionSectionProps {
  sectionKey: 'focus' | 'bodyPart' | 'intensity';
  icon: React.ReactNode;
  distribution: GlobalTagStat[];
  maxItems?: number;
}

function DistributionSection({ sectionKey, icon, distribution, maxItems = 5 }: DistributionSectionProps) {
  const items = distribution.slice(0, maxItems);
  const config = SECTION_CONFIG[sectionKey];

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{config.title}</span>
          <StatInfoTooltip
            title={config.title}
            description={config.tooltip.description}
            calculation={config.tooltip.calculation}
          />
        </div>
        <p className="text-xs text-muted-foreground italic">Žádná data</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{config.title}</span>
        <StatInfoTooltip
          title={config.title}
          description={config.tooltip.description}
          calculation={config.tooltip.calculation}
        />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.tagId} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.tagColor }}
                />
                <span className="truncate">{item.tagName}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground shrink-0">
                <span className="text-[10px] sm:text-xs">{item.percentage}%</span>
                <Badge variant="secondary" className="text-[10px] px-1 sm:px-1.5 py-0">
                  {item.count}×
                </Badge>
              </div>
            </div>
            <Progress 
              value={item.percentage} 
              className="h-1.5"
              style={{ 
                '--progress-background': item.tagColor,
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface GlobalTagDistributionCardProps {
  focusDistribution: GlobalTagStat[];
  bodyPartDistribution: GlobalTagStat[];
  intensityDistribution: GlobalTagStat[];
  className?: string;
}

export function GlobalTagDistributionCard({
  focusDistribution,
  bodyPartDistribution,
  intensityDistribution,
  className,
}: GlobalTagDistributionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          Distribuce tagů tréninků
          <StatInfoTooltip
            title="Distribuce tagů"
            description="Přehled nejčastěji používaných štítků na vašich trénincích."
            calculation="Štítky přiřazené k dokončeným tréninkům, seskupené podle typu."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DistributionSection
          sectionKey="focus"
          icon={<Target className="h-4 w-4 text-primary" />}
          distribution={focusDistribution}
        />
        
        <DistributionSection
          sectionKey="bodyPart"
          icon={<Activity className="h-4 w-4 text-emerald-500" />}
          distribution={bodyPartDistribution}
        />
        
        <DistributionSection
          sectionKey="intensity"
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          distribution={intensityDistribution}
        />
      </CardContent>
    </Card>
  );
}
