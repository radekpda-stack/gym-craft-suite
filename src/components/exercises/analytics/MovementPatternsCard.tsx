import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Layers } from 'lucide-react';

interface MovementPatternItem {
  pattern: string;
  label: string;
  count: number;
}

interface MovementPatternsCardProps {
  data: MovementPatternItem[];
  isLoading?: boolean;
}

const PATTERN_COLORS: Record<string, string> = {
  squat: 'hsl(217, 91%, 60%)',    // blue
  hinge: 'hsl(263, 70%, 50%)',    // purple
  push: 'hsl(25, 95%, 53%)',      // orange
  pull: 'hsl(142, 71%, 45%)',     // green
  carry: 'hsl(187, 85%, 43%)',    // cyan
  rotation: 'hsl(339, 82%, 51%)', // rose
  core: 'hsl(270, 50%, 50%)',     // violet
  lunge: 'hsl(330, 80%, 60%)',    // pink
  locomotion: 'hsl(173, 80%, 40%)', // teal
  conditioning: 'hsl(0, 72%, 51%)', // red
  mobility: 'hsl(199, 89%, 48%)', // sky
};

export function MovementPatternsCard({ data, isLoading }: MovementPatternsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Pohybové vzorce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Pohybové vzorce
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Žádná data
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-medium">Pohybové vzorce</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              barCategoryGap="15%"
            >
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                width={25}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                        <p className="font-medium text-xs">{d.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.count} záznamů
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PATTERN_COLORS[entry.label.toLowerCase()] || 'hsl(var(--primary))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
