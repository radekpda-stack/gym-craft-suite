import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrainingPlans, GOAL_OPTIONS, PHASE_OPTIONS } from '@/hooks/useTrainingPlans';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}

export function CreatePlanDialog({ open, onOpenChange, preselectedClientId }: CreatePlanDialogProps) {
  const navigate = useNavigate();
  const { createPlan } = useTrainingPlans();
  const { data: clients = [] } = useClients();

  const [form, setForm] = useState({
    name: '',
    client_id: preselectedClientId || '',
    primary_goal: 'strength',
    secondary_goal: '',
    period_start: format(new Date(), 'yyyy-MM-dd'),
    period_end: '',
    phase: 'base',
    days_per_week: 3,
    equipment: [] as string[],
    notes: '',
    is_active: true,
  });

  const handleSubmit = async () => {
    if (!form.name || !form.client_id) return;

    const result = await createPlan.mutateAsync({
      ...form,
      period_end: form.period_end || null,
      secondary_goal: form.secondary_goal || null,
      notes: form.notes || null,
    });

    onOpenChange(false);
    navigate(`/training-plans/${result.id}`);
  };

  const activeClients = clients.filter((c) => !c.is_archived);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nový tréninkový plán</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Název plánu *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="např. Silový blok Q1 2024"
            />
          </div>

          <div>
            <Label>Klient *</Label>
            <Select
              value={form.client_id}
              onValueChange={(v) => setForm((p) => ({ ...p, client_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte klienta" />
              </SelectTrigger>
              <SelectContent>
                {activeClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primární cíl</Label>
              <Select
                value={form.primary_goal}
                onValueChange={(v) => setForm((p) => ({ ...p, primary_goal: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fáze</Label>
              <Select
                value={form.phase}
                onValueChange={(v) => setForm((p) => ({ ...p, phase: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Začátek</Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
              />
            </div>

            <div>
              <Label>Konec (volitelné)</Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Tréninky za týden</Label>
            <Select
              value={form.days_per_week.toString()}
              onValueChange={(v) => setForm((p) => ({ ...p, days_per_week: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}× týdně
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Poznámky</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Volitelné poznámky k plánu..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.client_id || createPlan.isPending}>
            Vytvořit plán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
