import { useState } from 'react';
import { Search, Plus, Dumbbell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useClients';
import {
  useTrainingSessions,
  useCreateTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useAddTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { SessionCard } from '@/components/ui/session-card';

const statusLabels = {
  scheduled: 'Naplánováno',
  completed: 'Dokončeno',
  canceled: 'Zrušeno',
};

export default function Trainings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const createTraining = useCreateTrainingSession();
  const trainingPrices = useTrainingPrices();
  const addTrainingTags = useAddTrainingSessionTags();

  const filteredSessions = sessions.filter((session) => {
    const client = clients.find((c) => c.id === session.client_id);
    const matchesSearch =
      client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    // Calculate recurrence end date if recurring
    let recurrence_end_date: string | undefined;
    let recurrence_type: 'weekly' | 'biweekly' | 'monthly' | undefined;
    
    if (data.is_recurring && data.recurrence_type && data.recurrence_count) {
      const startDate = new Date(data.date);
      const count = data.recurrence_count;
      recurrence_type = data.recurrence_type;
      
      // Calculate end date based on recurrence type
      const endDate = new Date(startDate);
      switch (data.recurrence_type) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + (count * 7));
          break;
        case 'biweekly':
          endDate.setDate(endDate.getDate() + (count * 14));
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + count);
          break;
      }
      recurrence_end_date = endDate.toISOString();
    }
    
    const result = await createTraining.mutateAsync({
      client_id: data.client_id,
      date: new Date(data.date).toISOString(),
      duration: data.duration,
      notes: data.notes,
      subjective_rating: data.subjective_rating || undefined,
      status: data.status,
      participant_count: data.participant_count,
      recurrence_type,
      recurrence_end_date,
      trainingPrices,
    });
    
    // Add tags to the created training
    if (tagIds.length > 0 && result?.session?.id) {
      await addTrainingTags.mutateAsync({
        trainingSessionId: result.session.id,
        tagIds,
      });
    }
    
    setIsCreateSheetOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Tréninky
          </h1>
          <p className="text-muted-foreground mt-1">
            {sessions.length} tréninků celkem
          </p>
        </div>

        <Button className="gap-2" onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Nový trénink
        </Button>
      </div>

      <CreateTrainingSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat tréninky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
            className="rounded-xl"
          >
            Všechny
          </Button>
          {(['scheduled', 'completed', 'canceled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className="rounded-xl"
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session, index) => {
            const client = clients.find((c) => c.id === session.client_id);

            return (
              <div
                key={session.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <SessionCard
                  session={session}
                  client={client}
                />
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredSessions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {sessions.length === 0 ? "Zatím nemáte žádné tréninky" : "Žádné tréninky nenalezeny"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {sessions.length === 0
              ? "Vytvořte první trénink kliknutím na tlačítko výše"
              : "Zkuste upravit vyhledávání nebo filtry"}
          </p>
        </div>
      )}
    </div>
  );
}
