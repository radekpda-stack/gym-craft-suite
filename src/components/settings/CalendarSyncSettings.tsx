import { useState } from 'react';
import { 
  Calendar, Plus, RefreshCw, Trash2, CheckCircle2, XCircle, 
  Clock, Users, ExternalLink, Loader2, AlertTriangle, Settings2,
  GraduationCap, Sparkles, Pause, Play, FileCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useICSFeeds, 
  useICSEvents,
  useCreateICSFeed, 
  useDeleteICSFeed, 
  useSyncICSFeed,
  useCreateSessionsFromEvents,
  useTestICSUrl,
  useUpdateEventClientMatch,
  useUpdateICSFeed,
  ICSFeed,
} from '@/hooks/useCalendarSync';
import { useImportStats } from '@/hooks/useCalendarImport';
import { useClients } from '@/hooks/useClients';
import { ClientMatchSuggestions, MatchSuggestion } from './ClientMatchSuggestions';
import { CalendarImportReview } from './CalendarImportReview';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CalendarSyncSettings() {
  const { data: feeds, isLoading } = useICSFeeds();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<ICSFeed | null>(null);
  const [eventsDialogFeedId, setEventsDialogFeedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Import z kalendáře (ICS)
              </CardTitle>
              <CardDescription>
                Propojte svůj Apple Calendar nebo jiný kalendář přes ICS odkaz
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Přidat kalendář
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feeds?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Zatím nemáte připojený žádný kalendář
              </p>
              <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Přidat první kalendář
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {feeds?.map((feed) => (
                <FeedCard 
                  key={feed.id} 
                  feed={feed} 
                  onOpenImportReview={() => setSelectedFeed(feed)}
                  onViewEvents={() => setEventsDialogFeedId(feed.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to get ICS URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jak získat ICS odkaz z Apple Calendar?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Otevřete <strong>iCloud.com</strong> v prohlížeči a přihlaste se</li>
            <li>Přejděte do <strong>Kalendář</strong></li>
            <li>Klikněte na ikonu <strong>sdílení</strong> u kalendáře (vpravo od názvu)</li>
            <li>Zaškrtněte <strong>"Veřejný kalendář"</strong></li>
            <li>Zkopírujte odkaz a vložte ho sem</li>
          </ol>
          <div className="flex items-center gap-2 pt-2">
            <a 
              href="https://www.icloud.com/calendar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Otevřít iCloud Kalendář
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <AddFeedDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      
      {/* New import review dialog */}
      {selectedFeed && (
        <CalendarImportReview
          feedId={selectedFeed.id}
          feedName={selectedFeed.name}
          isOpen={!!selectedFeed}
          onClose={() => setSelectedFeed(null)}
        />
      )}
      
      {/* Legacy events dialog for viewing all events */}
      {eventsDialogFeedId && (
        <EventsDialog 
          feedId={eventsDialogFeedId} 
          open={!!eventsDialogFeedId} 
          onOpenChange={(open) => !open && setEventsDialogFeedId(null)} 
        />
      )}
    </div>
  );
}

function FeedCard({ feed, onOpenImportReview, onViewEvents }: { feed: ICSFeed; onOpenImportReview: () => void; onViewEvents: () => void }) {
  const { data: stats } = useImportStats(feed.id);
  const syncFeed = useSyncICSFeed();
  const deleteFeed = useDeleteICSFeed();
  const updateFeed = useUpdateICSFeed();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSync = async () => {
    if (!feed.is_active) {
      toast.error('Synchronizace je pozastavena');
      return;
    }
    try {
      const result = await syncFeed.mutateAsync(feed.id);
      toast.success(`Synchronizováno ${result.events_synced} událostí`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Synchronizace selhala';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFeed.mutateAsync(feed.id);
      toast.success('Kalendář odstraněn');
    } catch (error) {
      toast.error('Nepodařilo se odstranit kalendář');
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateFeed.mutateAsync({ 
        id: feed.id, 
        is_active: !feed.is_active 
      });
      toast.success(feed.is_active ? 'Synchronizace pozastavena' : 'Synchronizace obnovena');
    } catch (error) {
      toast.error('Nepodařilo se změnit stav synchronizace');
    }
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-opacity",
      !feed.is_active && "opacity-60 bg-muted/30"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">{feed.name}</span>
            {!feed.is_active ? (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <Pause className="h-3 w-3 mr-1" />
                Pozastaveno
              </Badge>
            ) : feed.last_sync_status === 'success' ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aktivní
              </Badge>
            ) : feed.last_sync_status === 'error' ? (
              <Badge variant="outline" className="text-destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Chyba
              </Badge>
            ) : null}
            {feed.import_filter_tag && (
              <Badge variant="secondary" className="text-xs">
                Filtr: {feed.import_filter_tag}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {feed.last_sync_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sync: {formatDistanceToNow(new Date(feed.last_sync_at), { addSuffix: true, locale: cs })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {feed.events_synced} událostí
            </span>
          </div>
          {feed.last_sync_error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {feed.last_sync_error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={feed.is_active}
                    onCheckedChange={handleToggleActive}
                    disabled={updateFeed.isPending}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {feed.is_active ? 'Pozastavit synchronizaci' : 'Obnovit synchronizaci'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncFeed.isPending}
          >
            {syncFeed.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <FeedSettingsDialog 
            feed={feed} 
            open={settingsOpen} 
            onOpenChange={setSettingsOpen} 
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Odstranit kalendář?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tato akce odstraní kalendář a všechny importované události. Již vytvořené tréninky zůstanou zachovány.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Odstranit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {feed.events_synced > 0 && (
        <div className="mt-4 pt-4 border-t flex items-center gap-3">
          <Button 
            onClick={onOpenImportReview}
            variant="default"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Zkontrolovat a importovat
            {stats && stats.readyToImport > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.readyToImport}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onViewEvents}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Všechny události
          </Button>
        </div>
      )}
    </div>
  );
}

function FeedSettingsDialog({ feed, open, onOpenChange }: { feed: ICSFeed; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(feed.name);
  const [importFilterTag, setImportFilterTag] = useState(feed.import_filter_tag || '');
  const updateFeed = useUpdateICSFeed();

  const handleSave = async () => {
    try {
      await updateFeed.mutateAsync({
        id: feed.id,
        name,
        import_filter_tag: importFilterTag.trim() || null,
      });
      toast.success('Nastavení uloženo');
      onOpenChange(false);
    } catch (error) {
      toast.error('Nepodařilo se uložit nastavení');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nastavení kalendáře</DialogTitle>
          <DialogDescription>
            Upravte název a filtrační značku pro tento kalendář
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedName">Název</Label>
            <Input
              id="feedName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apple Calendar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedFilterTag">Filtrační značka</Label>
            <Input
              id="feedFilterTag"
              value={importFilterTag}
              onChange={(e) => setImportFilterTag(e.target.value)}
              placeholder="#PT nebo [T]"
            />
            <p className="text-xs text-muted-foreground">
              Pokud je vyplněno, importují se pouze události obsahující tuto značku v názvu.
              Nechte prázdné pro import všech událostí.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!name || updateFeed.isPending}
          >
            {updateFeed.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFeedDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('Apple Calendar');
  const [icsUrl, setIcsUrl] = useState('');
  const [importFilterTag, setImportFilterTag] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
    events_count?: number;
  } | null>(null);

  const createFeed = useCreateICSFeed();
  const testUrl = useTestICSUrl();

  const handleTest = async () => {
    if (!icsUrl) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testUrl.mutateAsync(icsUrl);
      setTestResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test selhal';
      setTestResult({ valid: false, error: message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!icsUrl || !name) return;

    try {
      await createFeed.mutateAsync({
        name,
        ics_url: icsUrl,
        import_filter_tag: importFilterTag.trim() || undefined,
      });
      toast.success('Kalendář přidán');
      onOpenChange(false);
      setName('Apple Calendar');
      setIcsUrl('');
      setImportFilterTag('');
      setTestResult(null);
    } catch (error) {
      toast.error('Nepodařilo se přidat kalendář');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat ICS kalendář</DialogTitle>
          <DialogDescription>
            Vložte veřejný ICS odkaz z vašeho kalendáře
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Název</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apple Calendar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icsUrl">ICS URL</Label>
            <div className="flex gap-2">
              <Input
                id="icsUrl"
                value={icsUrl}
                onChange={(e) => {
                  setIcsUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://p123-caldav.icloud.com/..."
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleTest}
                disabled={!icsUrl || testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          {testResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              testResult.valid 
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              {testResult.valid ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Kalendář je platný! Nalezeno {testResult.events_count} událostí.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span>{testResult.error}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="importFilterTag">Filtrační značka (volitelné)</Label>
            <Input
              id="importFilterTag"
              value={importFilterTag}
              onChange={(e) => setImportFilterTag(e.target.value)}
              placeholder="#PT nebo [T]"
            />
            <p className="text-xs text-muted-foreground">
              Pokud je vyplněno, importují se pouze události obsahující tuto značku v názvu. 
              Např. <code className="bg-muted px-1 rounded">#PT Milan</code> se importuje, <code className="bg-muted px-1 rounded">Veterina</code> ne.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!icsUrl || !name || createFeed.isPending}
          >
            {createFeed.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Přidat kalendář
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventsDialog({ feedId, open, onOpenChange }: { 
  feedId: string; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { data: events, isLoading } = useICSEvents(feedId);
  const { data: clients } = useClients();
  const updateEventMatch = useUpdateEventClientMatch();

  const handleSelectClient = async (eventId: string, clientId: string, learn: boolean = false) => {
    try {
      await updateEventMatch.mutateAsync({ eventId, clientId, learn });
      if (learn) {
        toast.success('Klient přiřazen a vzor naučen');
      } else {
        toast.success('Klient přiřazen');
      }
    } catch (error) {
      toast.error('Nepodařilo se přiřadit klienta');
    }
  };

  const handleLearnAndSelect = async (eventId: string, clientId: string) => {
    await handleSelectClient(eventId, clientId, true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importované události
          </DialogTitle>
          <DialogDescription>
            Systém automaticky rozpoznává klienty podle jména, přezdívek i naučených vzorů
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : events?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Žádné události k zobrazení
            </div>
          ) : (
            <div className="space-y-2">
              {events?.map((event: any) => {
                const suggestions = (event.match_suggestions || []) as MatchSuggestion[];
                const additionalClients = event.additional_clients || [];
                const hasMultipleClients = event.matched_client && additionalClients.length > 0;
                
                return (
                  <div 
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      event.is_processed ? "bg-muted/50" : "bg-background",
                      hasMultipleClients && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{event.summary}</p>
                          {hasMultipleClients && (
                            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                              <Users className="h-3 w-3 mr-1" />
                              Skupinový
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_at), 'EEEE d. MMMM yyyy, HH:mm', { locale: cs })}
                        </p>
                        
                        {/* Show suggestions for unmatched events */}
                        {!event.matched_client && suggestions.length > 0 && (
                          <div className="pt-1">
                            <ClientMatchSuggestions
                              suggestions={suggestions}
                              onSelect={(clientId) => handleSelectClient(event.id, clientId)}
                              onLearn={(clientId) => handleLearnAndSelect(event.id, clientId)}
                              showLearnButton
                              disabled={updateEventMatch.isPending}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {event.matched_client ? (
                          <div className="flex flex-wrap gap-1 justify-end">
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {event.matched_client.name}
                            </Badge>
                            {additionalClients.map((client: { id: string; name: string }) => (
                              <Badge key={client.id} variant="secondary" className="gap-1">
                                {client.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Select
                            onValueChange={(value) => handleSelectClient(event.id, value)}
                            disabled={updateEventMatch.isPending}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Vybrat..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {event.is_processed && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
