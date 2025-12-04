import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Search, Plus, Dumbbell, Calendar, Clock, Loader2, Trash2, CheckCircle, Users, XCircle, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useClients';
import {
  useTrainingSessions,
  useCreateTrainingSession,
  useDeleteTrainingSession,
  useCompleteTrainingSession,
  useCancelTrainingSession,
  TrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { useAddTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
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
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';

export default function Trainings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [deletingTraining, setDeletingTraining] = useState<TrainingSession | null>(null);
  const [completingTraining, setCompletingTraining] = useState<TrainingSession | null>(null);
  const [cancelingTraining, setCancelingTraining] = useState<TrainingSession | null>(null);
  const [cancelDeductCredit, setCancelDeductCredit] = useState(true);
  const [completeParticipants, setCompleteParticipants] = useState(1);
  const [completeRating, setCompleteRating] = useState<number | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const createTraining = useCreateTrainingSession();
  const deleteTraining = useDeleteTrainingSession();
  const completeTraining = useCompleteTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const trainingPrices = useTrainingPrices();
  const addTrainingTags = useAddTrainingSessionTags();

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

  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    // Calculate recurrence end date if recurring
    let recurrence_end_date: string | undefined;
    let recurrence_type: 'weekly' | 'biweekly' | 'monthly' | undefined;
    
    if (data.is_recurring && data.recurrence_type && data.recurrence_count) {
      const startDate = new Date(data.date);
      const count = data.recurrence_count;
      recurrence_type = data.recurrence_type;
      
      // Calculate end date based on recurrence type
      const endDate = new Date(startDate);
      switch (data.recurrence_type) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + (count * 7));
          break;
        case 'biweekly':
          endDate.setDate(endDate.getDate() + (count * 14));
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + count);
          break;
      }
      recurrence_end_date = endDate.toISOString();
    }
    
    const result = await createTraining.mutateAsync({
      client_id: data.client_id,
      date: new Date(data.date).toISOString(),
      duration: data.duration,
      notes: data.notes,
      subjective_rating: data.subjective_rating || undefined,
      status: data.status,
      participant_count: data.participant_count,
      recurrence_type,
      recurrence_end_date,
      trainingPrices,
    });
    
    // Add tags to the created training
    if (tagIds.length > 0 && result?.session?.id) {
      await addTrainingTags.mutateAsync({
        trainingSessionId: result.session.id,
        tagIds,
      });
    }
    
    setIsCreateSheetOpen(false);
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

  const handleCancelTraining = async () => {
    if (!cancelingTraining) return;
    
    const trainingDate = new Date(cancelingTraining.date);
    const hoursUntilTraining = differenceInHours(trainingDate, new Date());
    const isLateCancellation = hoursUntilTraining < 24;

    await cancelTraining.mutateAsync({
      id: cancelingTraining.id,
      client_id: cancelingTraining.client_id,
      participant_count: cancelingTraining.participant_count || 1,
      isLateCancellation,
      trainingPrices,
      deductCredit: cancelDeductCredit,
    });
    
    setCancelingTraining(null);
    setCancelDeductCredit(true); // Reset for next time
  };

  const openCancelDialog = (session: TrainingSession) => {
    setCancelingTraining(session);
    setCancelDeductCredit(true); // Default to deduct credit
  };

  const getCancelPrice = () => {
    if (!cancelingTraining) return 0;
    return getTrainingPrice(cancelingTraining.participant_count || 1, trainingPrices);
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

      {/* Cancel Training Dialog */}
      <Dialog open={!!cancelingTraining} onOpenChange={(open) => !open && setCancelingTraining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zrušit trénink</DialogTitle>
            <DialogDescription>
              Opravdu chcete zrušit tento trénink?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Počet účastníků:</span>
                <span className="font-medium">{cancelingTraining?.participant_count || 1}</span>
              </div>
              {cancelDeductCredit && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Cena za trénink:</span>
                  <span className="text-lg font-bold text-destructive">{getCancelPrice()} Kč</span>
                </div>
              )}
              {cancelingTraining && differenceInHours(new Date(cancelingTraining.date), new Date()) < 24 && (
                <div className="mt-3 p-2 rounded bg-warning/10 text-warning text-sm">
                  ⚠️ Pozdní zrušení (méně než 24h před tréninkem)
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <Label htmlFor="deduct-credit" className="font-medium">Odečíst kredit</Label>
                <p className="text-sm text-muted-foreground">
                  {cancelDeductCredit 
                    ? `Bude odečteno ${getCancelPrice()} Kč z kreditu klienta`
                    : "Kredit klienta zůstane beze změny"
                  }
                </p>
              </div>
              <Switch
                id="deduct-credit"
                checked={cancelDeductCredit}
                onCheckedChange={setCancelDeductCredit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelingTraining(null)}>
              Zpět
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelTraining} 
              disabled={cancelTraining.isPending}
            >
              {cancelTraining.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ruším...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  {cancelDeductCredit ? "Zrušit a odečíst kredit" : "Zrušit bez odečtení"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {session.status === 'scheduled' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-success hover:text-success hover:bg-success/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openCompleteDialog(session);
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Dokončit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openCancelDialog(session);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Zrušit
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeletingTraining(session);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <Link to={`/trainings/${session.id}`} className="block">
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
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
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
                          {(session.recurrence_type || session.parent_session_id) && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1 text-primary">
                                <Repeat className="w-4 h-4" />
                                <span>Opakující se</span>
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
                </Link>
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
