import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  usePortalClients, 
  PortalClient,
} from '@/hooks/useClientPortalAdmin';
import { 
  useClientTrackedExercisesAdmin,
  useAddTrackedExercise,
  useRemoveTrackedExercise,
  useClientPortalSettings,
  useUpdateClientPortalSettings,
} from '@/hooks/useClientTrackedExercisesAdmin';
import { useExercises } from '@/hooks/useExercises';
import { 
  Settings, 
  ChevronDown, 
  Dumbbell, 
  Plus, 
  X,
  Scale,
  Percent,
  Timer,
  PersonStanding,
  Search,
  Trophy,
  BarChart3,
  UserCircle,
  Eye,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

const GENDER_OPTIONS = [
  { value: 'male', label: 'Muž' },
  { value: 'female', label: 'Žena' },
  { value: 'unspecified', label: 'Nespecifikováno' },
] as const;

// Graphs Settings Section
function GraphsSettingsSection({ clientId }: { clientId: string }) {
  const { data: portalSettings, isLoading } = useClientPortalSettings(clientId);
  const updatePortalSettings = useUpdateClientPortalSettings();

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Viditelnost grafů
        </CardTitle>
        <CardDescription>
          Vyberte, které grafy uvidí klient v sekci Pokrok
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

// Challenges Settings Section
function ChallengesSettingsSection({ clientId }: { clientId: string }) {
  const { data: portalSettings, isLoading: isLoadingPortal } = useClientPortalSettings(clientId);
  const updatePortalSettings = useUpdateClientPortalSettings();
  
  const [clientSettings, setClientSettings] = useState({
    allow_challenges_participation: false,
    allow_anonymous_benchmarks: false,
  });
  const [comparisonDisplayMode, setComparisonDisplayMode] = useState('both');
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [isSavingClient, setIsSavingClient] = useState(false);

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
      toast({ title: 'Nastavení uloženo' });
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Challenges & Benchmarky
        </CardTitle>
        <CardDescription>
          Nastavení účasti v challenges a zobrazení porovnání
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <span className="font-medium text-sm">Účast v Challenges</span>
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
                  <span className="font-medium text-sm">Anonymní benchmarky</span>
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
                <span className="font-medium text-sm">Zobrazení porovnání</span>
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
      </CardContent>
    </Card>
  );
}

// Profile Settings Section
function ProfileSettingsSection({ clientId }: { clientId: string }) {
  const [gender, setGender] = useState('unspecified');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    supabase
      .from('clients')
      .select('gender')
      .eq('id', clientId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setGender(data.gender || 'unspecified');
        }
        setIsLoading(false);
      });
  }, [clientId]);

  const handleGenderChange = async (value: string) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({ gender: value === 'unspecified' ? null : value })
      .eq('id', clientId);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setGender(value);
      toast({ title: 'Pohlaví uloženo' });
    }
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          Profil pro porovnání
        </CardTitle>
        <CardDescription>
          Nastavení pro správné zařazení do porovnávacích skupin (k-anonymita)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="p-4 rounded-lg border space-y-3">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Pohlaví</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Používá se pro zařazení do správné skupiny při anonymním porovnání
            </p>
            <Select value={gender} onValueChange={handleGenderChange} disabled={isSaving}>
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
      </CardContent>
    </Card>
  );
}

// Tracked Exercises Section
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
    .slice(0, 20);

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          Sledované cviky
        </CardTitle>
        <CardDescription>
          Cviky, které {clientName} uvidí v sekci Pokrok
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
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
      </CardContent>
    </Card>
  );
}

// Main Component
export function ClientPortalSettingsPage() {
  const { data: clients, isLoading } = usePortalClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Auto-select first client when loaded
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].client_id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = clients?.find(c => c.client_id === selectedClientId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Zatím žádní klienti s přístupem do portálu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nejprve pozvěte klienty v záložce "Klienti"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Nastavení portálu pro klienta
          </CardTitle>
          <CardDescription>
            Vyberte klienta a upravte jeho nastavení portálu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientSearchSelect
            clients={clients.map(pc => ({
              id: pc.client_id,
              name: pc.client?.name || 'Neznámý',
              is_archived: false,
            })) as any}
            value={selectedClientId}
            onValueChange={setSelectedClientId}
            placeholder="Vyberte klienta"
            className="w-full sm:max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Settings Sections */}
      {selectedClientId && selectedClient && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <GraphsSettingsSection clientId={selectedClientId} />
            <ChallengesSettingsSection clientId={selectedClientId} />
          </div>
          <div className="space-y-6">
            <ProfileSettingsSection clientId={selectedClientId} />
            <TrackedExercisesSection 
              clientId={selectedClientId} 
              clientName={selectedClient.client?.name || 'klient'} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
