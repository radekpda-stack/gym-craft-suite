import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PublicFeedbackFormProps {
  token: string;
}

interface FormData {
  clientName: string;
  trainingDate: string | null;
  trainingNotes: string | null;
  customMessage: string | null;
  trainerSignature: string | null;
  expiresAt: string;
}

type FormStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'completed';

const MUSCLE_GROUPS = [
  { id: 'calves', label: 'Lýtka' },
  { id: 'quads', label: 'Přední stehna' },
  { id: 'hamstrings', label: 'Hamstringy' },
  { id: 'glutes', label: 'Hýždě' },
  { id: 'back', label: 'Záda' },
  { id: 'shoulders', label: 'Ramena' },
  { id: 'arms', label: 'Paže' },
  { id: 'abs', label: 'Břicho' },
  { id: 'chest', label: 'Hrudník' },
];

const ENERGY_OPTIONS = [
  { value: 'stable', label: 'Stabilní' },
  { value: 'better_end', label: 'Lepší ke konci' },
  { value: 'low_entire', label: 'Nízká celou dobu' },
  { value: 'good_start_only', label: 'Jen začátek dobrý' },
];

const GOAL_RELEVANCE_OPTIONS = [
  { value: 'yes', label: 'Ano' },
  { value: 'partially', label: 'Částečně' },
  { value: 'no', label: 'Ne' },
];

