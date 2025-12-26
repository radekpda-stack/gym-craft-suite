import { useState } from 'react';
import { format } from 'date-fns';
import { Scale, Percent, Calendar, Plus, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientAddMeasurement } from '@/hooks/useClientAddMeasurement';
import { toast } from 'sonner';

interface AddMeasurementDialogProps {
  defaultType?: 'weight' | 'bodyFat';
  trigger?: React.ReactNode;
}

export function AddMeasurementDialog({ 
  defaultType = 'weight',
  trigger 
}: AddMeasurementDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'weight' | 'bodyFat'>(defaultType);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const addMeasurement = useClientAddMeasurement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Zadej platnou hodnotu');
      return;
    }

    try {
      await addMeasurement.mutateAsync({
        date,
        weight: type === 'weight' ? numValue : undefined,
        body_fat_percentage: type === 'bodyFat' ? numValue : undefined,
        notes: notes || undefined,
      });

      toast.success(type === 'weight' ? 'Váha přidána' : 'Tělesný tuk přidán');
      setOpen(false);
      setValue('');
      setNotes('');
    } catch (error) {
      toast.error('Nepodařilo se přidat měření');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Přidat měření
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat měření</DialogTitle>
          <DialogDescription>
            Zaznamenej svůj pokrok pravidelně pro lepší přehled.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as 'weight' | 'bodyFat')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weight" className="gap-1.5">
                <Scale className="w-4 h-4" />
                Váha
              </TabsTrigger>
              <TabsTrigger value="bodyFat" className="gap-1.5">
                <Percent className="w-4 h-4" />
                Tělesný tuk
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weight" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="weight-date">Datum</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="weight-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight-value">Váha (kg)</Label>
                <Input
                  id="weight-value"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="např. 75.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="bodyFat" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="bf-date">Datum</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="bf-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bf-value">Tělesný tuk (%)</Label>
                <Input
                  id="bf-value"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="např. 18.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="notes">Poznámka (volitelné)</Label>
            <Textarea
              id="notes"
              placeholder="Např. po tréninku, ráno nalačno..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Doporučení: Měř se 1× týdně ráno nalačno pro konzistentní výsledky.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={addMeasurement.isPending}>
              {addMeasurement.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
