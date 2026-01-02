import { useState, useMemo } from 'react';
import { TrendingUp, Filter, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressEntryForm } from '@/components/progress/ProgressEntryForm';
import { ProgressList } from '@/components/progress/ProgressList';
import { ProgressChart } from '@/components/progress/ProgressChart';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { useClients } from '@/hooks/useClients';
import { ClientSearchSelect } from '@/components/ui/client-search-select';

export default function ProgressContent() {
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  
  const { data: clients = [] } = useClients();
  const { entries, isLoading } = useExerciseEntries(
    selectedClient !== 'all' ? selectedClient : undefined
  );

  // Get unique exercises from entries
  const uniqueExercises = useMemo(() => {
    const exerciseSet = new Set(entries.map(e => e.exercise_name));
    return Array.from(exerciseSet).sort();
  }, [entries]);

  // Get selected client name
  const selectedClientData = useMemo(() => {
    if (selectedClient === 'all') return null;
    return clients.find(c => c.id === selectedClient);
  }, [clients, selectedClient]);

  // Get PRs count
  const prsCount = useMemo(() => {
    return entries.filter(e => e.is_pr).length;
  }, [entries]);

  // Get stats
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const uniqueClients = new Set(entries.map(e => e.client_id)).size;
    const uniqueExercisesCount = uniqueExercises.length;
    
    return { totalEntries, uniqueClients, uniqueExercisesCount, prsCount };
  }, [entries, uniqueExercises, prsCount]);

  return (
    <div className="space-y-6">
      {/* Header with form */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span><strong className="text-foreground">{stats.totalEntries}</strong> záznamů</span>
          <span>•</span>
          <span><strong className="text-foreground">{stats.uniqueExercisesCount}</strong> cviků</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-foreground">{stats.prsCount}</strong> PR
          </span>
        </div>
        <ProgressEntryForm />
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Klient</label>
              <ClientSearchSelect
                clients={clients.filter(c => !c.is_archived)}
                value={selectedClient === 'all' ? '' : selectedClient}
                onValueChange={(v) => setSelectedClient(v || 'all')}
                placeholder="Vyberte klienta"
                allowAll
                allLabel="Všichni klienti"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Cvik</label>
              <Select 
                value={selectedExercise} 
                onValueChange={setSelectedExercise}
                disabled={!uniqueExercises.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cvik pro graf" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueExercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Seznam</TabsTrigger>
          <TabsTrigger value="charts">Grafy</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {isLoading ? (
            <Card className="glass">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">Načítám...</div>
              </CardContent>
            </Card>
          ) : (
            <ProgressList 
              entries={entries} 
              showClient={selectedClient === 'all'} 
            />
          )}
        </TabsContent>

        <TabsContent value="charts">
          {selectedClient !== 'all' && selectedExercise && selectedClientData ? (
            <ProgressChart
              clientId={selectedClient}
              exerciseName={selectedExercise}
              clientName={selectedClientData.name}
            />
          ) : (
            <Card className="glass">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Pro zobrazení grafu vyberte:</p>
                <ul className="text-sm space-y-1">
                  {selectedClient === 'all' && <li>• Konkrétního klienta (ne "Všichni klienti")</li>}
                  {!selectedExercise && <li>• Cvik z výběru</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
