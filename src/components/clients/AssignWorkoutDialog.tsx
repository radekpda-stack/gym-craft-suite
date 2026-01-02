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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  Dumbbell, 
  Search,
  LayoutTemplate,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTrainingTemplates, TrainingTemplate } from '@/hooks/useTrainingTemplates';
import { useAssignWorkoutToClient } from '@/hooks/useAssignWorkout';
import { motion } from 'framer-motion';

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

type Step = 'template' | 'details';

export function AssignWorkoutDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName 
}: AssignWorkoutDialogProps) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TrainingTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledFor, setScheduledFor] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"));
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');

  const { data: templates, isLoading: loadingTemplates } = useTrainingTemplates();
  const assignWorkout = useAssignWorkoutToClient();

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery.trim()) return templates;
    
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.category?.toLowerCase().includes(query) ||
      t.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [templates, searchQuery]);

  const handleSelectTemplate = (template: TrainingTemplate) => {
    setSelectedTemplate(template);
    if (template.estimated_duration) {
      setDurationMinutes(template.estimated_duration.toString());
    }
    setStep('details');
  };

  const handleBack = () => {
    setStep('template');
  };

  const handleAssign = async () => {
    if (!selectedTemplate) return;

    await assignWorkout.mutateAsync({
      client_id: clientId,
      template_id: selectedTemplate.id,
      scheduled_for: scheduledFor,
      workout_type: selectedTemplate.category || 'strength',
      duration_minutes: parseInt(durationMinutes) || undefined,
      notes: notes || undefined,
    });

    // Reset and close
    setStep('template');
    setSelectedTemplate(null);
    setSearchQuery('');
    setScheduledFor(format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00"));
    setDurationMinutes('60');
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep('template');
    setSelectedTemplate(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            {step === 'template' ? 'Vybrat šablonu' : 'Naplánovat trénink'}
          </DialogTitle>
          <DialogDescription>
            {step === 'template' 
              ? `Vyberte šablonu tréninku pro klienta ${clientName}`
              : `Nastavte detaily tréninku pro ${clientName}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'template' ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat šablony..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Templates List */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loadingTemplates ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Žádné šablony nenalezeny</p>
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
                  {filteredTemplates.map((template, index) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectTemplate(template)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        "flex items-center justify-between gap-3"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{template.name}</div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {template.category && (
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                          )}
                          {template.estimated_duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {template.estimated_duration} min
                            </span>
                          )}
                          {template.exercises && template.exercises.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Dumbbell className="w-3 h-3" />
                              {template.exercises.length} cviků
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {template.description}
                          </p>
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
            {/* Selected template summary */}
            {selectedTemplate && (
              <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{selectedTemplate.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedTemplate.exercises?.length || 0} cviků
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
              {selectedTemplate?.exercises && selectedTemplate.exercises.length > 0 && (
                <div className="space-y-2">
                  <Label>Cviky v šabloně</Label>
                  <div className="border rounded-lg divide-y max-h-[150px] overflow-y-auto">
                    {selectedTemplate.exercises.map((ex, idx) => (
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
