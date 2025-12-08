import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ClientTrainingPhase,
  TRAINING_PHASES,
  useClientTrainingPhases,
} from '@/hooks/useClientTrainingPhases';
import { cn } from '@/lib/utils';

interface PeriodizationTimelineProps {
  clientId: string;
  phases: ClientTrainingPhase[];
  currentPhase?: ClientTrainingPhase;
}

export function PeriodizationTimeline({
  clientId,
  phases,
  currentPhase,
}: PeriodizationTimelineProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ClientTrainingPhase | null>(null);
  const [formData, setFormData] = useState({
    phase_name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: '',
  });

  const { createPhase, updatePhase, deletePhase, getPhaseDurationWeeks } =
    useClientTrainingPhases(clientId);

  const handleOpenDialog = (phase?: ClientTrainingPhase) => {
    if (phase) {
      setEditingPhase(phase);
      setFormData({
        phase_name: phase.phase_name,
        start_date: phase.start_date,
        end_date: phase.end_date || '',
        notes: phase.notes || '',
      });
    } else {
      setEditingPhase(null);
      setFormData({
        phase_name: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        notes: '',
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.phase_name || !formData.start_date) return;

    const data = {
      client_id: clientId,
      phase_name: formData.phase_name,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      notes: formData.notes || null,
    };

    if (editingPhase) {
      await updatePhase.mutateAsync({ id: editingPhase.id, ...data });
    } else {
      await createPhase.mutateAsync(data);
    }

    setShowDialog(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Opravdu smazat tuto fázi?')) {
      await deletePhase.mutateAsync(id);
    }
  };

  const getPhaseConfig = (phaseName: string) => {
    return TRAINING_PHASES.find((p) => p.value === phaseName) || {
      label: phaseName,
      color: 'bg-muted',
    };
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="glass">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Periodizace
                  {currentPhase && (
                    <Badge className={cn(getPhaseConfig(currentPhase.phase_name).color, 'ml-2')}>
                      {getPhaseConfig(currentPhase.phase_name).label}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nová fáze
                  </Button>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {phases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Zatím žádné tréninkové fáze</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => handleOpenDialog()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Přidat první fázi
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {phases.map((phase, index) => {
                      const config = getPhaseConfig(phase.phase_name);
                      const weeks = getPhaseDurationWeeks(phase);
                      const isCurrent = !phase.end_date || new Date(phase.end_date) >= new Date();

                      return (
                        <div key={phase.id} className="relative pl-8">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              'absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center',
                              config.color
                            )}
                          >
                            {isCurrent && (
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            )}
                          </div>

                          <div
                            className={cn(
                              'p-4 rounded-xl transition-all',
                              isCurrent
                                ? 'bg-primary/10 border border-primary/20'
                                : 'bg-secondary/30'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge className={cn(config.color, 'text-white')}>
                                    {config.label}
                                  </Badge>
                                  {isCurrent && (
                                    <Badge variant="outline" className="text-xs">
                                      Aktuální
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {format(new Date(phase.start_date), 'd. MMMM yyyy', {
                                    locale: cs,
                                  })}
                                  {phase.end_date && (
                                    <>
                                      {' → '}
                                      {format(new Date(phase.end_date), 'd. MMMM yyyy', {
                                        locale: cs,
                                      })}
                                    </>
                                  )}
                                  <span className="ml-2">({weeks} týdnů)</span>
                                </p>
                                {phase.notes && (
                                  <p className="text-sm mt-2">{phase.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenDialog(phase)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(phase.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dialog for adding/editing phase */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? 'Upravit fázi' : 'Nová tréninková fáze'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fáze</Label>
              <Select
                value={formData.phase_name}
                onValueChange={(v) => setFormData({ ...formData, phase_name: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte fázi" />
                </SelectTrigger>
                <SelectContent>
                  {TRAINING_PHASES.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded', phase.color)} />
                        {phase.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Začátek</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Konec (volitelné)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Poznámky</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Poznámky k fázi..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.phase_name || !formData.start_date}
            >
              {createPhase.isPending || updatePhase.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingPhase ? 'Uložit' : 'Vytvořit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
