import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MoreHorizontal,
  Trophy,
  BarChart3,
  UserCircle
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

const COMPARISON_DISPLAY_MODES = [
  { value: 'percentile_only', label: 'Pouze percentil' },
  { value: 'leaderboard_only', label: 'Pouze leaderboard' },
  { value: 'both', label: 'Percentil i leaderboard' },
] as const;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Muž' },
  { value: 'female', label: 'Žena' },
  { value: 'unspecified', label: 'Nespecifikováno' },
] as const;

interface ClientManagementRowProps {
  account: PortalClient;
  onEdit: (account: PortalClient) => void;
  onDelete: (account: PortalClient) => void;
  onManageExercises: (account: PortalClient) => void;
  onManagePortalSettings: (account: PortalClient) => void;
}

function ClientManagementRow({ account, onEdit, onDelete, onManageExercises, onManagePortalSettings }: ClientManagementRowProps) {
  const disableAccess = useDisableClientAccess();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {account.client?.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{account.client?.name}</p>
          <p className="text-sm text-muted-foreground truncate">{account.client?.email || 'Bez emailu'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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
            <DropdownMenuItem onClick={() => onManagePortalSettings(account)}>
              <Settings className="w-4 h-4 mr-2" />
              Nastavení portálu
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

  // Update state when account changes or dialog opens
  useEffect(() => {
    if (open && account?.client) {
      setName(account.client.name || '');
      setEmail(account.client.email || '');
      setPhone(account.client.phone || '');
    }
  }, [open, account]);

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

// Unified Client Portal Settings Dialog
interface ClientPortalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PortalClient | null;
}

function ClientPortalSettingsDialog({ open, onOpenChange, account }: ClientPortalSettingsDialogProps) {
  const { data: portalSettings, isLoading: isLoadingPortalSettings } = useClientPortalSettings(account?.client_id);
  const updatePortalSettings = useUpdateClientPortalSettings();
  
  const [clientSettings, setClientSettings] = useState({
    allow_challenges_participation: false,
    allow_anonymous_benchmarks: false,
    gender: 'unspecified' as string,
  });
  const [comparisonDisplayMode, setComparisonDisplayMode] = useState('both');
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Fetch client settings when dialog opens
  useEffect(() => {
    if (open && account?.client_id) {
      setIsLoadingClient(true);
      supabase
        .from('clients')
        .select('allow_challenges_participation, allow_anonymous_benchmarks, gender')
        .eq('id', account.client_id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setClientSettings({
              allow_challenges_participation: data.allow_challenges_participation ?? false,
              allow_anonymous_benchmarks: data.allow_anonymous_benchmarks ?? false,
              gender: data.gender || 'unspecified',
            });
          }
          setIsLoadingClient(false);
        });
    }
  }, [open, account?.client_id]);

  // Update comparison display mode from portal settings
  useEffect(() => {
    if (portalSettings?.comparisonDisplayMode) {
      setComparisonDisplayMode(portalSettings.comparisonDisplayMode);
    }
  }, [portalSettings]);

  const currentMetrics = portalSettings?.progressMetrics || {
    weight: true,
    bodyFat: true,
    trackedExercises: true,
    rowing500m: true,
    rowing1000m: true,
    running500m: true,
    running1000m: true,
  };

  const handleMetricToggle = (key: string) => {
    if (!account) return;
    
    updatePortalSettings.mutate({
      clientId: account.client_id,
      settings: {
        ...portalSettings,
        progressMetrics: {
          ...currentMetrics,
          [key]: !currentMetrics[key as keyof typeof currentMetrics],
        },
      },
    });
  };

  const handleComparisonDisplayModeChange = (value: string) => {
    if (!account) return;
    setComparisonDisplayMode(value);
    
    updatePortalSettings.mutate({
      clientId: account.client_id,
      settings: {
        ...portalSettings,
        comparisonDisplayMode: value as 'percentile_only' | 'leaderboard_only' | 'both',
      },
    });
  };

  const handleClientSettingToggle = async (key: 'allow_challenges_participation' | 'allow_anonymous_benchmarks', value: boolean) => {
    if (!account?.client_id) return;
    
    setIsSavingClient(true);
    const { error } = await supabase
      .from('clients')
      .update({ [key]: value })
      .eq('id', account.client_id);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setClientSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: 'Nastavení uloženo' });
    }
    setIsSavingClient(false);
  };

  const handleGenderChange = async (value: string) => {
    if (!account?.client_id) return;
    
    setIsSavingClient(true);
    const { error } = await supabase
      .from('clients')
      .update({ gender: value === 'unspecified' ? null : value })
      .eq('id', account.client_id);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setClientSettings(prev => ({ ...prev, gender: value }));
      toast({ title: 'Pohlaví uloženo' });
    }
    setIsSavingClient(false);
  };

  if (!account) return null;

  const isLoading = isLoadingClient || isLoadingPortalSettings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Nastavení portálu
          </DialogTitle>
          <DialogDescription>
            Nastavení klientského portálu pro {account.client?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="graphs" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="graphs" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grafy</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="graphs" className="mt-0 space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Vyberte, které grafy uvidí klient v sekci Pokrok
              </p>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
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
                          onCheckedChange={() => handleMetricToggle(metric.key)}
                          disabled={updatePortalSettings.isPending}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="challenges" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Nastavení účasti v challenges a zobrazení porovnání
              </p>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Účast v Challenges</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Klient může soutěžit v challenges a vidět leaderboard
                      </p>
                    </div>
                    <Switch
                      checked={clientSettings.allow_challenges_participation}
                      onCheckedChange={(checked) => handleClientSettingToggle('allow_challenges_participation', checked)}
                      disabled={isSavingClient}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Anonymní benchmarky</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Klient vidí porovnání s ostatními (anonymizované)
                      </p>
                    </div>
                    <Switch
                      checked={clientSettings.allow_anonymous_benchmarks}
                      onCheckedChange={(checked) => handleClientSettingToggle('allow_anonymous_benchmarks', checked)}
                      disabled={isSavingClient}
                    />
                  </div>

                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Zobrazení porovnání</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Jak se klientovi zobrazí výsledky srovnání
                    </p>
                    <Select value={comparisonDisplayMode} onValueChange={handleComparisonDisplayModeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPARISON_DISPLAY_MODES.map(mode => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Nastavení profilu pro správné zařazení do porovnávacích skupin (k-anonymita)
              </p>
              
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Pohlaví</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Používá se pro zařazení do správné skupiny při anonymním porovnání
                  </p>
                  <Select value={clientSettings.gender} onValueChange={handleGenderChange} disabled={isSavingClient}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
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
  const [portalSettingsAccount, setPortalSettingsAccount] = useState<PortalClient | null>(null);
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
                  onManagePortalSettings={setPortalSettingsAccount}
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
      
      <ClientPortalSettingsDialog
        open={!!portalSettingsAccount}
        onOpenChange={(open) => !open && setPortalSettingsAccount(null)}
        account={portalSettingsAccount}
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
