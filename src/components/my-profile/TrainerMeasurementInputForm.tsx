import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Scale, Check } from 'lucide-react';

interface TrainerMeasurementInputFormProps {
  clientId: string;
}

export function TrainerMeasurementInputForm({ clientId }: TrainerMeasurementInputFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const createMeasurement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('measurements')
        .insert({
          user_id: user.id,
          client_id: clientId,
          date,
          weight: weight ? parseFloat(weight) : null,
          body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      queryClient.invalidateQueries({ queryKey: ['client-weight-progress', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-bodyfat-progress', clientId] });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      // Reset form but keep date
      setWeight('');
      setBodyFat('');
      setNotes('');
      
      toast({
        title: 'Měření uloženo',
        description: 'Tělesné měření bylo zaznamenáno.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodařilo se uložit měření.',
        variant: 'destructive',
      });
    },
  });

  const isValid = weight || bodyFat;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="w-4 h-4" />
          Tělesná měření
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date */}
        <div className="space-y-2">
          <Label>Datum</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Weight and Body Fat */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Váha (kg)</Label>
            <Input
              type="number"
              placeholder="85.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="30"
              max="300"
              step="0.1"
            />
          </div>
          <div className="space-y-2">
            <Label>Tělesný tuk (%)</Label>
            <Input
              type="number"
              placeholder="15.0"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              min="3"
              max="60"
              step="0.1"
            />
          </div>
        </div>

        {/* Preview */}
        {(weight || bodyFat) && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Náhled:</p>
            <div className="flex gap-4">
              {weight && (
                <span className="text-lg font-semibold">{weight} kg</span>
              )}
              {bodyFat && (
                <span className="text-lg font-semibold">{bodyFat}% tuku</span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Poznámky (volitelné)</Label>
          <Textarea
            placeholder="Poznámky k měření..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={() => createMeasurement.mutate()}
          disabled={!isValid || createMeasurement.isPending}
          className="w-full"
        >
          {createMeasurement.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : showSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Uloženo!
            </>
          ) : (
            'Uložit měření'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
