import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Key, 
  Shield, 
  ShieldOff, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  ChevronDown,
  Dumbbell,
  Plus,
  X,
  Trophy,
  BarChart3,
  Scale,
  Percent,
  Timer,
  PersonStanding,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CreateClientAccessDialog } from './CreateClientAccessDialog';
import { EditCredentialsDialog } from './EditCredentialsDialog';
import {
  useClientTrackedExercisesAdmin,
  useAddTrackedExercise,
  useRemoveTrackedExercise,
  useClientPortalSettings,
  useUpdateClientPortalSettings,
} from '@/hooks/useClientTrackedExercisesAdmin';
import { useExercises } from '@/hooks/useExercises';

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

interface ClientPortalAccessSectionProps {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  showSettings?: boolean;
}

interface ClientAccountInfo {
  id: string;
  status: string;
  last_portal_login: string | null;
  last_password_reset_at: string | null;
  created_at: string;
  auth_user_id: string | null;
  portal_password: string | null;
  credit_history_start_at: string | null;
}

export function ClientPortalAccessSection({
  clientId,
  clientName,
  clientEmail,
  showSettings = true,
}: ClientPortalAccessSectionProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exercisesOpen, setExercisesOpen] = useState(false);

  const { data: accountInfo, isLoading } = useQuery({
    queryKey: ['client-portal-access', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('id, status, last_portal_login, last_password_reset_at, created_at, auth_user_id, portal_password, credit_history_start_at')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientAccountInfo | null;
    },
  });

  const hasAccess = !!accountInfo?.auth_user_id;
  const isActive = accountInfo?.status === 'active';

  const handleToggleAccess = async () => {
    if (!accountInfo) return;

    setToggling(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'disable-client-portal-access',
        {
          body: { 
            client_id: clientId, 
            disabled: isActive 
          },
        }
      );

      if (error) {
        console.error('Toggle access error:', error);
        toast.error('Nepodařilo se změnit stav přístupu');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      toast.success(isActive ? 'Přístup deaktivován' : 'Přístup aktivován');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Neočekávaná chyba');
    } finally {
      setToggling(false);
    }
  };

  const handleRemoveAccess = async () => {
    setRemoving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'remove-client-portal-access',
        {
          body: { client_id: clientId },
        }
      );

      if (error) {
        console.error('Remove access error:', error);
        toast.error('Nepodařilo se odebrat přístup');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      toast.success('Přístup do portálu byl odebrán');
      setRemoveDialogOpen(false);
    } catch (err) {
      console.error('Remove error:', err);
      toast.error('Neočekávaná chyba');
    } finally {
      setRemoving(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!accountInfo?.portal_password) return;
    
    try {
      await navigator.clipboard.writeText(accountInfo.portal_password);
      setCopied(true);
      toast.success('Heslo zkopírováno');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Nepodařilo se zkopírovat heslo');
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
    queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5 shrink-0" />
            Klientská zóna
          </CardTitle>
          <CardDescription>
            Přístup klienta do portálu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium shrink-0">Stav</span>
            {!hasAccess ? (
              <Badge variant="outline" className="gap-1 shrink-0">
                <XCircle className="w-3 h-3" />
                Bez přístupu
              </Badge>
            ) : isActive ? (
              <Badge className="gap-1 bg-success/10 text-success border-success/20 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Aktivní
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 shrink-0">
                <ShieldOff className="w-3 h-3" />
                Deaktivovaný
              </Badge>
            )}
          </div>

          {/* Email */}
          {clientEmail && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Email pro login</span>
              <span className="text-sm text-muted-foreground truncate">{clientEmail}</span>
            </div>
          )}

          {/* Password */}
          {hasAccess && accountInfo?.portal_password && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Heslo</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {showPassword ? accountInfo.portal_password : '••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyPassword}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditDialogOpen(true)}
                  title="Upravit přihlašovací údaje"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Last login */}
          {hasAccess && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Poslední přihlášení</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" />
                {accountInfo?.last_portal_login 
                  ? format(new Date(accountInfo.last_portal_login), 'd. M. yyyy HH:mm', { locale: cs })
                  : 'Nikdy'}
              </span>
            </div>
          )}

          {/* Last password reset */}
          {hasAccess && accountInfo?.last_password_reset_at && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Poslední reset hesla</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(accountInfo.last_password_reset_at), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
          )}

          {/* Credit history start date */}
          {hasAccess && accountInfo?.credit_history_start_at && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Historie kreditu od</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(accountInfo.credit_history_start_at), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
          )}

          {/* Portal login link */}
          {hasAccess && isActive && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <span className="text-sm font-medium shrink-0">Odkaz pro přihlášení</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm text-primary gap-1"
                onClick={() => window.open(`${window.location.origin}/login?mode=client`, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
                Otevřít přihlášení
              </Button>
            </div>
          )}

          {/* Portal Settings Collapsible - only when has access */}
          {hasAccess && showSettings && (
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between mt-2">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Nastavení portálu
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", settingsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <PortalSettingsInline clientId={clientId} />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Tracked Exercises Collapsible - only when has access */}
          {hasAccess && showSettings && (
            <Collapsible open={exercisesOpen} onOpenChange={setExercisesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    Sledované cviky
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", exercisesOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <TrackedExercisesInline clientId={clientId} />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {!hasAccess ? (
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="w-full gap-2"
                disabled={!clientEmail}
              >
                <Key className="w-4 h-4" />
                Vytvořit přístup
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resetovat heslo
                </Button>

                <Button 
                  onClick={handleToggleAccess}
                  variant={isActive ? 'secondary' : 'default'}
                  className="w-full gap-2"
                  disabled={toggling}
                >
                  {isActive ? (
                    <>
                      <ShieldOff className="w-4 h-4" />
                      {toggling ? 'Deaktivuji...' : 'Deaktivovat přístup'}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      {toggling ? 'Aktivuji...' : 'Aktivovat přístup'}
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setRemoveDialogOpen(true)}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Odebrat přístup
                </Button>
              </>
            )}

            {!clientEmail && (
              <p className="text-xs text-destructive text-center">
                Pro vytvoření přístupu přidejte klientovi email.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateClientAccessDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        onSuccess={handleSuccess}
      />

      {hasAccess && clientEmail && (
        <EditCredentialsDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          clientId={clientId}
          clientName={clientName}
          currentEmail={clientEmail}
          currentPassword={accountInfo?.portal_password || null}
          onSuccess={handleSuccess}
        />
      )}

      {/* Remove access confirmation dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat přístup do portálu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tímto zcela odeberete přístup klienta <strong>{clientName}</strong> do klientského portálu. 
              Účet bude smazán a klient se již nebude moci přihlásit. 
              Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAccess}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Odebírám...' : 'Odebrat přístup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Inline Portal Settings Component
function PortalSettingsInline({ clientId }: { clientId: string }) {
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
      toast.error(error.message);
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
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Challenges toggle */}
      <div className="flex items-center justify-between p-2.5 border rounded-lg">
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
      <div className="flex items-center justify-between p-2.5 border rounded-lg">
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
      <div className="p-2.5 border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Zobrazení porovnání</span>
        </div>
        <Select value={comparisonDisplayMode} onValueChange={handleComparisonDisplayModeChange}>
          <SelectTrigger className="h-8">
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
          <Button variant="ghost" size="sm" className="w-full justify-between h-9">
            <span className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              Viditelnost grafů
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", graphsOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1 space-y-1">
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

// Inline Tracked Exercises Component
function TrackedExercisesInline({ clientId }: { clientId: string }) {
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

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">
        Sledovaných cviků: {trackedExercises?.length || 0}
      </Label>

      {trackedExercises?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 text-center border rounded-lg">
          Žádné sledované cviky
        </p>
      ) : (
        <div className="space-y-1 max-h-28 overflow-y-auto">
          {trackedExercises?.map(exercise => (
            <div 
              key={exercise.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <span className="text-sm truncate">{exercise.exercise_name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleRemoveExercise(exercise.id)}
                disabled={removeExercise.isPending}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Collapsible open={showAddSection} onOpenChange={setShowAddSection}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full h-8">
            <Plus className="w-3.5 h-3.5 mr-2" />
            Přidat cvik
            <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", showAddSection && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat cvik..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {filteredExercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
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
                    <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
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
