import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Measurement, useUpdateMeasurement, useDeleteMeasurement } from '@/hooks/useMeasurements';
import { Client } from '@/hooks/useClients';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EditMeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: Measurement | null;
  client?: Client | null;
}

export function EditMeasurementSheet({
  open,
  onOpenChange,
  measurement,
  client,
}: EditMeasurementSheetProps) {
  const updateMeasurement = useUpdateMeasurement();
  const deleteMeasurement = useDeleteMeasurement();
  
  const [formData, setFormData] = useState({
    date: '',
    weight: '',
    body_fat_percentage: '',
    muscle_mass: '',
    basal_metabolism: '',
    visceral_fat: '',
    chest: '',
    waist: '',
    hips: '',
    bicep_left: '',
    bicep_right: '',
    thigh_left: '',
    thigh_right: '',
    calf_left: '',
    calf_right: '',
    notes: '',
  });

  useEffect(() => {
    if (measurement) {
      setFormData({
        date: measurement.date || '',
        weight: measurement.weight?.toString() || '',
        body_fat_percentage: measurement.body_fat_percentage?.toString() || '',
        muscle_mass: measurement.muscle_mass?.toString() || '',
        basal_metabolism: measurement.basal_metabolism?.toString() || '',
        visceral_fat: measurement.visceral_fat?.toString() || '',
        chest: measurement.chest?.toString() || '',
        waist: measurement.waist?.toString() || '',
        hips: measurement.hips?.toString() || '',
        bicep_left: measurement.bicep_left?.toString() || '',
        bicep_right: measurement.bicep_right?.toString() || '',
        thigh_left: measurement.thigh_left?.toString() || '',
        thigh_right: measurement.thigh_right?.toString() || '',
        calf_left: measurement.calf_left?.toString() || '',
        calf_right: measurement.calf_right?.toString() || '',
        notes: measurement.notes || '',
      });
    }
  }, [measurement]);

  const handleSave = async () => {
    if (!measurement) return;
    
    await updateMeasurement.mutateAsync({
      id: measurement.id,
      client_id: measurement.client_id,
      date: formData.date,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : undefined,
      muscle_mass: formData.muscle_mass ? parseFloat(formData.muscle_mass) : undefined,
      basal_metabolism: formData.basal_metabolism ? parseFloat(formData.basal_metabolism) : undefined,
      visceral_fat: formData.visceral_fat ? parseFloat(formData.visceral_fat) : undefined,
      chest: formData.chest ? parseFloat(formData.chest) : undefined,
      waist: formData.waist ? parseFloat(formData.waist) : undefined,
      hips: formData.hips ? parseFloat(formData.hips) : undefined,
      bicep_left: formData.bicep_left ? parseFloat(formData.bicep_left) : undefined,
      bicep_right: formData.bicep_right ? parseFloat(formData.bicep_right) : undefined,
      thigh_left: formData.thigh_left ? parseFloat(formData.thigh_left) : undefined,
      thigh_right: formData.thigh_right ? parseFloat(formData.thigh_right) : undefined,
      calf_left: formData.calf_left ? parseFloat(formData.calf_left) : undefined,
      calf_right: formData.calf_right ? parseFloat(formData.calf_right) : undefined,
      notes: formData.notes,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!measurement) return;
    await deleteMeasurement.mutateAsync(measurement.id);
    onOpenChange(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!measurement) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Upravit měření
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {client?.name} • {format(new Date(measurement.date), 'd. MMMM yyyy', { locale: cs })}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>

          {/* Body composition */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Tělesné složení</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Váha (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tuk (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.body_fat_percentage}
                  onChange={(e) => handleChange('body_fat_percentage', e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Svaly (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.muscle_mass}
                  onChange={(e) => handleChange('muscle_mass', e.target.value)}
                  placeholder="0.0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bazál. metabol.</Label>
                <Input
                  type="number"
                  value={formData.basal_metabolism}
                  onChange={(e) => handleChange('basal_metabolism', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Viscerální tuk</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.visceral_fat}
                  onChange={(e) => handleChange('visceral_fat', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Circumferences */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Obvody (cm)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Hrudník</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.chest}
                  onChange={(e) => handleChange('chest', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pas</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.waist}
                  onChange={(e) => handleChange('waist', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Boky</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.hips}
                  onChange={(e) => handleChange('hips', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Biceps L</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.bicep_left}
                  onChange={(e) => handleChange('bicep_left', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Biceps P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.bicep_right}
                  onChange={(e) => handleChange('bicep_right', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stehno L</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.thigh_left}
                  onChange={(e) => handleChange('thigh_left', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stehno P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.thigh_right}
                  onChange={(e) => handleChange('thigh_right', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lýtko L</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.calf_left}
                  onChange={(e) => handleChange('calf_left', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lýtko P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.calf_right}
                  onChange={(e) => handleChange('calf_right', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Poznámky</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Poznámky k měření..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Smazat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat měření?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Měření bude trvale odstraněno.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button 
              onClick={handleSave} 
              disabled={updateMeasurement.isPending}
              className="flex-1 gap-2"
            >
              {updateMeasurement.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Uložit změny
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