export function PublicFeedbackForm({ token }: PublicFeedbackFormProps) {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [rpeRating, setRpeRating] = useState(5);
  const [fatigueLevel, setFatigueLevel] = useState(3);
  const [muscleSoreness, setMuscleSoreness] = useState<string[]>([]);
  const [muscleSorenessComment, setMuscleSorenessComment] = useState('');
  const [energyLevel, setEnergyLevel] = useState('stable');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [moodRating, setMoodRating] = useState(3);
  const [techniqueRating, setTechniqueRating] = useState(3);
  const [goalRelevance, setGoalRelevance] = useState('yes');
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadFormData();
  }, [token]);

  const loadFormData = async () => {
    try {
      // Use fetch directly with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-feedback-form?token=${token}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'EXPIRED') {
          setStatus('expired');
        } else if (result.code === 'ALREADY_COMPLETED') {
          setStatus('completed');
        } else {
          setErrorMessage(result.error || 'Neplatný odkaz');
          setStatus('error');
        }
        return;
      }

      setFormData(result.data);
      setStatus('ready');
    } catch (error) {
      console.error('Error loading form:', error);
      setErrorMessage('Chyba při načítání formuláře');
      setStatus('error');
    }
  };

  const handleSubmit = async () => {
    setStatus('submitting');

    try {
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          token,
          rpe_rating: rpeRating,
          fatigue_level: fatigueLevel,
          muscle_soreness: muscleSoreness,
          muscle_soreness_comment: muscleSorenessComment || null,
          energy_level: energyLevel,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          sleep_quality: sleepHours ? sleepQuality : null,
          mood_rating: moodRating,
          technique_rating: techniqueRating,
          goal_relevance: goalRelevance,
          comment: comment || null,
        },
      });

      if (error) throw error;

      setStatus('success');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      setErrorMessage(error.message || 'Chyba při odesílání');
      setStatus('error');
    }
  };

  const toggleMuscleSoreness = (muscleId: string) => {
    setMuscleSoreness(prev =>
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  const getRatingLabel = (value: number, max: number = 5) => {
    if (max === 10) {
      if (value <= 2) return 'Velmi lehké';
      if (value <= 4) return 'Lehké';
      if (value <= 6) return 'Střední';
      if (value <= 8) return 'Těžké';
      return 'Maximální';
    }
    if (value === 1) return 'Špatné';
    if (value === 2) return 'Podprůměrné';
    if (value === 3) return 'Průměrné';
    if (value === 4) return 'Dobré';
    return 'Výborné';
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Načítám formulář...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Chyba</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Platnost vypršela</h2>
            <p className="text-muted-foreground">
              Platnost tohoto odkazu již vypršela. Kontaktujte svého trenéra pro nový odkaz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already completed state
  if (status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Již vyplněno</h2>
            <p className="text-muted-foreground">
              Zpětná vazba pro tento trénink již byla odeslána. Děkujeme!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Děkujeme!</h2>
            <p className="text-muted-foreground">
              Vaše zpětná vazba byla úspěšně odeslána. Trenér ji obdrží a použije pro optimalizaci vašeho tréninku.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Zpětná vazba po tréninku</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Dobrý den, {formData?.clientName}! Vyplňte prosím krátký dotazník.
            </p>
          </CardHeader>
          <CardContent>
            {formData?.trainingDate && (
              <div className="p-3 rounded-lg bg-secondary/50 border text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum tréninku:</span>
                  <span className="font-medium">
                    {format(new Date(formData.trainingDate), 'd.M.yyyy HH:mm', { locale: cs })}
                  </span>
                </div>
              </div>
            )}
            {formData?.customMessage && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm mb-4">
                <p>{formData.customMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* RPE Rating */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Celková náročnost (RPE)</Label>
                  <span className="text-sm font-medium text-primary">{rpeRating}/10</span>
                </div>
                <Slider
                  value={[rpeRating]}
                  onValueChange={([v]) => setRpeRating(v)}
                  min={1}
                  max={10}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lehké</span>
                  <span>Maximální</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fatigue */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Míra únavy po tréninku</Label>
                  <span className="text-sm font-medium text-primary">{fatigueLevel}/5</span>
                </div>
                <Slider
                  value={[fatigueLevel]}
                  onValueChange={([v]) => setFatigueLevel(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Muscle Soreness */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block">Svalová bolest</Label>
              <div className="grid grid-cols-3 gap-2">
                {MUSCLE_GROUPS.map(muscle => (
                  <div
                    key={muscle.id}
                    onClick={() => toggleMuscleSoreness(muscle.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                      muscleSoreness.includes(muscle.id)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background hover:bg-secondary/50"
                    )}
                  >
                    <Checkbox
                      checked={muscleSoreness.includes(muscle.id)}
                      className="pointer-events-none"
                    />
                    <span>{muscle.label}</span>
                  </div>
                ))}
              </div>
              {muscleSoreness.length > 0 && (
                <Input
                  placeholder="Komentář k bolesti (volitelné)..."
                  value={muscleSorenessComment}
                  onChange={(e) => setMuscleSorenessComment(e.target.value)}
                  className="mt-3"
                />
              )}
            </CardContent>
          </Card>

          {/* Energy Level */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block">Energie během tréninku</Label>
              <RadioGroup value={energyLevel} onValueChange={setEnergyLevel}>
                <div className="grid grid-cols-2 gap-2">
                  {ENERGY_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => setEnergyLevel(option.value)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        energyLevel === option.value
                          ? "bg-primary/10 border-primary"
                          : "bg-background hover:bg-secondary/50"
                      )}
                    >
                      <RadioGroupItem value={option.value} className="pointer-events-none" />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Sleep */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block">Spánek před tréninkem</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Počet hodin</Label>
                  <Input
                    type="number"
                    placeholder="např. 7.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    min={0}
                    max={24}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Kvalita</Label>
                    <span className="text-xs font-medium text-primary">{sleepQuality}/5</span>
                  </div>
                  <Slider
                    value={[sleepQuality]}
                    onValueChange={([v]) => setSleepQuality(v)}
                    min={1}
                    max={5}
                    step={1}
                    className="mt-3"
                    disabled={!sleepHours}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Nálada a motivace</Label>
                  <span className="text-sm font-medium text-primary">{moodRating}/5</span>
                </div>
                <Slider
                  value={[moodRating]}
                  onValueChange={([v]) => setMoodRating(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Technique */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Sebehodnocení techniky</Label>
                  <span className="text-sm font-medium text-primary">{techniqueRating}/5</span>
                </div>
                <Slider
                  value={[techniqueRating]}
                  onValueChange={([v]) => setTechniqueRating(v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Goal Relevance */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block">Byl trénink relevantní vůči cíli?</Label>
              <RadioGroup value={goalRelevance} onValueChange={setGoalRelevance}>
                <div className="flex gap-2">
                  {GOAL_RELEVANCE_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => setGoalRelevance(option.value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        goalRelevance === option.value
                          ? "bg-primary/10 border-primary"
                          : "bg-background hover:bg-secondary/50"
                      )}
                    >
                      <RadioGroupItem value={option.value} className="pointer-events-none" />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Comment */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-2 block">Komentář (volitelné)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                placeholder="Krátká poznámka..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/200</p>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="w-full"
            size="lg"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Odesílám...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Odeslat zpětnou vazbu
              </>
            )}
          </Button>

          {formData?.trainerSignature && (
            <p className="text-center text-sm text-muted-foreground italic">
              {formData.trainerSignature}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
