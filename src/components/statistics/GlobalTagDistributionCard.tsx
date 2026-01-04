import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Zap } from 'lucide-react';
import type { GlobalTagStat } from '@/hooks/useGlobalTrainingTagStats';

interface DistributionSectionProps {
  title: string;
  icon: React.ReactNode;
  distribution: GlobalTagStat[];
  maxItems?: number;
}

function DistributionSection({ title, icon, distribution, maxItems = 5 }: DistributionSectionProps) {
  const items = distribution.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <p className="text-xs text-muted-foreground italic">Žádná data</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.tagId} className="space-y-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.tagColor }}
                />
                <span className="truncate">{item.tagName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{item.percentage}%</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        <CardTitle className="text-base sm:text-lg">Distribuce tagů tréninků</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DistributionSection
          title="Zaměření"
          icon={<Target className="h-4 w-4 text-primary" />}
          distribution={focusDistribution}
        />
        
        <DistributionSection
          title="Partie těla"
          icon={<Activity className="h-4 w-4 text-emerald-500" />}
          distribution={bodyPartDistribution}
        />
        
        <DistributionSection
          title="Intenzita"
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          distribution={intensityDistribution}
        />
      </CardContent>
    </Card>
  );
}
