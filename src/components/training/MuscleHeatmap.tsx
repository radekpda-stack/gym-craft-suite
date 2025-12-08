import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Snowflake, ThermometerSun, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapData {
  name: string;
  value: number; // days since last trained
  heatLevel: 'hot' | 'warm' | 'cold' | 'frozen' | 'never';
  entries: number;
}

interface MuscleHeatmapProps {
  data: HeatmapData[];
}

const heatColors = {
  hot: 'bg-green-500',
  warm: 'bg-lime-400',
  cold: 'bg-blue-400',
  frozen: 'bg-blue-600',
  never: 'bg-muted',
};

const heatTextColors = {
  hot: 'text-green-100',
  warm: 'text-lime-900',
  cold: 'text-blue-100',
  frozen: 'text-blue-100',
  never: 'text-muted-foreground',
};

const heatLabels = {
  hot: 'Nedávno trénováno',
  warm: 'Tento týden',
  cold: 'Před více než týdnem',
  frozen: 'Více než 14 dní',
  never: 'Netrénováno',
};

export function MuscleHeatmap({ data }: MuscleHeatmapProps) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ThermometerSun className="w-5 h-5" />
          Heatmapa trénovanosti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">≤3 dny</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-lime-400" />
            <span className="text-muted-foreground">4-7 dní</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-muted-foreground">8-14 dní</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-muted-foreground">&gt;14 dní</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-muted-foreground">Netrénováno</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.map((item) => (
            <div
              key={item.name}
              className={cn(
                'p-3 rounded-xl transition-all hover:scale-105',
                heatColors[item.heatLevel]
              )}
            >
              <div className={cn('font-medium text-sm', heatTextColors[item.heatLevel])}>
                {item.name}
              </div>
              <div className={cn('text-xs mt-1 opacity-80', heatTextColors[item.heatLevel])}>
                {item.heatLevel === 'never'
                  ? 'Žádné záznamy'
                  : item.value <= 1
                  ? 'Dnes/včera'
                  : `Před ${item.value} dny`}
              </div>
              <div className={cn('text-xs mt-0.5 opacity-70', heatTextColors[item.heatLevel])}>
                {item.entries} záznamů
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">
              Aktivní: {data.filter((d) => d.heatLevel === 'hot' || d.heatLevel === 'warm').length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Snowflake className="w-4 h-4 text-blue-500" />
            <span className="text-muted-foreground">
              Zanedbané: {data.filter((d) => d.heatLevel === 'frozen' || d.heatLevel === 'never').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
