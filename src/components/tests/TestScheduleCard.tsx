import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarDays, Plus, Trash2, Check, Clock, AlertCircle } from 'lucide-react';
import { useTestSchedules, useCreateTestSchedule, useDeleteTestSchedule, useCompleteTestSchedule } from '@/hooks/useTestSchedules';
import { useTestDefinitions } from '@/hooks/useTestDefinitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, isBefore, isToday, isTomorrow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TestScheduleCardProps {
  clientId: string;
  testDefinitionId?: string;
  compact?: boolean;
}

export function TestScheduleCard({ clientId, testDefinitionId, compact = false }: TestScheduleCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTestId, setSelectedTestId] = useState<string>(testDefinitionId || '');
  const [notes, setNotes] = useState('');
  
  const { data: schedules, isLoading } = useTestSchedules(clientId);
  const { data: definitions } = useTestDefinitions();
  const createSchedule = useCreateTestSchedule();
  const deleteSchedule = useDeleteTestSchedule();
  const completeSchedule = useCompleteTestSchedule();
  
  const filteredSchedules = testDefinitionId 
    ? schedules?.filter(s => s.test_definition_id === testDefinitionId)
    : schedules;
  
  const handleCreate = async () => {
    if (!selectedDate || !selectedTestId) return;
    
    await createSchedule.mutateAsync({
      client_id: clientId,
      test_definition_id: selectedTestId,
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      notes: notes || undefined,
    });
    
    setIsAdding(false);
    setSelectedDate(undefined);
    setNotes('');
    if (!testDefinitionId) setSelectedTestId('');
  };
  
  const getScheduleStatus = (date: string) => {
    const scheduleDate = new Date(date);
    const today = new Date();
    
    if (isBefore(scheduleDate, today) && !isToday(scheduleDate)) {
      return { label: 'Zpožděno', variant: 'destructive' as const, icon: AlertCircle };
    }
    if (isToday(scheduleDate)) {
      return { label: 'Dnes', variant: 'default' as const, icon: Clock };
    }
    if (isTomorrow(scheduleDate)) {
      return { label: 'Zítra', variant: 'secondary' as const, icon: CalendarDays };
    }
    
    const daysUntil = differenceInDays(scheduleDate, today);
    return { label: `Za ${daysUntil} dní`, variant: 'outline' as const, icon: CalendarDays };
  };
  
  if (compact) {
    return (
      <div className="space-y-2">
        {filteredSchedules?.map(schedule => {
          const status = getScheduleStatus(schedule.scheduled_date);
          const StatusIcon = status.icon;
          
          return (
            <div
              key={schedule.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border',
                status.variant === 'destructive' && 'border-destructive/50 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-2">
                <StatusIcon className={cn(
                  'w-4 h-4',
                  status.variant === 'destructive' && 'text-destructive'
                )} />
                <div>
                  <p className="text-sm font-medium">
                    {schedule.test_definitions?.name_cs || schedule.test_definitions?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(schedule.scheduled_date), 'PPP', { locale: cs })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => completeSchedule.mutate({ scheduleId: schedule.id })}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteSchedule.mutate(schedule.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {!isAdding ? (
          <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Naplánovat test
          </Button>
        ) : (
          <div className="p-3 border rounded-lg space-y-3">
            {!testDefinitionId && (
              <div className="space-y-1">
                <Label className="text-xs">Test</Label>
                <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte test" />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions?.map(def => (
                      <SelectItem key={def.id} value={def.id}>
                        {def.name_cs || def.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-1">
              <Label className="text-xs">Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP', { locale: cs }) : 'Vyberte datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={cs}
                    disabled={(date) => isBefore(date, new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!selectedDate || (!testDefinitionId && !selectedTestId)} className="flex-1">
                Uložit
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Zrušit
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Plánované testy
          </CardTitle>
          {!isAdding && (
            <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Naplánovat
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : filteredSchedules?.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádné plánované testy
          </p>
        ) : (
          <>
            {filteredSchedules?.map(schedule => {
              const status = getScheduleStatus(schedule.scheduled_date);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={schedule.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    status.variant === 'destructive' && 'border-destructive/50 bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn(
                      'w-5 h-5',
                      status.variant === 'destructive' && 'text-destructive'
                    )} />
                    <div>
                      <p className="font-medium">
                        {schedule.test_definitions?.name_cs || schedule.test_definitions?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(schedule.scheduled_date), 'PPPP', { locale: cs })}
                      </p>
                      {schedule.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{schedule.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => completeSchedule.mutate({ scheduleId: schedule.id })}
                      title="Označit jako dokončený"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteSchedule.mutate(schedule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {isAdding && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <Label className="text-base font-semibold">Nový plán</Label>
                
                {!testDefinitionId && (
                  <div className="space-y-2">
                    <Label>Test</Label>
                    <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte test" />
                      </SelectTrigger>
                      <SelectContent>
                        {definitions?.map(def => (
                          <SelectItem key={def.id} value={def.id}>
                            {def.name_cs || def.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP', { locale: cs }) : 'Vyberte datum'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={cs}
                        disabled={(date) => isBefore(date, new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Poznámky (volitelné)</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Např. připomínky pro přípravu..."
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreate}
                    disabled={!selectedDate || (!testDefinitionId && !selectedTestId) || createSchedule.isPending}
                    className="flex-1"
                  >
                    Uložit plán
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>
                    Zrušit
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
