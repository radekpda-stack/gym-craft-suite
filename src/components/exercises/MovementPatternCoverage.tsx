import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Info } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';

interface MovementPatternStats {
  pattern: string;
  label: string;
  count: number;
  percentage: number;
}

interface MovementPatternCoverageProps {
  data: MovementPatternStats[];
  isLoading?: boolean;
}

const PATTERN_COLORS: Record<string, string> = {
  squat: 'bg-blue-500',
  hinge: 'bg-purple-500',
  lunge: 'bg-pink-500',
  push_horizontal: 'bg-orange-500',
  push_vertical: 'bg-amber-500',
  pull_horizontal: 'bg-green-500',
  pull_vertical: 'bg-emerald-500',
  carry: 'bg-cyan-500',
  core_anti_extension: 'bg-indigo-500',
  core_anti_rotation: 'bg-violet-500',
  core_anti_lateral_flexion: 'bg-fuchsia-500',
  rotation: 'bg-rose-500',
  locomotion: 'bg-teal-500',
  conditioning: 'bg-red-500',
  mobility: 'bg-sky-500',
};

export function MovementPatternCoverage({ data, isLoading }: MovementPatternCoverageProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Pohybové vzorce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[140px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Pohybové vzorce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            Žádná data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Pohybové vzorce
          <StatInfoTooltip 
            title="Pohybové vzorce"
            description="Rozložení tréninku podle pohybových vzorců za posledních 30 dní"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 5).map((pattern) => (
          <div key={pattern.pattern} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{pattern.label}</span>
              <span className="font-medium shrink-0">{pattern.percentage}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  PATTERN_COLORS[pattern.pattern] || 'bg-primary'
                )}
                style={{ width: `${pattern.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
