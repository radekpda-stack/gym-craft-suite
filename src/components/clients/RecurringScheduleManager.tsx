import { useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarClock,
  Plus,
  Trash2,
  Play,
  Loader2,
  Clock,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useRecurringSchedules,
  useCreateRecurringSchedule,
  useUpdateRecurringSchedule,
  useDeleteRecurringSchedule,
  useGenerateTrainingsFromSchedule,
  getDayName,
  RecurringSchedule,
} from '@/hooks/useRecurringSchedules';
import { cn } from '@/lib/utils';

interface RecurringScheduleManagerProps {
  clientId: string;
  clientName: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pondělí' },
  { value: 2, label: 'Úterý' },
  { value: 3, label: 'Středa' },
  { value: 4, label: 'Čtvrtek' },
  { value: 5, label: 'Pátek' },
  { value: 6, label: 'Sobota' },
  { value: 7, label: 'Neděle' },
];

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
];

export function RecurringScheduleManager({ clientId, clientName }: RecurringScheduleManagerProps) {
  const { data: schedules, isLoading } = useRecurringSchedules(clientId);
  const createSchedule = useCreateRecurringSchedule();
  const updateSchedule = useUpdateRecurringSchedule();
  const deleteSchedule = useDeleteRecurringSchedule();
  const generateTrainings = useGenerateTrainingsFromSchedule();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    time: '09:00',
    duration: 60,
    notes: '',
  });
  const [weeksAhead, setWeeksAhead] = useState(4);

  const handleAddSchedule = async () => {
    await createSchedule.mutateAsync({
      client_id: clientId,
      day_of_week: newSchedule.day_of_week,
      time: newSchedule.time,
      duration: newSchedule.duration,
      notes: newSchedule.notes || undefined,
    });
    setIsAddDialogOpen(false);
    setNewSchedule({ day_of_week: 1, time: '09:00', duration: 60, notes: '' });
  };

  const handleToggleActive = async (schedule: RecurringSchedule) => {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      clientId,
      input: { is_active: !schedule.is_active },
    });
  };

  const handleDelete = async (scheduleId: string) => {
    await deleteSchedule.mutateAsync({ id: scheduleId, clientId });
  };

  const handleGenerateTrainings = async () => {
    await generateTrainings.mutateAsync({ clientId, weeksAhead });
    setIsGenerateDialogOpen(false);
  };

  const activeSchedules = schedules?.filter(s => s.is_active) || [];
  const hasActiveSchedules = activeSchedules.length > 0;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <CalendarClock className="w-4 h-4" />
          <span className="text-sm font-medium">Pravidelné tréninky</span>
        </div>
        <div className="flex gap-2">
          {hasActiveSchedules && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateDialogOpen(true)}
              disabled={generateTrainings.isPending}
              className="gap-2"
            >
              {generateTrainings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Naplánovat
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Přidat
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : schedules && schedules.length > 0 ? (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl transition-colors',
                schedule.is_active
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted/50 border border-border opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium">{getDayName(schedule.day_of_week)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{schedule.time.slice(0, 5)}</span>
                    <span>•</span>
                    <span>{schedule.duration} min</span>
                  </div>
                  {schedule.notes && (
                    <span className="text-xs text-muted-foreground mt-1">{schedule.notes}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={() => handleToggleActive(schedule)}
                  disabled={updateSchedule.isPending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(schedule.id)}
                  disabled={deleteSchedule.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Zatím žádné pravidelné tréninky</p>
          <p className="text-xs mt-1">Přidejte pravidelný rozvrh pro automatické plánování</p>
        </div>
      )}

      {/* Add Schedule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat pravidelný trénink</DialogTitle>
            <DialogDescription>
              Nastavte den a čas, kdy se bude {clientName} pravidelně trénovat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Den v týdnu</Label>
              <Select
                value={String(newSchedule.day_of_week)}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, day_of_week: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Čas</Label>
              <Input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Délka tréninku</Label>
              <Select
                value={String(newSchedule.duration)}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, duration: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration.value} value={String(duration.value)}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Poznámky (volitelné)</Label>
              <Textarea
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                placeholder="Např. venkovní trénink, rehabilitace..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleAddSchedule} disabled={createSchedule.isPending}>
              {createSchedule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Přidat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Trainings Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naplánovat tréninky</DialogTitle>
            <DialogDescription>
              Vytvořit naplánované tréninky podle pravidelného rozvrhu pro {clientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Na kolik týdnů dopředu?</Label>
              <Select
                value={String(weeksAhead)}
                onValueChange={(value) => setWeeksAhead(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 týden</SelectItem>
                  <SelectItem value="2">2 týdny</SelectItem>
                  <SelectItem value="4">4 týdny</SelectItem>
                  <SelectItem value="8">8 týdnů</SelectItem>
                  <SelectItem value="12">12 týdnů</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Aktivní rozvrhy:</strong>
              </p>
              <ul className="mt-2 space-y-1">
                {activeSchedules.map((schedule) => (
                  <li key={schedule.id} className="text-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-primary" />
                    {getDayName(schedule.day_of_week)} v {schedule.time.slice(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleGenerateTrainings} disabled={generateTrainings.isPending}>
              {generateTrainings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Naplánovat tréninky
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
