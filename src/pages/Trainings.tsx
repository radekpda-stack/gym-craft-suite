import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Search, Plus, Dumbbell, Calendar, Clock, Loader2, Pencil, Trash2, CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useClients';
import {
  useTrainingSessions,
  useCreateTrainingSession,
  useUpdateTrainingSession,
  useDeleteTrainingSession,
  useCompleteTrainingSession,
  TrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { EditTrainingSheet } from '@/components/trainings/EditTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { RatingDisplay, RatingInput } from '@/components/ui/rating-input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';

export default function Trainings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingSession | null>(null);
  const [deletingTraining, setDeletingTraining] = useState<TrainingSession | null>(null);
  const [completingTraining, setCompletingTraining] = useState<TrainingSession | null>(null);
  const [completeParticipants, setCompleteParticipants] = useState(1);
  const [completeRating, setCompleteRating] = useState<number | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const createTraining = useCreateTrainingSession();
  const updateTraining = useUpdateTrainingSession();
  const deleteTraining = useDeleteTrainingSession();
  const completeTraining = useCompleteTrainingSession();
  const trainingPrices = useTrainingPrices();

  const filteredSessions = sessions.filter((session) => {
    const client = clients.find((c) => c.id === session.client_id);
    const matchesSearch =
      client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    scheduled: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const statusLabels = {
    scheduled: 'Naplánováno',
    completed: 'Dokončeno',
    canceled: 'Zrušeno',
  };

  const handleCreateTraining = async (data: TrainingFormValues) => {
    await createTraining.mutateAsync({
      client_id: data.client_id,
      date: new Date(data.date).toISOString(),
      duration: data.duration,
      notes: data.notes,
      subjective_rating: data.subjective_rating || undefined,
      status: data.status,
      participant_count: data.participant_count,
    });
    setIsCreateSheetOpen(false);
  };

  const handleEditTraining = async (data: TrainingFormValues) => {
    if (!editingTraining) return;
    await updateTraining.mutateAsync({
      id: editingTraining.id,
      input: {
        date: new Date(data.date).toISOString(),
        duration: data.duration,
        notes: data.notes,
        subjective_rating: data.subjective_rating || undefined,
        status: data.status,
        participant_count: data.participant_count,
      },
    });
    setEditingTraining(null);
  };

  const handleDeleteTraining = async () => {
    if (!deletingTraining) return;
    await deleteTraining.mutateAsync(deletingTraining.id);
    setDeletingTraining(null);
  };

  const openCompleteDialog = (session: TrainingSession) => {
    setCompletingTraining(session);
    setCompleteParticipants(session.participant_count || 1);
    setCompleteRating(session.subjective_rating);
    setCompleteNotes(session.notes || '');
  };

  const handleCompleteTraining = async () => {
    if (!completingTraining) return;
    
    await completeTraining.mutateAsync({
      id: completingTraining.id,
      client_id: completingTraining.client_id,
      participant_count: completeParticipants,
      subjective_rating: completeRating || undefined,
      notes: completeNotes || undefined,
      trainingPrices,
    });
    
    setCompletingTraining(null);
  };

  const getExpectedPrice = () => {
    return getTrainingPrice(completeParticipants, trainingPrices);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Tréninky
          </h1>
          <p className="text-muted-foreground mt-1">
            {sessions.length} tréninků celkem
          </p>
        </div>

        <Button className="gap-2" onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Nový trénink
        </Button>
      </div>

      <CreateTrainingSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
      />

      <EditTrainingSheet
        open={!!editingTraining}
        onOpenChange={(open) => !open && setEditingTraining(null)}
        onSubmit={handleEditTraining}
        isLoading={updateTraining.isPending}
        clients={clients}
        training={editingTraining}
      />

      <AlertDialog open={!!deletingTraining} onOpenChange={(open) => !open && setDeletingTraining(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trénink?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat tento trénink? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTraining}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Training Dialog */}
      <Dialog open={!!completingTraining} onOpenChange={(open) => !open && setCompletingTraining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokončit trénink</DialogTitle>
            <DialogDescription>
              Vyplňte údaje a potvrďte dokončení tréninku. Kredit bude automaticky odečten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Počet účastníků</Label>
              <Select 
                value={completeParticipants.toString()} 
                onValueChange={(v) => setCompleteParticipants(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'osoba' : num < 5 ? 'osoby' : 'osob'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cena za trénink:</span>
                <span className="text-lg font-bold text-primary">{getExpectedPrice()} Kč</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hodnocení (volitelné)</Label>
              <RatingInput
                value={completeRating}
                onChange={setCompleteRating}
                max={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Poznámky</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Poznámky k tréninku..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingTraining(null)}>
              Zrušit
            </Button>
            <Button onClick={handleCompleteTraining} disabled={completeTraining.isPending}>
              {completeTraining.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Dokončit a odečíst kredit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat tréninky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
            className="rounded-xl"
          >
            Všechny
          </Button>
          {(['scheduled', 'completed', 'canceled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className="rounded-xl"
            >
              {statusLabels[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session, index) => {
            const client = clients.find((c) => c.id === session.client_id);

            return (
              <div
                key={session.id}
                className="glass rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] hover:glow group animate-slide-up relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {session.status === 'scheduled' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-success hover:text-success hover:bg-success/10"
                      onClick={() => openCompleteDialog(session)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Dokončit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingTraining(session)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingTraining(session)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {client?.name || 'Klient'}
                      </h3>
                      {session.notes && (
                        <p className="text-muted-foreground mt-1">
                          {session.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(session.date), 'd. MMMM yyyy', { locale: cs })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(session.date), 'HH:mm', { locale: cs })}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{session.duration} min</span>
                        {session.participant_count > 1 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{session.participant_count} osob</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RatingDisplay value={session.subjective_rating} />
                    <span
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border',
                        statusColors[session.status]
                      )}
                    >
                      {statusLabels[session.status]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredSessions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            {sessions.length === 0 ? "Zatím nemáte žádné tréninky" : "Žádné tréninky nenalezeny"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {sessions.length === 0
              ? "Vytvořte první trénink kliknutím na tlačítko výše"
              : "Zkuste upravit vyhledávání nebo filtry"}
          </p>
        </div>
      )}
    </div>
  );
}
