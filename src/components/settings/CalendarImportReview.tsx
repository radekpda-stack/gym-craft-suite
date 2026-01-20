import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  CheckCircle2, XCircle, AlertTriangle, User, Users,
  ChevronDown, ChevronUp, Check, X, Loader2, Search,
  Calendar, Clock, ArrowRight, Sparkles, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useImportableEvents,
  useImportStats,
  useApproveEvents,
  useSkipEvents,
  useCreateApprovedSessions,
  useUpdateEventClient,
  useDeleteUnfilteredEvents,
  ImportableEvent,
} from '@/hooks/useCalendarImport';
import { useSyncICSFeed } from '@/hooks/useCalendarSync';
import { useClients } from '@/hooks/useClients';

interface CalendarImportReviewProps {
  feedId: string;
  feedName: string;
  isOpen: boolean;
  onClose: () => void;
}

type EventCategory = 'ready' | 'needs_assignment' | 'duplicates';

export function CalendarImportReview({ feedId, feedName, isOpen, onClose }: CalendarImportReviewProps) {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<EventCategory>>(new Set(['ready', 'needs_assignment']));
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useImportableEvents(feedId);
  const { data: stats, refetch: refetchStats } = useImportStats(feedId);
  const { data: clients = [] } = useClients();
  
  const syncFeed = useSyncICSFeed();
  const approveEvents = useApproveEvents();
  const skipEvents = useSkipEvents();
  const createSessions = useCreateApprovedSessions();
  const updateEventClient = useUpdateEventClient();
  const deleteUnfiltered = useDeleteUnfilteredEvents();

  // Categorize events
  const categorizedEvents = useMemo(() => {
    const filtered = events.filter(e => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        e.summary?.toLowerCase().includes(query) ||
        e.matched_client?.name?.toLowerCase().includes(query)
      );
    });

    return {
      ready: filtered.filter(e => e.matched_client_id && !e.potential_duplicate_session_id),
      needs_assignment: filtered.filter(e => !e.matched_client_id),
      duplicates: filtered.filter(e => e.matched_client_id && e.potential_duplicate_session_id),
    };
  }, [events, searchQuery]);

  const toggleSection = (section: EventCategory) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const selectAllInCategory = (category: EventCategory, checked: boolean) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      for (const event of categorizedEvents[category]) {
        if (checked) {
          next.add(event.id);
        } else {
          next.delete(event.id);
        }
      }
      return next;
    });
  };

  const handleSync = async () => {
    try {
      await syncFeed.mutateAsync(feedId);
      await refetchEvents();
      await refetchStats();
      toast.success('Události synchronizovány');
    } catch (error) {
      toast.error('Nepodařilo se synchronizovat');
    }
  };

  const handleApproveSelected = async () => {
    if (selectedEvents.size === 0) {
      toast.error('Vyberte události ke schválení');
      return;
    }

    // Filter to only events with matched clients
    const eventsToApprove = Array.from(selectedEvents).filter(id => {
      const event = events.find(e => e.id === id);
      return event?.matched_client_id;
    });

    if (eventsToApprove.length === 0) {
      toast.error('Vybrané události nemají přiřazené klienty');
      return;
    }

    try {
      await approveEvents.mutateAsync(eventsToApprove);
      setSelectedEvents(new Set());
      toast.success(`Schváleno ${eventsToApprove.length} událostí`);
    } catch (error) {
      toast.error('Nepodařilo se schválit události');
    }
  };

  const handleSkipSelected = async () => {
    if (selectedEvents.size === 0) {
      toast.error('Vyberte události k přeskočení');
      return;
    }

    try {
      await skipEvents.mutateAsync(Array.from(selectedEvents));
      setSelectedEvents(new Set());
      toast.success('Události označeny k přeskočení');
    } catch (error) {
      toast.error('Nepodařilo se označit události');
    }
  };

  const handleImport = async () => {
    // First approve all selected events
    const eventsToApprove = Array.from(selectedEvents).filter(id => {
      const event = events.find(e => e.id === id);
      return event?.matched_client_id && !event.import_approved;
    });

    try {
      if (eventsToApprove.length > 0) {
        await approveEvents.mutateAsync(eventsToApprove);
      }

      const result = await createSessions.mutateAsync(feedId);
      
      toast.success(
        `Vytvořeno ${result.sessions_created} tréninků` +
        (result.duplicates_skipped > 0 ? `, přeskočeno ${result.duplicates_skipped} duplikátů` : '')
      );
      
      setSelectedEvents(new Set());
      await refetchEvents();
      await refetchStats();
      
      if (result.sessions_created > 0) {
        onClose();
      }
    } catch (error) {
      toast.error('Nepodařilo se vytvořit tréninky');
    }
  };

  const handleAssignClient = async (eventId: string, clientId: string, learn: boolean = true) => {
    try {
      await updateEventClient.mutateAsync({ eventId, clientId, learn });
      setEditingEventId(null);
      toast.success('Klient přiřazen');
    } catch (error) {
      toast.error('Nepodařilo se přiřadit klienta');
    }
  };

  const selectedReadyCount = Array.from(selectedEvents).filter(id => 
    categorizedEvents.ready.some(e => e.id === id)
  ).length;

  const handleDeleteUnfiltered = async () => {
    try {
      const result = await deleteUnfiltered.mutateAsync(feedId);
      if (result.deleted_count > 0) {
        toast.success(`Smazáno ${result.deleted_count} nerelevantních událostí`);
        await refetchEvents();
        await refetchStats();
      } else {
        toast.info('Žádné nerelevantní události k smazání');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Nepodařilo se smazat události');
    }
  };

  const isProcessing = syncFeed.isPending || approveEvents.isPending || skipEvents.isPending || createSessions.isPending || deleteUnfiltered.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Import z kalendáře: {feedName}
          </DialogTitle>
          <DialogDescription>
            Zkontrolujte a schvalte události před vytvořením tréninků
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          <Badge variant="outline" className="text-primary">
            Celkem: {stats?.total || 0}
          </Badge>
          <Badge variant="outline" className="text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Připraveno: {stats?.readyToImport || 0}
          </Badge>
          <Badge variant="outline" className="text-amber-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            K přiřazení: {stats?.needsAssignment || 0}
          </Badge>
          {(stats?.potentialDuplicates || 0) > 0 && (
            <Badge variant="outline" className="text-orange-600">
              <Users className="h-3 w-3 mr-1" />
              Možné duplikáty: {stats?.potentialDuplicates}
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            Zpracováno: {stats?.processed || 0}
          </Badge>
        </div>

        {/* Search and actions */}
        <div className="flex items-center gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat události..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isProcessing}
          >
            {syncFeed.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Sync</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteUnfiltered}
            disabled={isProcessing}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Vymazat události bez #TR tagu"
          >
            {deleteUnfiltered.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Vyčistit</span>
          </Button>
        </div>

        {/* Events list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Žádné události k importu</p>
              <p className="text-sm">Synchronizujte kalendář pro načtení nových událostí</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Ready to import section */}
              <EventSection
                title="Připraveno k importu"
                icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                events={categorizedEvents.ready}
                category="ready"
                isExpanded={expandedSections.has('ready')}
                onToggle={() => toggleSection('ready')}
                selectedEvents={selectedEvents}
                onToggleEvent={toggleEventSelection}
                onSelectAll={(checked) => selectAllInCategory('ready', checked)}
                clients={clients}
                editingEventId={editingEventId}
                onStartEdit={setEditingEventId}
                onAssignClient={handleAssignClient}
                isProcessing={updateEventClient.isPending}
              />

              {/* Needs assignment section */}
              <EventSection
                title="Vyžaduje přiřazení klienta"
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                events={categorizedEvents.needs_assignment}
                category="needs_assignment"
                isExpanded={expandedSections.has('needs_assignment')}
                onToggle={() => toggleSection('needs_assignment')}
                selectedEvents={selectedEvents}
                onToggleEvent={toggleEventSelection}
                onSelectAll={(checked) => selectAllInCategory('needs_assignment', checked)}
                clients={clients}
                editingEventId={editingEventId}
                onStartEdit={setEditingEventId}
                onAssignClient={handleAssignClient}
                isProcessing={updateEventClient.isPending}
              />

              {/* Potential duplicates section */}
              {categorizedEvents.duplicates.length > 0 && (
                <EventSection
                  title="Možné duplikáty"
                  icon={<Users className="h-4 w-4 text-orange-600" />}
                  events={categorizedEvents.duplicates}
                  category="duplicates"
                  isExpanded={expandedSections.has('duplicates')}
                  onToggle={() => toggleSection('duplicates')}
                  selectedEvents={selectedEvents}
                  onToggleEvent={toggleEventSelection}
                  onSelectAll={(checked) => selectAllInCategory('duplicates', checked)}
                  clients={clients}
                  editingEventId={editingEventId}
                  onStartEdit={setEditingEventId}
                  onAssignClient={handleAssignClient}
                  isProcessing={updateEventClient.isPending}
                  showDuplicateWarning
                />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer actions */}
        <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {selectedEvents.size > 0 && (
              <span>Vybráno: {selectedEvents.size}</span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipSelected}
            disabled={selectedEvents.size === 0 || isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Přeskočit
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={selectedReadyCount === 0 || isProcessing}
          >
            {createSessions.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-1" />
            )}
            Importovat ({selectedReadyCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EventSectionProps {
  title: string;
  icon: React.ReactNode;
  events: ImportableEvent[];
  category: EventCategory;
  isExpanded: boolean;
  onToggle: () => void;
  selectedEvents: Set<string>;
  onToggleEvent: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  editingEventId: string | null;
  onStartEdit: (id: string | null) => void;
  onAssignClient: (eventId: string, clientId: string, learn: boolean) => void;
  isProcessing: boolean;
  showDuplicateWarning?: boolean;
}

function EventSection({
  title,
  icon,
  events,
  category,
  isExpanded,
  onToggle,
  selectedEvents,
  onToggleEvent,
  onSelectAll,
  clients,
  editingEventId,
  onStartEdit,
  onAssignClient,
  isProcessing,
  showDuplicateWarning = false,
}: EventSectionProps) {
  if (events.length === 0) return null;

  const allSelected = events.every(e => selectedEvents.has(e.id));
  const someSelected = events.some(e => selectedEvents.has(e.id));

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-medium">{title}</span>
              <Badge variant="secondary">{events.length}</Badge>
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t">
            {/* Select all header */}
            <div className="flex items-center gap-2 p-2 bg-muted/30 border-b">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                className="ml-1"
              />
              <span className="text-sm text-muted-foreground">
                {allSelected ? 'Odznačit vše' : 'Vybrat vše'}
              </span>
            </div>

            {/* Event items */}
            <div className="divide-y">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isSelected={selectedEvents.has(event.id)}
                  onToggle={() => onToggleEvent(event.id)}
                  clients={clients}
                  isEditing={editingEventId === event.id}
                  onStartEdit={() => onStartEdit(event.id)}
                  onCancelEdit={() => onStartEdit(null)}
                  onAssignClient={onAssignClient}
                  isProcessing={isProcessing}
                  showDuplicateWarning={showDuplicateWarning}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface EventRowProps {
  event: ImportableEvent;
  isSelected: boolean;
  onToggle: () => void;
  clients: Array<{ id: string; name: string }>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAssignClient: (eventId: string, clientId: string, learn: boolean) => void;
  isProcessing: boolean;
  showDuplicateWarning: boolean;
}

function EventRow({
  event,
  isSelected,
  onToggle,
  clients,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onAssignClient,
  isProcessing,
  showDuplicateWarning,
}: EventRowProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [learnAlias, setLearnAlias] = useState(true);

  const eventDate = new Date(event.start_at);
  const formattedDate = format(eventDate, 'd. M.', { locale: cs });
  const formattedTime = format(eventDate, 'H:mm', { locale: cs });

  const suggestions = event.match_suggestions || [];
  const topSuggestion = suggestions[0];

  const handleConfirmAssign = () => {
    if (selectedClientId) {
      onAssignClient(event.id, selectedClientId, learnAlias);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 transition-colors",
      isSelected && "bg-primary/5"
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{event.summary || 'Bez názvu'}</span>
          {event.matched_client && (
            <Badge variant="outline" className="text-green-600 shrink-0">
              <User className="h-3 w-3 mr-1" />
              {event.matched_client.name}
            </Badge>
          )}
          {event.additional_clients && event.additional_clients.length > 0 && (
            <Badge variant="outline" className="text-blue-600 shrink-0">
              <Users className="h-3 w-3 mr-1" />
              +{event.additional_clients.length}
            </Badge>
          )}
          {showDuplicateWarning && event.potential_duplicate && (
            <Badge variant="outline" className="text-orange-600 shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Možný duplikát
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedTime}
          </span>
        </div>

        {/* Suggestions for unmatched events */}
        {!event.matched_client_id && suggestions.length > 0 && !isEditing && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Návrhy:</span>
            {suggestions.slice(0, 3).map((s) => (
              <Button
                key={s.client_id}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onAssignClient(event.id, s.client_id, true)}
                disabled={isProcessing}
              >
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                {s.name}
                <span className="ml-1 text-muted-foreground">({s.score}%)</span>
              </Button>
            ))}
          </div>
        )}

        {/* Client assignment form */}
        {isEditing && (
          <div className="flex items-center gap-2 mt-2">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Vybrat klienta..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
              <Checkbox
                id={`learn-${event.id}`}
                checked={learnAlias}
                onCheckedChange={(c) => setLearnAlias(!!c)}
              />
              <Label htmlFor={`learn-${event.id}`} className="text-xs">
                Zapamatovat
              </Label>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleConfirmAssign}
              disabled={!selectedClientId || isProcessing}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      {!event.matched_client_id && !isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={onStartEdit}
          disabled={isProcessing}
        >
          <User className="h-4 w-4 mr-1" />
          Přiřadit
        </Button>
      )}
    </div>
  );
}
