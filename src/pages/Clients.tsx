import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronRight, Phone, Mail, Loader2, CreditCard, Pencil, Trash2, Wallet, History, Dumbbell, Package, Edit3, X, Tag, Star, CheckSquare, Square, Users, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client } from '@/hooks/useClients';
import { useCreateTransaction, useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useClientsWithTags } from '@/hooks/useClientTags';
import { useTags } from '@/hooks/useTags';
import { useToggleFavorite } from '@/hooks/useFavoriteClients';
import { useBudgetGroups } from '@/hooks/useClientBudgetGroups';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { SharedBudgetManager } from '@/components/clients/SharedBudgetManager';
import { ClientFormValues } from '@/lib/validations/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function Clients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [lowCreditFilter, setLowCreditFilter] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [creditClient, setCreditClient] = useState<Client | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [showBudgetManager, setShowBudgetManager] = useState(false);

  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createTransaction = useCreateTransaction();
  const toggleFavorite = useToggleFavorite();
  const { data: creditClientTransactions = [] } = useCreditTransactions(creditClient?.id);
  const { data: clientTagsMap = {} } = useClientsWithTags();
  const { data: allTags = [] } = useTags();
  const { data: budgetGroups = [] } = useBudgetGroups();

  // Handle URL filter parameter
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'lowCredit') {
      setLowCreditFilter(true);
    }
  }, [searchParams]);

  const clearLowCreditFilter = () => {
    setLowCreditFilter(false);
    searchParams.delete('filter');
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setSelectedGoal(null);
    setSelectedTagId(null);
    clearLowCreditFilter();
  };

  const allGoals = [...new Set(clients.flatMap(c => c.training_goals || []))];

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGoal = !selectedGoal || (client.training_goals || []).includes(selectedGoal);
    
    const matchesLowCredit = !lowCreditFilter || (client.credit_balance || 0) < 500;
    
    const matchesTag = !selectedTagId || (clientTagsMap[client.id] || []).some(t => t.id === selectedTagId);

    return matchesSearch && matchesGoal && matchesLowCredit && matchesTag;
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

  const toggleSelectClient = (clientId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteClient.mutateAsync(id);
    }
    setSelectedIds(new Set());
    setShowBulkDeleteDialog(false);
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat {selectedIds.size} klientů?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Všechna data vybraných klientů budou trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat {selectedIds.size} klientů
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  type="text"
                  inputMode="numeric"
                  value={creditAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setCreditAmount(value);
                  }}
                  placeholder="Zadejte částku"
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
          {lowCreditFilter && (
            <Button
              variant="destructive"
              onClick={clearLowCreditFilter}
              className="rounded-xl gap-2"
            >
              Nízký kredit
              <X className="w-4 h-4" />
            </Button>
          )}
          {selectedTagId && (
            <Button
              variant="secondary"
              onClick={() => setSelectedTagId(null)}
              className="rounded-xl gap-2"
              style={{ 
                backgroundColor: allTags.find(t => t.id === selectedTagId)?.color + '20',
                color: allTags.find(t => t.id === selectedTagId)?.color,
                borderColor: allTags.find(t => t.id === selectedTagId)?.color
              }}
            >
              <Tag className="w-3 h-3" />
              {allTags.find(t => t.id === selectedTagId)?.name}
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant={selectedGoal === null && !lowCreditFilter && !selectedTagId ? 'default' : 'outline'}
            onClick={clearAllFilters}
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
          {allTags.length > 0 && !selectedTagId && (
            <div className="flex gap-1 items-center">
              <span className="text-muted-foreground text-sm mx-1">|</span>
              {allTags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag.id}
                  style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                  className="border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 glass rounded-xl animate-slide-up">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === filteredClients.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedIds.size} vybráno
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Zrušit výběr
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat vybrané
            </Button>
          </div>
        </div>
      )}

      {/* Shared Budgets Section */}
      <Collapsible open={showBudgetManager} onOpenChange={setShowBudgetManager}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full gap-2 justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Sdílené budgety
              {budgetGroups.length > 0 && (
                <Badge variant="secondary">{budgetGroups.length}</Badge>
              )}
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              showBudgetManager && "rotate-90"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="glass rounded-xl p-4">
            <SharedBudgetManager
              clients={clients}
              selectedClientIds={Array.from(selectedIds)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client, index) => {
            const clientTags = clientTagsMap[client.id] || [];
            const isSelected = selectedIds.has(client.id);
            return (
            <div
              key={client.id}
              className={cn(
                "glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:glow group animate-slide-up relative",
                isSelected && "ring-2 ring-primary"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelectClient(client.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Favorite button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite.mutate({ clientId: client.id, isFavorite: !client.is_favorite });
                }}
                className={cn(
                  "absolute top-3 left-10 p-1 rounded transition-all",
                  client.is_favorite 
                    ? "text-yellow-500" 
                    : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-500"
                )}
              >
                <Star className={cn("w-4 h-4", client.is_favorite && "fill-current")} />
              </button>

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
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn(
                        "flex items-center gap-1.5 font-semibold",
                        getCreditColor(client.credit_balance || 0)
                      )}>
                        <CreditCard className="w-4 h-4" />
                        <span>{(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      {/* Shared Budget Badge */}
                      {budgetGroups.some(g => g.members.some(m => m.client_id === client.id)) && (
                        <Badge variant="outline" className="gap-1 text-xs px-1.5 py-0.5">
                          <LinkIcon className="w-3 h-3" />
                          Sdílený
                        </Badge>
                      )}
                    </div>
                    
                    {/* Client Tags */}
                    {clientTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {clientTags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                            className="border text-xs px-1.5 py-0.5"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {clientTags.length > 3 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            +{clientTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
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
          )})}
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
