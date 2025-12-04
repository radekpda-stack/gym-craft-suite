import { useState } from 'react';
import { Plus, Search, Stethoscope, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients } from '@/hooks/useClients';
import { useCreateDiagnostic } from '@/hooks/useDiagnostics';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { mockJoints, mockMuscleGroups } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Diagnostics() {
  const { data: clients = [] } = useClients();
  const createDiagnostic = useCreateDiagnostic();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<'lower' | 'upper' | 'spine' | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateDiagnostic = async (data: any) => {
    await createDiagnostic.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      area_type: data.area_type,
      area_name: data.area_name,
      findings: data.findings,
      notes: data.notes,
    });
    setIsCreateOpen(false);
  };

  const filteredJoints = mockJoints.filter(
    (joint) => !selectedBodyPart || joint.bodyPart === selectedBodyPart
  );

  const groupedMuscles = mockMuscleGroups.reduce((acc, muscle) => {
    if (!acc[muscle.category]) {
      acc[muscle.category] = [];
    }
    acc[muscle.category].push(muscle);
    return acc;
  }, {} as Record<string, typeof mockMuscleGroups>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Diagnostika
          </h1>
          <p className="text-muted-foreground mt-1">
            Diagnostické záznamy klientů
          </p>
        </div>

        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Nová diagnostika
        </Button>
      </div>

      <CreateDiagnosticSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateDiagnostic}
        isLoading={createDiagnostic.isPending}
        clients={clients}
        defaultClientId={selectedClient || undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Vybrat klienta</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Hledat klienta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-secondary border-border rounded-xl"
            />
          </div>

          <div className="space-y-2">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200',
                  selectedClient === client.id
                    ? 'bg-primary text-primary-foreground'
                    : 'glass hover:bg-secondary'
                )}
              >
                <ClientAvatar name={client.name} size="md" />
                <div className="flex-1 text-left">
                  <p className="font-medium">{client.name}</p>
                  <p className={cn(
                    'text-sm',
                    selectedClient === client.id
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}>
                    {client.training_goals?.[0] || 'Bez cíle'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Joints */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Klouby</h2>
          
          <div className="flex gap-2">
            {(['lower', 'upper', 'spine'] as const).map((part) => (
              <Button
                key={part}
                variant={selectedBodyPart === part ? 'default' : 'outline'}
                onClick={() => setSelectedBodyPart(selectedBodyPart === part ? null : part)}
                className="rounded-xl flex-1"
              >
                {part === 'lower' ? 'Dolní' : part === 'upper' ? 'Horní' : 'Páteř'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredJoints.map((joint) => (
              <button
                key={joint.id}
                className="glass p-4 rounded-xl text-left transition-all duration-200 hover:bg-secondary hover:glow group"
              >
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {joint.nameCs}
                </p>
                <p className="text-sm text-muted-foreground">{joint.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Muscle Groups */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Svalové skupiny</h2>

          {Object.entries(groupedMuscles).map(([category, muscles]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {category}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {muscles.map((muscle) => (
                  <button
                    key={muscle.id}
                    className="glass p-3 rounded-xl text-left transition-all duration-200 hover:bg-secondary hover:glow group"
                  >
                    <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                      {muscle.nameCs}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state when no client selected */}
      {!selectedClient && (
        <div className="glass rounded-2xl p-12 text-center">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Vyberte klienta
          </h3>
          <p className="text-muted-foreground mt-1">
            Pro zobrazení diagnostických záznamů nejprve vyberte klienta
          </p>
        </div>
      )}
    </div>
  );
}
