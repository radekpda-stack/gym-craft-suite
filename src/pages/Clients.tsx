import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';
import { Search, Plus, Phone, Mail, CreditCard, Pencil, Trash2, Wallet, History, Dumbbell, Package, Edit3, X, Tag, Star, Users, Link as LinkIcon, Archive, ArchiveRestore, Calendar, CalendarDays, BarChart3, MoreHorizontal, Filter, ClipboardList } from 'lucide-react';
import { PreDiagnosticInviteDialog } from '@/components/pre-diagnostic/PreDiagnosticInviteDialog';
import { UnassignedPreDiagnosticList } from '@/components/pre-diagnostic/UnassignedPreDiagnosticList';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, useArchiveClient, Client } from '@/hooks/useClients';
import { useCreateTransaction, useCreditTransactions } from '@/hooks/useCreditTransactions';
import { useClientsWithTags } from '@/hooks/useClientTags';
import { useTags } from '@/hooks/useTags';
import { useToggleFavorite } from '@/hooks/useFavoriteClients';
import { useBudgetGroups } from '@/hooks/useClientBudgetGroups';
import { useClientTrainingCounts } from '@/hooks/useClientTrainingCounts';
import { useClientScheduleData } from '@/hooks/useClientScheduleData';
import { CreateClientSheet } from '@/components/clients/CreateClientSheet';
import { EditClientSheet } from '@/components/clients/EditClientSheet';
import { DeleteClientDialog } from '@/components/clients/DeleteClientDialog';
import { ClientFiltersDialog } from '@/components/clients/ClientFiltersDialog';
import { SharedBudgetManager } from '@/components/clients/SharedBudgetManager';
import { CompactClientRow } from '@/components/clients/CompactClientRow';
import { ClientFormValues } from '@/lib/validations/client';
import { ClientListSkeleton } from '@/components/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { format, differenceInYears, parse, isValid } from 'date-fns';
import { cs } from 'date-fns/locale';

type GenderFilter = 'all' | 'male' | 'female';
type SortOption = 'name' | 'trainings' | 'credit' | 'recent';
type ViewMode = 'today' | 'week' | 'all' | 'archived';

// Helper to calculate age from birth date string
const calculateAge = (birthDateStr: string | null): number | null => {
  if (!birthDateStr) return null;
  
  let date: Date | null = null;
  
  if (/^\d{4}-\d{2}-\d{2}/.test(birthDateStr)) {
    date = new Date(birthDateStr);
  } else if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(birthDateStr)) {
    date = parse(birthDateStr, 'd.M.yyyy', new Date());
  } else if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(birthDateStr)) {
    date = parse(birthDateStr, 'd.M.yy', new Date());
  }
  
  if (!date || !isValid(date)) return null;
  return differenceInYears(new Date(), date);
};

