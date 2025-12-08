import { Client } from "@/hooks/useClients";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface GenderStatisticsProps {
  clients: Client[];
}

export function GenderStatistics({ clients }: GenderStatisticsProps) {
  const maleCount = clients.filter(c => c.gender === 'male').length;
  const femaleCount = clients.filter(c => c.gender === 'female').length;
  const unknownCount = clients.filter(c => !c.gender).length;
  const total = clients.length;

  const malePercent = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((femaleCount / total) * 100) : 0;

  const data = [
    { name: 'Muži', value: maleCount, color: 'hsl(var(--primary))' },
    { name: 'Ženy', value: femaleCount, color: 'hsl(var(--accent))' },
  ].filter(d => d.value > 0);

  if (total === 0) {
    return (
      <div className="p-4 glass rounded-xl text-center text-muted-foreground">
        Žádní klienti k zobrazení
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 glass rounded-xl sm:rounded-2xl">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Statistika pohlaví</h3>
      
      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div className="w-24 h-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} klientů`, '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm">Muži</span>
            </div>
            <span className="text-sm font-medium">{maleCount} ({malePercent}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-sm">Ženy</span>
            </div>
            <span className="text-sm font-medium">{femaleCount} ({femalePercent}%)</span>
          </div>
          {unknownCount > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">Neuvedeno: {unknownCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}