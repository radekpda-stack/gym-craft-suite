import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRxWorkouts, RxScoringMode } from '@/hooks/useRxWorkouts';
import { RxWorkoutCard } from '@/components/rx/RxWorkoutCard';
import { RxImportDialog } from '@/components/rx/RxImportDialog';
import { 
  Plus, 
  Timer, 
  Repeat, 
  Weight, 
  Dumbbell,
  FileText,
  Loader2,
} from 'lucide-react';

export default function RxWorkouts() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const scoringFilter = activeTab === 'all' ? undefined : activeTab as RxScoringMode;
  const { data: workouts = [], isLoading } = useRxWorkouts(scoringFilter);

  const tabConfig = [
    { value: 'all', label: 'Vše', icon: Dumbbell },
    { value: 'for_time', label: 'For Time', icon: Timer },
    { value: 'amrap', label: 'AMRAP', icon: Repeat },
    { value: 'max_load', label: 'Max Load', icon: Weight },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-6 w-6" />
            RX Workouty
          </h1>
          <p className="text-muted-foreground">
            Standardizované benchmarky pro měření výkonnosti
          </p>
        </div>
        <Button onClick={() => setImportDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Import z textu
        </Button>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabConfig.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Zatím žádné RX workouty</h3>
              <p className="text-muted-foreground mb-4">
                Importujte svůj první workout pomocí textového formátu
              </p>
              <Button onClick={() => setImportDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Importovat workout
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workouts.map((workout) => (
                <RxWorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import dialog */}
      <RxImportDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen} 
      />
    </div>
  );
}
