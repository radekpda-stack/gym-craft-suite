import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import { StatInfoTooltip } from './StatInfoTooltip';
import type { TrainingTypeStat } from '@/hooks/useGlobalTrainingTagStats';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',  // emerald
  'hsl(217, 91%, 60%)',  // blue
  'hsl(45, 93%, 47%)',   // amber
  'hsl(280, 65%, 60%)',  // purple
  'hsl(350, 89%, 60%)',  // rose
  'hsl(175, 77%, 40%)',  // teal
  'hsl(24, 95%, 53%)',   // orange
];

interface TrainingTypeDistributionCardProps {
  distribution: TrainingTypeStat[];
  className?: string;
}

export function TrainingTypeDistributionCard({
  distribution,
  className,
}: TrainingTypeDistributionCardProps) {
  const chartData = distribution.map((item, index) => ({
    name: item.label,
    value: item.count,
    color: COLORS[index % COLORS.length],
  }));

  if (distribution.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 text-primary" />
            Typy tréninků
            <StatInfoTooltip
              title="Distribuce typů tréninků"
              description="Rozdělení vašich tréninků podle jejich typu."
              calculation="Počet tréninků každého typu ÷ celkový počet tréninků × 100."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Žádné dokončené tréninky
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Activity className="h-4 w-4 text-primary" />
          Typy tréninků
          <StatInfoTooltip
            title="Distribuce typů tréninků"
            description="Rozdělení vašich tréninků podle jejich typu (silový, kondiční, kardio, atd.)."
            calculation="Počet tréninků každého typu ÷ celkový počet tréninků × 100."
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Pie Chart */}
          <div className="h-[160px] sm:h-[180px] w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}×`, 'Počet']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with progress bars */}
          <div className="flex-1 space-y-2">
            {distribution.slice(0, 6).map((item, index) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate">{item.label}</span>
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
                    '--progress-background': COLORS[index % COLORS.length],
                  } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
