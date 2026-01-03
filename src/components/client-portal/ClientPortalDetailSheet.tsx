import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  PortalClient, 
  useResetClientPassword, 
  useDisableClientAccess,
  useUpdateClientCredentials,
} from '@/hooks/useClientPortalAdmin';
import {
  useClientTrackedExercisesAdmin,
  useAddTrackedExercise,
  useRemoveTrackedExercise,
  useClientPortalSettings,
  useUpdateClientPortalSettings,
} from '@/hooks/useClientTrackedExercisesAdmin';
import { useExercises } from '@/hooks/useExercises';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Key,
  UserCheck,
  UserX,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  ExternalLink,
  ChevronDown,
  Dumbbell,
  Plus,
  X,
  Scale,
  Percent,
  Timer,
  PersonStanding,
  Trophy,
  BarChart3,
  Clock,
  LogIn,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ClientPortalDetailSheetProps {
  client: PortalClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientPortalDetailSheet({ client, open, onOpenChange }: ClientPortalDetailSheetProps) {
  const navigate = useNavigate();
  const resetPassword = useResetClientPassword();
  const disableAccess = useDisableClientAccess();
  const updateCredentials = useUpdateClientCredentials();
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editLoginId, setEditLoginId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Reset state when client changes
  useEffect(() => {
    if (client) {
      setEditLoginId(client.login_identifier || '');
      setEditPassword('');
      setEditMode(false);
      setShowPassword(false);
    }
  }, [client?.id]);

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Zkopírováno' });
  };

  const handleResetPassword = async () => {
    if (!client) return;
    try {
      const result = await resetPassword.mutateAsync(client.client_id);
      toast({
        title: 'Nové heslo vygenerováno',
        description: `Heslo: ${result.password}`,
      });
    } catch {
      // Error handled in hook
    }
  };

  const handleToggleAccess = async () => {
    if (!client) return;
    await disableAccess.mutateAsync({ 
      clientId: client.client_id, 
      disable: client.is_active 
    });
  };

  const handleSaveCredentials = async () => {
    if (!client) return;
    const changes: { clientId: string; newLoginIdentifier?: string; newPassword?: string } = {
      clientId: client.client_id,
    };

    if (editLoginId !== client.login_identifier) {
      changes.newLoginIdentifier = editLoginId;
    }
    if (editPassword) {
      changes.newPassword = editPassword;
    }

    if (!changes.newLoginIdentifier && !changes.newPassword) {
      setEditMode(false);
      return;
    }

    try {
      await updateCredentials.mutateAsync(changes);
      setEditMode(false);
      setEditPassword('');
    } catch {
      // Error handled by hook
    }
  };

  if (!client) return null;

  const getStatusBadge = () => {
    if (!client.auth_user_id) {
      return <Badge variant="outline" className="text-muted-foreground">Bez přístupu</Badge>;
    }
    if (client.is_active) {
      return <Badge variant="default" className="bg-green-600">Aktivní</Badge>;
    }
    return <Badge variant="secondary">Deaktivovaný</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {client.client?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{client.client?.name}</SheetTitle>
              <SheetDescription className="truncate">
                {client.client?.email || 'Bez emailu'}
              </SheetDescription>
            </div>
            {getStatusBadge()}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="text-xs">Poslední přihlášení</span>
                </div>
                <p className="text-sm font-medium">
                  {client.last_portal_login 
                    ? formatDistanceToNow(new Date(client.last_portal_login), { addSuffix: true, locale: cs })
                    : 'Nikdy'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Počet přihlášení</span>
                </div>
                <p className="text-sm font-medium">{client.login_count || 0}×</p>
              </div>
            </div>

            {/* Login Credentials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Přihlašovací údaje</Label>
                {!editMode && (
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Upravit
                  </Button>
                )}
              </div>
              
              {editMode ? (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Přihlašovací jméno</Label>
                    <Input 
                      value={editLoginId}
                      onChange={(e) => setEditLoginId(e.target.value)}
                      placeholder="Email nebo uživatelské jméno"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nové heslo (ponechte prázdné pro zachování)</Label>
                    <Input 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Nové heslo"
                      type="text"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveCredentials}
                      disabled={updateCredentials.isPending}
                    >
                      {updateCredentials.isPending ? 'Ukládám...' : 'Uložit'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setEditMode(false);
                        setEditLoginId(client.login_identifier || '');
                        setEditPassword('');
                      }}
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Přihlášení</p>
                      <code className="text-sm">{client.login_identifier || '-'}</code>
                    </div>
                    {client.login_identifier && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => copyToClipboard(client.login_identifier!, 'login')}
                      >
                        {copiedField === 'login' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2.5 border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Heslo</p>
                      <code className="text-sm font-mono">
                        {showPassword ? (client.portal_password || '-') : '••••••••'}
                      </code>
                      {client.credentials_changed_at && (
                        <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-500 border-amber-500/50 text-[10px]">
                          Změněno klientem
                        </Badge>
                      )}
                    </div>
                    {client.portal_password && (
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(client.portal_password!, 'password')}
                        >
                          {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleResetPassword}
                disabled={resetPassword.isPending}
              >
                <Key className="w-4 h-4 mr-2" />
                {resetPassword.isPending ? 'Generuji...' : 'Vygenerovat nové heslo'}
              </Button>
            </div>

            <Separator />

            {/* Portal Settings */}
            <PortalSettingsSection clientId={client.client_id} />

            <Separator />

            {/* Tracked Exercises */}
            <TrackedExercisesSection clientId={client.client_id} clientName={client.client?.name || ''} />

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Akce</Label>
              
              {client.auth_user_id && (
                <Button
                  variant={client.is_active ? "destructive" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={handleToggleAccess}
                  disabled={disableAccess.isPending}
                >
                  {client.is_active ? (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Deaktivovat přístup
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Aktivovat přístup
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/clients/${client.client_id}`);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Otevřít kartu klienta
              </Button>
            </div>

            {/* Meta Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Vytvořeno: {format(new Date(client.created_at), 'd. M. yyyy', { locale: cs })}</p>
              {client.last_password_reset_at && (
                <p>Poslední reset hesla: {format(new Date(client.last_password_reset_at), 'd. M. yyyy', { locale: cs })}</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Portal Settings inline component
function PortalSettingsSection({ clientId }: { clientId: string }) {
  const { data: portalSettings, isLoading: isLoadingPortal } = useClientPortalSettings(clientId);
  const updatePortalSettings = useUpdateClientPortalSettings();
  
  const [clientSettings, setClientSettings] = useState({
    allow_challenges_participation: false,
    allow_anonymous_benchmarks: false,
  });
  const [comparisonDisplayMode, setComparisonDisplayMode] = useState('both');
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [graphsOpen, setGraphsOpen] = useState(false);

  useEffect(() => {
    setIsLoadingClient(true);
    supabase
      .from('clients')
      .select('allow_challenges_participation, allow_anonymous_benchmarks')
      .eq('id', clientId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setClientSettings({
            allow_challenges_participation: data.allow_challenges_participation ?? false,
            allow_anonymous_benchmarks: data.allow_anonymous_benchmarks ?? false,
          });
        }
        setIsLoadingClient(false);
      });
  }, [clientId]);

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
    updatePortalSettings.mutate({
      clientId,
      settings: {
        ...portalSettings,
        progressMetrics: {
          ...currentMetrics,
          [key]: !currentMetrics[key as keyof typeof currentMetrics],
        },
      },
    });
  };

  const handleClientSettingToggle = async (key: 'allow_challenges_participation' | 'allow_anonymous_benchmarks', value: boolean) => {
    setIsSavingClient(true);
    const { error } = await supabase
      .from('clients')
      .update({ [key]: value })
      .eq('id', clientId);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setClientSettings(prev => ({ ...prev, [key]: value }));
    }
    setIsSavingClient(false);
  };

  const handleComparisonDisplayModeChange = (value: string) => {
    setComparisonDisplayMode(value);
    updatePortalSettings.mutate({
      clientId,
      settings: {
        ...portalSettings,
        comparisonDisplayMode: value as 'percentile_only' | 'leaderboard_only' | 'both',
      },
    });
  };

  const isLoading = isLoadingClient || isLoadingPortal;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Nastavení portálu</Label>

      {/* Challenges toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Účast v Challenges</span>
        </div>
        <Switch
          checked={clientSettings.allow_challenges_participation}
          onCheckedChange={(checked) => handleClientSettingToggle('allow_challenges_participation', checked)}
          disabled={isSavingClient}
        />
      </div>

      {/* Anonymous benchmarks toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Anonymní benchmarky</span>
        </div>
        <Switch
          checked={clientSettings.allow_anonymous_benchmarks}
          onCheckedChange={(checked) => handleClientSettingToggle('allow_anonymous_benchmarks', checked)}
          disabled={isSavingClient}
        />
      </div>

      {/* Comparison display mode */}
      <div className="p-3 border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Zobrazení porovnání</span>
        </div>
        <Select value={comparisonDisplayMode} onValueChange={handleComparisonDisplayModeChange}>
          <SelectTrigger className="h-9">
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

      {/* Graph visibility collapsible */}
      <Collapsible open={graphsOpen} onOpenChange={setGraphsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Viditelnost grafů
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", graphsOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1">
          {PROGRESS_METRICS.map(metric => {
            const Icon = metric.icon;
            const isEnabled = currentMetrics[metric.key as keyof typeof currentMetrics] ?? true;
            
            return (
              <div 
                key={metric.key}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">{metric.label}</span>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleMetricToggle(metric.key)}
                  disabled={updatePortalSettings.isPending}
                />
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Tracked Exercises inline component
function TrackedExercisesSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { data: trackedExercises, isLoading } = useClientTrackedExercisesAdmin(clientId);
  const { exercises: allExercises } = useExercises();
  const addExercise = useAddTrackedExercise();
  const removeExercise = useRemoveTrackedExercise();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const trackedIds = new Set(trackedExercises?.map(e => e.exercise_id) || []);
  
  const filteredExercises = (allExercises || [])
    .filter(e => !trackedIds.has(e.id))
    .filter(e => 
      (e.name_cs || e.name).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 15);

  const handleAddExercise = (exercise: { id: string; name: string; name_cs?: string }) => {
    addExercise.mutate({
      clientId,
      exerciseId: exercise.id,
      exerciseName: exercise.name_cs || exercise.name,
    });
    setSearchQuery('');
    setShowAddSection(false);
  };

  const handleRemoveExercise = (id: string) => {
    removeExercise.mutate({ id, clientId });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Dumbbell className="w-4 h-4" />
        Sledované cviky ({trackedExercises?.length || 0})
      </Label>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : trackedExercises?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg">
          Žádné sledované cviky
        </p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {trackedExercises?.map(exercise => (
            <div 
              key={exercise.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <span className="text-sm truncate">{exercise.exercise_name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleRemoveExercise(exercise.id)}
                disabled={removeExercise.isPending}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Collapsible open={showAddSection} onOpenChange={setShowAddSection}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Přidat cvik
            <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", showAddSection && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat cvik..."
              className="pl-9"
            />
          </div>
          
          <ScrollArea className="h-36">
            <div className="space-y-1">
              {filteredExercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  {searchQuery ? 'Žádné výsledky' : 'Začněte psát pro vyhledání'}
                </p>
              ) : (
                filteredExercises.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => handleAddExercise(exercise)}
                    disabled={addExercise.isPending}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left transition-colors text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{exercise.name_cs || exercise.name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
