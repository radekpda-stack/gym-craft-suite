import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  Dumbbell, 
  Search,
  User,
  ChevronRight,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrainingTemplate } from '@/hooks/useTrainingTemplates';
import { useClients, Client } from '@/hooks/useClients';
import { useAssignWorkoutToClient } from '@/hooks/useAssignWorkout';
import { motion } from 'framer-motion';

interface AssignTemplateToClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TrainingTemplate;
}

type Step = 'client' | 'details';

export function AssignTemplateToClientDialog({ 
  open, 
  onOpenChange, 
  template 
}: AssignTemplateToClientDialogProps) {
  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledFor, setScheduledFor] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"));
  const [durationMinutes, setDurationMinutes] = useState(template.estimated_duration?.toString() || '60');
  const [notes, setNotes] = useState('');

  const { data: clients, isLoading: loadingClients } = useClients();
  const assignWorkout = useAssignWorkoutToClient();

  // Filter out archived clients and search
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const activeClients = clients.filter(c => !c.is_archived);
    if (!searchQuery.trim()) return activeClients;
    
    const query = searchQuery.toLowerCase();
    return activeClients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setStep('details');
  };

  const handleBack = () => {
    setStep('client');
  };

  const handleAssign = async () => {
    if (!selectedClient) return;

    await assignWorkout.mutateAsync({
      client_id: selectedClient.id,
      template_id: template.id,
      scheduled_for: scheduledFor,
      workout_type: template.category || 'strength',
      duration_minutes: parseInt(durationMinutes) || undefined,
      notes: notes || undefined,
    });

    // Reset and close
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setStep('client');
    setSelectedClient(null);
    setSearchQuery('');
    setScheduledFor(format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"));
    setDurationMinutes(template.estimated_duration?.toString() || '60');
    setNotes('');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {step === 'client' ? 'Vybrat klienta' : 'Naplánovat trénink'}
          </DialogTitle>
          <DialogDescription>
            {step === 'client' 
              ? `Přiřaďte šablonu "${template.name}" klientovi`
              : `Nastavte detaily tréninku pro ${selectedClient?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'client' ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat klienty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Clients List */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loadingClients ? (
                <div className="py-8 text-center text-muted-foreground">
                  Načítám klienty...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Žádní klienti nenalezeni</p>
                  {searchQuery && (
                    <Button 
                      variant="link" 
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      Vymazat hledání
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {filteredClients.map((client, index) => (
                    <motion.button
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "flex items-center justify-between gap-3"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{client.name}</div>
                        {client.email && (
                          <div className="text-sm text-muted-foreground truncate">
                            {client.email}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Selected client summary */}
            {selectedClient && (
              <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{selectedClient.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {template.name}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Změnit
                </Button>
              </div>
            )}

            {/* Details form */}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled-for">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Datum a čas
                </Label>
                <Input
                  id="scheduled-for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Délka (min)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Poznámky pro klienta</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Volitelné poznámky k tréninku..."
                  rows={3}
                />
              </div>

              {/* Exercise preview */}
              {template.exercises && template.exercises.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    Cviky v šabloně ({template.exercises.length})
                  </Label>
                  <div className="border rounded-lg divide-y max-h-[150px] overflow-y-auto">
                    {template.exercises.map((ex, idx) => (
                      <div key={idx} className="p-2 text-sm flex items-center gap-2">
                        <span className="text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="flex-1 truncate">{ex.exercise_name}</span>
                        {ex.sets && (
                          <span className="text-muted-foreground text-xs">
                            {ex.sets}×{ex.reps_min || ex.reps_max || '?'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět
              </Button>
              <Button 
                onClick={handleAssign}
                disabled={assignWorkout.isPending}
              >
                {assignWorkout.isPending ? (
                  'Ukládám...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Naplánovat
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
