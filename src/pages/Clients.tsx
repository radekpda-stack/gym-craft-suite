import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronRight, Phone, Mail, Loader2, CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients, useCreateClient, useUpdateClient, Client } from '@/hooks/useClients';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { ClientFormValues } from '@/lib/validations/client';
import { cn } from '@/lib/utils';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const allGoals = [...new Set(clients.flatMap(c => c.training_goals || []))];

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGoal = !selectedGoal || (client.training_goals || []).includes(selectedGoal);

    return matchesSearch && matchesGoal;
  });

  const handleCreateClient = async (data: ClientFormValues) => {
    await createClient.mutateAsync(data);
    setIsCreateSheetOpen(false);
  };

  const handleEditClient = async (data: ClientFormValues) => {
    if (!editingClient) return;
    await updateClient.mutateAsync({ id: editingClient.id, values: data });
    setEditingClient(null);
  };

  const getCreditColor = (credit: number) => {
    if (credit < 0) return "text-destructive";
    if (credit < 500) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Klienti
          </h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} aktivních klientů
          </p>
        </div>

        <Button className="gap-2" onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Nový klient
        </Button>
      </div>

      <CreateClientSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSubmit={handleCreateClient}
        isLoading={createClient.isPending}
      />

      <EditClientSheet
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        onSubmit={handleEditClient}
        isLoading={updateClient.isPending}
        client={editingClient}
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat klienty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedGoal === null ? 'default' : 'outline'}
            onClick={() => setSelectedGoal(null)}
            className="rounded-xl"
          >
            Všichni
          </Button>
          {allGoals.slice(0, 3).map((goal) => (
            <Button
              key={goal}
              variant={selectedGoal === goal ? 'default' : 'outline'}
              onClick={() => setSelectedGoal(goal)}
              className="rounded-xl"
            >
              {goal}
            </Button>
          ))}
        </div>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => (
            <div
              key={client.id}
              className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:glow group animate-slide-up relative"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Edit button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingClient(client);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>

              <Link to={`/clients/${client.id}`} className="block">
                <div className="flex items-start gap-4">
                  <ClientAvatar name={client.name} size="lg" />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate pr-8">
                      {client.name}
                    </h3>
                    
                    {/* Credit Balance */}
                    <div className={cn(
                      "flex items-center gap-1.5 mt-1 font-semibold",
                      getCreditColor(client.credit_balance || 0)
                    )}>
                      <CreditCard className="w-4 h-4" />
                      <span>{(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(client.training_goals || []).slice(0, 2).map((goal) => (
                        <span
                          key={goal}
                          className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>

                    {client.health_restrictions && (
                      <p className="mt-3 text-sm text-warning/80 line-clamp-1">
                        ⚠️ {client.health_restrictions}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-6" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {clients.length === 0 ? "Zatím nemáte žádné klienty" : "Žádní klienti nenalezeni"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {clients.length === 0 
              ? "Přidejte svého prvního klienta kliknutím na tlačítko výše"
              : "Zkuste upravit vyhledávání nebo filtry"}
          </p>
        </div>
      )}
    </div>
  );
}
