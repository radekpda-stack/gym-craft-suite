import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronRight, Phone, Mail, Loader2, CreditCard, Pencil, Trash2, Wallet, History, Dumbbell, Package, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client } from '@/hooks/useClients';
import { useCreateTransaction, useCreditTransactions } from '@/hooks/useCreditTransactions';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { ClientFormValues } from '@/lib/validations/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [creditClient, setCreditClient] = useState<Client | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createTransaction = useCreateTransaction();
  const { data: creditClientTransactions = [] } = useCreditTransactions(creditClient?.id);

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

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    await deleteClient.mutateAsync(deletingClient.id);
    setDeletingClient(null);
  };

  const handleAddCredit = async () => {
    if (!creditClient) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    await createTransaction.mutateAsync({
      client_id: creditClient.id,
      amount: amount,
      type: 'payment',
      description: creditDescription || 'Platba kreditu',
    });

    setCreditAmount('');
    setCreditDescription('');
    setCreditClient(null);
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

      <DeleteClientDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        onConfirm={handleDeleteClient}
        clientName={deletingClient?.name || ""}
        isLoading={deleteClient.isPending}
      />

      {/* Credit Dialog */}
      <Dialog open={!!creditClient} onOpenChange={(open) => !open && setCreditClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Kredit - {creditClient?.name}
            </DialogTitle>
            <DialogDescription>
              Přidejte kredit klientovi nebo si prohlédněte historii.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Current Balance */}
            <div className="p-4 rounded-xl bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aktuální kredit:</span>
                <span className={cn(
                  "text-xl font-bold",
                  getCreditColor(creditClient?.credit_balance || 0)
                )}>
                  {(creditClient?.credit_balance || 0).toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </div>

            {/* Add Credit Form */}
            <div className="space-y-3">
              <div>
                <Label>Částka (Kč)</Label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="1000"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Popis (volitelné)</Label>
                <Input
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Platba kreditu"
                  className="mt-2"
                />
              </div>
              <Button 
                onClick={handleAddCredit} 
                disabled={createTransaction.isPending || !creditAmount}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Přidat kredit
              </Button>
            </div>

            {/* Recent Transactions */}
            {creditClientTransactions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <History className="w-4 h-4" />
                  Poslední transakce
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {creditClientTransactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex items-center gap-2">
                        {t.type === 'payment' && <Plus className="w-3 h-3 text-success" />}
                        {t.type === 'training' && <Dumbbell className="w-3 h-3 text-primary" />}
                        {t.type === 'product' && <Package className="w-3 h-3 text-warning" />}
                        {t.type === 'manual' && <Edit3 className="w-3 h-3 text-muted-foreground" />}
                        {t.type === 'canceled_training' && <Dumbbell className="w-3 h-3 text-destructive" />}
                        <div>
                          <p className="text-foreground">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), 'd.M.yyyy', { locale: cs })}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-medium",
                        t.amount > 0 ? "text-success" : "text-destructive"
                      )}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  ))}
                </div>
                <Link 
                  to={`/clients/${creditClient?.id}`} 
                  className="block text-center text-sm text-primary hover:underline"
                >
                  Zobrazit vše →
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCreditClient(client);
                  }}
                  title="Přidat kredit"
                >
                  <Wallet className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingClient(client);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeletingClient(client);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Link to={`/clients/${client.id}`} className="block">
                <div className="flex items-start gap-4">
                  <ClientAvatar name={client.name} size="lg" />
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate pr-16">
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
