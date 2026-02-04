/**
 * MultiClientComparison - Compare progress of multiple clients side-by-side
 * Design: Overlay charts with client color coding
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Plus, X, Search, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllClientsProgress, useClientProgressStats } from '@/hooks/useClientProgressStats';

const CLIENT_COLORS = [
  'hsl(142 76% 45%)', // emerald
  'hsl(217 91% 60%)', // blue
  'hsl(38 92% 50%)',  // amber
  'hsl(280 87% 65%)', // purple
];

interface SelectedClient {
  id: string;
  name: string;
  color: string;
}

export function MultiClientComparison() {
  const navigate = useNavigate();
  const [selectedClients, setSelectedClients] = useState<SelectedClient[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);

  // Fetch all clients
  const { data: allClients = [], isLoading: clientsLoading } = useAllClientsProgress();

  // Fetch progress for each selected client
  const client1Stats = useClientProgressStats({ clientId: selectedClients[0]?.id || null, limit: 20 });
  const client2Stats = useClientProgressStats({ clientId: selectedClients[1]?.id || null, limit: 20 });
  const client3Stats = useClientProgressStats({ clientId: selectedClients[2]?.id || null, limit: 20 });
  const client4Stats = useClientProgressStats({ clientId: selectedClients[3]?.id || null, limit: 20 });

  const clientStats = [client1Stats, client2Stats, client3Stats, client4Stats];

  // Get common exercises across selected clients
  const commonExercises = useMemo(() => {
    const exerciseCounts = new Map<string, number>();
    
    selectedClients.forEach((_, index) => {
      const stats = clientStats[index].data;
      if (stats) {
        stats.topExercises.forEach(ex => {
          exerciseCounts.set(ex.exerciseName, (exerciseCounts.get(ex.exerciseName) || 0) + 1);
        });
      }
    });

    // Return exercises that appear in at least 1 client
    return Array.from(exerciseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [selectedClients, clientStats]);

  // Build comparison chart data
  const chartData = useMemo(() => {
    if (!selectedExercise || selectedClients.length === 0) return [];

    // Gather all dates and values
    const dateValueMap = new Map<string, Record<string, number>>();

    selectedClients.forEach((client, index) => {
      const stats = clientStats[index].data;
      if (!stats) return;

      const exercise = stats.topExercises.find(ex => ex.exerciseName === selectedExercise);
      if (!exercise) return;

      exercise.sparklineData.forEach(point => {
        if (!dateValueMap.has(point.date)) {
          dateValueMap.set(point.date, {});
        }
        dateValueMap.get(point.date)![client.name] = point.value;
      });
    });

    // Convert to array sorted by date
    return Array.from(dateValueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        ...values,
      }));
  }, [selectedExercise, selectedClients, clientStats]);

  // Max values for bar comparison
  const maxValues = useMemo(() => {
    if (!selectedExercise) return [];

    return selectedClients.map((client, index) => {
      const stats = clientStats[index].data;
      if (!stats) return { name: client.name, value: 0, color: client.color };

      const exercise = stats.topExercises.find(ex => ex.exerciseName === selectedExercise);
      return {
        name: client.name,
        value: exercise?.lastValue || 0,
        color: client.color,
      };
    }).filter(v => v.value > 0);
  }, [selectedExercise, selectedClients, clientStats]);

  const maxValue = Math.max(...maxValues.map(v => v.value), 1);

  // Filter available clients (not already selected)
  const availableClients = allClients.filter(
    c => !selectedClients.some(sc => sc.id === c.id) &&
         c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addClient = (clientId: string) => {
    if (selectedClients.length >= 4) return;
    
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;

    setSelectedClients(prev => [
      ...prev,
      {
        id: client.id,
        name: client.name,
        color: CLIENT_COLORS[prev.length],
      },
    ]);
    setAddClientOpen(false);
    setSearchQuery('');
  };

  const removeClient = (clientId: string) => {
    setSelectedClients(prev => {
      const filtered = prev.filter(c => c.id !== clientId);
      // Reassign colors
      return filtered.map((c, i) => ({ ...c, color: CLIENT_COLORS[i] }));
    });
  };

  const isLoading = clientStats.some((s, i) => i < selectedClients.length && s.isLoading);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/15 shadow-lg shadow-accent/25">
            <BarChart2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Porovnání klientů</h3>
            <p className="text-[10px] text-muted-foreground">
              Porovnejte pokrok až 4 klientů ve stejném cviku
            </p>
          </div>
        </div>

        {/* Selected Clients */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedClients.map(client => (
            <Badge
              key={client.id}
              variant="secondary"
              className="pl-3 pr-1 py-1.5 text-sm gap-2"
              style={{ borderColor: client.color, borderWidth: 2 }}
            >
              <span style={{ color: client.color }}>●</span>
              {client.name}
              <button
                onClick={() => removeClient(client.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {selectedClients.length < 4 && (
            <Popover open={addClientOpen} onOpenChange={setAddClientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Plus className="w-4 h-4" />
                  Přidat klienta
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  <Input
                    placeholder="Hledat klienta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {clientsLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : availableClients.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        Žádní další klienti
                      </p>
                    ) : (
                      availableClients.slice(0, 10).map(client => (
                        <button
                          key={client.id}
                          onClick={() => addClient(client.id)}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted text-left text-sm"
                        >
                          <span>{client.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {client.entriesCount} zázn.
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Exercise Selector */}
        {selectedClients.length >= 2 && (
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="w-full bg-background/60">
              <SelectValue placeholder="Vyberte cvik pro porovnání..." />
            </SelectTrigger>
            <SelectContent>
              {commonExercises.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Žádné společné cviky
                </div>
              ) : (
                commonExercises.map(exercise => (
                  <SelectItem key={exercise} value={exercise}>
                    {exercise}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Comparison Charts */}
      {selectedClients.length >= 2 && selectedExercise && (
        <div className="space-y-4">
          {/* Bar Comparison */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-foreground text-sm">Aktuální maximum</h4>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {maxValues.map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-bold tabular-nums">{item.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / maxValue) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Chart Overlay */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-foreground text-sm">Progrese v čase</h4>
            
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Nedostatek dat pro zobrazení grafu
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}.${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    {selectedClients.map(client => (
                      <Line
                        key={client.id}
                        type="monotone"
                        dataKey={client.name}
                        stroke={client.color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: client.color }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedClients.length < 2 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium mb-2">Vyberte alespoň 2 klienty</p>
          <p className="text-sm">
            Pro porovnání pokroku přidejte klienty pomocí tlačítka výše
          </p>
        </div>
      )}
    </div>
  );
}