export default function Clients() {
  usePageTracking('clients');
  const { trackFeature } = useFeatureTracking();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [lowCreditFilter, setLowCreditFilter] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [creditClient, setCreditClient] = useState<Client | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [showGroupsSheet, setShowGroupsSheet] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data: clients = [], isLoading } = useClients();
  const { data: trainingCounts = {} } = useClientTrainingCounts();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const archiveClient = useArchiveClient();
  const createTransaction = useCreateTransaction();
  const toggleFavorite = useToggleFavorite();
  const { data: creditClientTransactions = [] } = useCreditTransactions(creditClient?.id);
  const { data: clientTagsMap = {} } = useClientsWithTags();
  const { data: allTags = [] } = useTags();
  const { data: budgetGroups = [] } = useBudgetGroups();
  const { data: scheduleData } = useClientScheduleData();

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
    setGenderFilter('all');
    setLowCreditFilter(false);
  };

  const handleArchiveClient = async (client: Client) => {
    await archiveClient.mutateAsync({ 
      id: client.id, 
      is_archived: !client.is_archived 
    });
    trackFeature(client.is_archived ? 'client_restore' : 'client_archive', 'clients');
  };

  const allGoals = [...new Set(clients.flatMap(c => c.training_goals || []))];

  // Count clients
  const activeClients = clients.filter(c => !c.is_archived);
  const archivedClients = clients.filter(c => c.is_archived);

  // Count clients for view mode tabs
  const todayClientIds = scheduleData?.todayClientIds || new Set<string>();
  const weekClientIds = scheduleData?.weekClientIds || new Set<string>();
  const todayCount = activeClients.filter(c => todayClientIds.has(c.id)).length;
  const weekCount = activeClients.filter(c => weekClientIds.has(c.id)).length;

  const filteredClients = clients
    .filter((client) => {
      // View mode filter
      const isArchived = client.is_archived;
      const matchesViewMode = 
        viewMode === 'archived' ? isArchived :
        viewMode === 'all' ? !isArchived :
        viewMode === 'today' ? (!isArchived && todayClientIds.has(client.id)) :
        viewMode === 'week' ? (!isArchived && weekClientIds.has(client.id)) :
        true;
      
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGoal = !selectedGoal || (client.training_goals || []).includes(selectedGoal);
      const matchesLowCredit = !lowCreditFilter || (client.credit_balance || 0) < 500;
      const matchesTag = !selectedTagId || (clientTagsMap[client.id] || []).some(t => t.id === selectedTagId);
      const matchesGender = genderFilter === 'all' || client.gender === genderFilter;

      return matchesViewMode && matchesSearch && matchesGoal && matchesLowCredit && matchesTag && matchesGender;
    })
    .sort((a, b) => {
      // Favorites always first
      if (a.is_favorite !== b.is_favorite) {
        return a.is_favorite ? -1 : 1;
      }
      
      switch (sortBy) {
        case 'trainings':
          return (trainingCounts[b.id]?.count || 0) - (trainingCounts[a.id]?.count || 0);
        case 'credit':
          return (b.credit_balance || 0) - (a.credit_balance || 0);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'cs');
      }
    });

  const hasActiveFilters = !!(selectedGoal || selectedTagId || lowCreditFilter || genderFilter !== 'all');

  const handleCreateClient = async (data: ClientFormValues) => {
    await createClient.mutateAsync(data);
    setIsCreateSheetOpen(false);
    trackFeature('client_create', 'clients');
  };

  const handleEditClient = async (data: ClientFormValues) => {
    if (!editingClient) return;
    await updateClient.mutateAsync({ id: editingClient.id, values: data });
    setEditingClient(null);
    trackFeature('client_update', 'clients');
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    await deleteClient.mutateAsync(deletingClient.id);
    setDeletingClient(null);
    trackFeature('client_delete', 'clients');
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
    trackFeature('credit_add', 'finance');
  };

  const getCreditColor = (credit: number) => {
    if (credit < 0) return "text-destructive";
    if (credit < 500) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-4 animate-fade-in overflow-x-hidden">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Klienti
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredClients.length} z {viewMode === 'archived' ? archivedClients.length : activeClients.length}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Overflow menu for secondary actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/clients/analytics')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytika
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Pozvat klienta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGroupsSheet(true)}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Sdílené budgety
                {budgetGroups.length > 0 && (
                  <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                    {budgetGroups.length}
                  </Badge>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Primary CTA */}
          <Button className="gap-1.5" onClick={() => setIsCreateSheetOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nový klient</span>
          </Button>
        </div>
      </div>

      {/* Pre-diagnostic invite dialog */}
      <PreDiagnosticInviteDialog 
        open={showInviteDialog} 
        onOpenChange={setShowInviteDialog} 
      />

      {/* Unassigned pre-diagnostics */}
      <UnassignedPreDiagnosticList clients={clients.filter(c => !c.is_archived)} />

      {/* Groups Sheet */}
      <Sheet open={showGroupsSheet} onOpenChange={setShowGroupsSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sdílené budgety</SheetTitle>
            <SheetDescription>
              Propojte klienty, kteří sdílejí společný kreditový budget.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SharedBudgetManager 
              clients={clients.filter(c => !c.is_archived)} 
              selectedClientIds={[]} 
            />
          </div>
        </SheetContent>
      </Sheet>

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
              Přidejte kredit klientovi.
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
                  {formatCurrency(creditClient?.credit_balance || 0)}
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
                        {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount, false)}
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

      {/* Search & Filters - Consolidated */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-card border-border"
            />
          </div>

          <ClientFiltersDialog
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            selectedGoal={selectedGoal}
            setSelectedGoal={setSelectedGoal}
            selectedTagId={selectedTagId}
            setSelectedTagId={setSelectedTagId}
            lowCreditFilter={lowCreditFilter}
            setLowCreditFilter={setLowCreditFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            allGoals={allGoals}
            allTags={allTags}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Unified View Mode Toggle - Single row with 4 options */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-full">
          <Button
            variant={viewMode === 'today' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('today')}
            className="flex-1 gap-1 px-2 h-8 text-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Dnes</span>
            <Badge variant={viewMode === 'today' ? 'secondary' : 'outline'} className="h-4 px-1 text-[10px]">
              {todayCount}
            </Badge>
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
            className="flex-1 gap-1 px-2 h-8 text-xs"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Týden</span>
            <Badge variant={viewMode === 'week' ? 'secondary' : 'outline'} className="h-4 px-1 text-[10px]">
              {weekCount}
            </Badge>
          </Button>
          <Button
            variant={viewMode === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('all')}
            className="flex-1 gap-1 px-2 h-8 text-xs"
          >
            <span>Všichni</span>
            <Badge variant={viewMode === 'all' ? 'secondary' : 'outline'} className="h-4 px-1 text-[10px]">
              {activeClients.length}
            </Badge>
          </Button>
          <Button
            variant={viewMode === 'archived' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('archived')}
            className="flex-1 gap-1 px-2 h-8 text-xs"
          >
            <Archive className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Archiv</span>
            {archivedClients.length > 0 && (
              <Badge variant={viewMode === 'archived' ? 'secondary' : 'outline'} className="h-4 px-1 text-[10px]">
                {archivedClients.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Clients List - Compact Rows */}
      {isLoading ? (
        <ClientListSkeleton />
      ) : (
        <div className="space-y-1 bg-card rounded-lg border border-border overflow-hidden">
          {filteredClients.map((client) => {
            const clientTags = clientTagsMap[client.id] || [];
            const nextTraining = scheduleData?.nextTrainings.get(client.id);

            return (
              <CompactClientRow
                key={client.id}
                client={client}
                tags={clientTags}
                nextTraining={nextTraining ? { date: nextTraining.date } : null}
                onNewTraining={() => navigate(`/calendar?action=new-training&clientId=${client.id}`)}
                onAddCredit={() => setCreditClient(client)}
                onEdit={() => setEditingClient(client)}
                onArchive={() => handleArchiveClient(client)}
                onToggleFavorite={() => toggleFavorite.mutate({ clientId: client.id, isFavorite: !client.is_favorite })}
              />
            );
          })}
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
        <div className="rounded-lg border border-border p-8">
          <EmptyState
            icon={Users}
            title={clients.length === 0 ? "Zatím žádní klienti" : "Nic nenalezeno"}
            description={clients.length === 0 ? "Přidejte prvního klienta" : "Upravte vyhledávání nebo filtry"}
            size="lg"
            action={clients.length === 0 ? (
              <Button 
                className="gap-2"
                onClick={() => setIsCreateSheetOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Nový klient
              </Button>
            ) : undefined}
          />
        </div>
      )}
    </div>
  );
}
