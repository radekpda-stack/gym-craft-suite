import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  usePortalClients, 
  useDisableClientAccess,
  PortalClient,
} from '@/hooks/useClientPortalAdmin';
import { 
  useClientTrackedExercisesAdmin,
  useAddTrackedExercise,
  useRemoveTrackedExercise,
  useClientPortalSettings,
  useUpdateClientPortalSettings,
} from '@/hooks/useClientTrackedExercisesAdmin';
import { useClients, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useExercises } from '@/hooks/useExercises';
import { 
  User, 
  Settings, 
  Trash2, 
  Edit, 
  ChevronDown, 
  Dumbbell, 
  Plus, 
  X,
  Scale,
  Percent,
  Timer,
  PersonStanding,
  Eye,
  EyeOff,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const PROGRESS_METRICS = [
  { key: 'weight', label: 'Váha', icon: Scale },
  { key: 'bodyFat', label: 'Tělesný tuk', icon: Percent },
  { key: 'trackedExercises', label: 'Sledované cviky', icon: Dumbbell },
  { key: 'rowing500m', label: 'Veslo 500m', icon: Timer },
  { key: 'rowing1000m', label: 'Veslo 1000m', icon: Timer },
  { key: 'running500m', label: 'Běh 500m', icon: PersonStanding },
  { key: 'running1000m', label: 'Běh 1000m', icon: PersonStanding },
] as const;

interface ClientManagementRowProps {
  account: PortalClient;
  onEdit: (account: PortalClient) => void;
  onDelete: (account: PortalClient) => void;
  onManageExercises: (account: PortalClient) => void;
  onManageGraphs: (account: PortalClient) => void;
}

function ClientManagementRow({ account, onEdit, onDelete, onManageExercises, onManageGraphs }: ClientManagementRowProps) {
  const disableAccess = useDisableClientAccess();

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div>
          <p className="font-medium">{account.client?.name}</p>
          <p className="text-sm text-muted-foreground">{account.client?.email || 'Bez emailu'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={account.is_active ? 'default' : 'secondary'}>
          {account.is_active ? 'Aktivní' : 'Neaktivní'}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Edit className="w-4 h-4 mr-2" />
              Upravit profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageGraphs(account)}>
              <Eye className="w-4 h-4 mr-2" />
              Nastavení grafů
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageExercises(account)}>
              <Dumbbell className="w-4 h-4 mr-2" />
              Sledované cviky
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => disableAccess.mutate({ clientId: account.client_id, disable: account.is_active })}
              disabled={disableAccess.isPending}
            >
              {account.is_active ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Deaktivovat přístup
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Aktivovat přístup
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive" 
              onClick={() => onDelete(account)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat z portálu
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Edit Client Dialog
interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PortalClient | null;
}

function EditClientDialog({ open, onOpenChange, account }: EditClientDialogProps) {
  const updateClient = useUpdateClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Update state when account changes
  useState(() => {
    if (account?.client) {
      setName(account.client.name || '');
      setEmail(account.client.email || '');
      setPhone(account.client.phone || '');
    }
  });

  const handleSave = async () => {
    if (!account) return;
    
    await updateClient.mutateAsync({
      id: account.client_id,
      values: {
        name,
        email: email || undefined,
        phone: phone || undefined,
      },
    });
    onOpenChange(false);
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upravit klienta</DialogTitle>
          <DialogDescription>Změňte základní údaje klienta</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Jméno</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Jméno klienta"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={handleSave} disabled={updateClient.isPending}>
            {updateClient.isPending ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Manage Graphs Dialog  
interface ManageGraphsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PortalClient | null;
}

function ManageGraphsDialog({ open, onOpenChange, account }: ManageGraphsDialogProps) {
  const { data: settings, isLoading } = useClientPortalSettings(account?.client_id);
  const updateSettings = useUpdateClientPortalSettings();

  const currentMetrics = settings?.progressMetrics || {
    weight: true,
    bodyFat: true,
    trackedExercises: true,
    rowing500m: true,
    rowing1000m: true,
    running500m: true,
    running1000m: true,
  };

  const handleToggle = (key: string) => {
    if (!account) return;
    
    updateSettings.mutate({
      clientId: account.client_id,
      settings: {
        ...settings,
        progressMetrics: {
          ...currentMetrics,
          [key]: !currentMetrics[key as keyof typeof currentMetrics],
        },
      },
    });
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nastavení grafů</DialogTitle>
          <DialogDescription>
            Vyberte, které grafy uvidí {account.client?.name} v portálu
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2 py-4">
            {PROGRESS_METRICS.map(metric => {
              const Icon = metric.icon;
              const isEnabled = currentMetrics[metric.key as keyof typeof currentMetrics] ?? true;
              
              return (
                <div 
                  key={metric.key}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(metric.key)}
                    disabled={updateSettings.isPending}
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Hotovo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Manage Tracked Exercises Dialog
interface ManageExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PortalClient | null;
}

function ManageExercisesDialog({ open, onOpenChange, account }: ManageExercisesDialogProps) {
  const { data: trackedExercises, isLoading } = useClientTrackedExercisesAdmin(account?.client_id);
  const { exercises: allExercises } = useExercises();
  const addExercise = useAddTrackedExercise();
  const removeExercise = useRemoveTrackedExercise();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  if (!account) return null;

  const trackedIds = new Set(trackedExercises?.map(e => e.exercise_id) || []);
  
  const filteredExercises = (allExercises || [])
    .filter(e => !trackedIds.has(e.id))
    .filter(e => 
      (e.name_cs || e.name).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 20);

  const handleAddExercise = (exercise: { id: string; name: string; name_cs?: string }) => {
    addExercise.mutate({
      clientId: account.client_id,
      exerciseId: exercise.id,
      exerciseName: exercise.name_cs || exercise.name,
    });
    setSearchQuery('');
    setShowAddSection(false);
  };

  const handleRemoveExercise = (id: string) => {
    removeExercise.mutate({ id, clientId: account.client_id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sledované cviky</DialogTitle>
          <DialogDescription>
            Cviky, které {account.client?.name} uvidí v sekci Pokrok
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current tracked exercises */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Aktuálně sledované ({trackedExercises?.length || 0})
            </Label>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : trackedExercises?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Žádné sledované cviky
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trackedExercises?.map(exercise => (
                  <div 
                    key={exercise.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{exercise.exercise_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveExercise(exercise.id)}
                      disabled={removeExercise.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add exercise section */}
          <Collapsible open={showAddSection} onOpenChange={setShowAddSection}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Přidat cvik
                <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", showAddSection && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat cvik..."
                  className="pl-9"
                />
              </div>
              
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {filteredExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery ? 'Žádné výsledky' : 'Začněte psát pro vyhledání'}
                    </p>
                  ) : (
                    filteredExercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        disabled={addExercise.isPending}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                      >
                        <Dumbbell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{exercise.name_cs || exercise.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Hotovo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PortalClient | null;
  onConfirm: () => void;
  isPending: boolean;
}

function DeleteClientDialog({ open, onOpenChange, account, onConfirm, isPending }: DeleteClientDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat klienta z portálu?</AlertDialogTitle>
          <AlertDialogDescription>
            Tím odstraníte přístup klienta {account?.client?.name} do portálu. 
            Data klienta zůstanou zachována v systému.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Mažu...' : 'Smazat'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Main Component
export function ClientPortalManagement() {
  const { data: clients, isLoading } = usePortalClients();
  const disableAccess = useDisableClientAccess();
  
  const [editAccount, setEditAccount] = useState<PortalClient | null>(null);
  const [graphsAccount, setGraphsAccount] = useState<PortalClient | null>(null);
  const [exercisesAccount, setExercisesAccount] = useState<PortalClient | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<PortalClient | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteAccount) return;
    
    // For now, just disable access - actual deletion would require edge function
    await disableAccess.mutateAsync({ clientId: deleteAccount.client_id, disable: true });
    setDeleteAccount(null);
    toast({ title: 'Přístup klienta deaktivován' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Správa klientů</CardTitle>
          <CardDescription>Načítám...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Správa klientů
          </CardTitle>
          <CardDescription>
            Upravujte profily, nastavte viditelnost grafů a vyberte sledované cviky pro každého klienta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients?.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Zatím žádní klienti s přístupem do portálu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients?.map(account => (
                <ClientManagementRow
                  key={account.id}
                  account={account}
                  onEdit={setEditAccount}
                  onDelete={setDeleteAccount}
                  onManageExercises={setExercisesAccount}
                  onManageGraphs={setGraphsAccount}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditClientDialog 
        open={!!editAccount} 
        onOpenChange={(open) => !open && setEditAccount(null)}
        account={editAccount}
      />
      
      <ManageGraphsDialog
        open={!!graphsAccount}
        onOpenChange={(open) => !open && setGraphsAccount(null)}
        account={graphsAccount}
      />
      
      <ManageExercisesDialog
        open={!!exercisesAccount}
        onOpenChange={(open) => !open && setExercisesAccount(null)}
        account={exercisesAccount}
      />
      
      <DeleteClientDialog
        open={!!deleteAccount}
        onOpenChange={(open) => !open && setDeleteAccount(null)}
        account={deleteAccount}
        onConfirm={handleDeleteConfirm}
        isPending={disableAccess.isPending}
      />
    </>
  );
}
