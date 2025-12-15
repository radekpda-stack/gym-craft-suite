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
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PublicFeedbackFormNewProps {
  token: string;
}

interface FormData {
  clientName: string;
  trainingDate: string | null;
  trainingNotes: string | null;
  expiresAt: string;
}

type FormStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'completed';

const PAIN_AREAS = [
  { id: 'knee', label: 'Koleno' },
  { id: 'back', label: 'Záda' },
  { id: 'shoulder', label: 'Rameno' },
  { id: 'hip', label: 'Kyčel' },
  { id: 'ankle', label: 'Kotník' },
  { id: 'wrist', label: 'Zápěstí' },
  { id: 'neck', label: 'Krk' },
  { id: 'other', label: 'Jiné' },
];

const SLIDER_LABELS: Record<string, { low: string; high: string }> = {
  soreness: { low: 'Žádná', high: 'Extrémní' },
  body_feel: { low: 'Špatně', high: 'Výborně' },
  energy: { low: 'Vyčerpaný', high: 'Plný energie' },
  pain: { low: 'Žádná', high: 'Silná' },
  session_fit: { low: 'Vůbec', high: 'Perfektně' },
  difficulty: { low: 'Lehký', high: 'Velmi těžký' },
  fun: { low: 'Vůbec', high: 'Maximálně' },
};

export function PublicFeedbackFormNew({ token }: PublicFeedbackFormNewProps) {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields - all 7 scales default to 5
  const [soreness, setSoreness] = useState(5);
  const [bodyFeel, setBodyFeel] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [pain, setPain] = useState(1);
  const [sessionFit, setSessionFit] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [fun, setFun] = useState(5);
  const [painArea, setPainArea] = useState<string | null>(null);
  const [painAreaOther, setPainAreaOther] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadFormData();
  }, [token]);

  const loadFormData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-feedback-form?token=${token}`,
        {
          headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-public-feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            soreness,
            body_feel: bodyFeel,
            energy,
            pain,
            session_fit: sessionFit,
            difficulty,
            fun,
            pain_area: pain >= 4 ? painArea : undefined,
            pain_area_other: pain >= 4 && painArea === 'other' ? painAreaOther : undefined,
            note: note || undefined,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Chyba při odesílání');
      }

      setStatus('success');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      setErrorMessage(error.message || 'Chyba při odesílání');
      setStatus('error');
    }
  };

  const renderSlider = (
    id: string,
    label: string,
    value: number,
    onChange: (v: number) => void,
    emoji?: string
  ) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">
          {emoji && <span className="mr-2">{emoji}</span>}
          {label}
        </Label>
        <span className="text-2xl font-bold text-primary">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={10}
        step={1}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{SLIDER_LABELS[id]?.low}</span>
        <span>{SLIDER_LABELS[id]?.high}</span>
      </div>
    </div>
  );

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
              Vaše zpětná vazba byla úspěšně odeslána. Trenér ji použije pro optimalizaci vašeho tréninku.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Jak ti je po včerejším tréninku?</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Díky tomu příště nastavím trénink přesněji. (1 minuta)
            </p>
          </CardHeader>
          {formData?.trainingDate && (
            <CardContent className="pt-0">
              <div className="p-3 rounded-lg bg-secondary/50 border text-sm text-center">
                <span className="text-muted-foreground">Trénink:</span>{' '}
                <span className="font-medium">
                  {format(new Date(formData.trainingDate), 'd.M.yyyy HH:mm', { locale: cs })}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 7 Sliders */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderSlider('soreness', 'Svalovka', soreness, setSoreness, '💪')}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {renderSlider('body_feel', 'Celkový pocit v těle', bodyFeel, setBodyFeel, '🧘')}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {renderSlider('energy', 'Energie', energy, setEnergy, '⚡')}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {renderSlider('pain', 'Bolest (ne jen svalovka)', pain, setPain, '🩹')}
            </CardContent>
          </Card>

          {/* Conditional pain area selection */}
          {pain >= 4 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="pt-6">
                <Label className="mb-3 block text-base font-medium">Kde to bolí?</Label>
                <div className="flex flex-wrap gap-2">
                  {PAIN_AREAS.map((area) => (
                    <Badge
                      key={area.id}
                      variant={painArea === area.id ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer text-sm py-2 px-4 transition-all',
                        painArea === area.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-secondary'
                      )}
                      onClick={() => setPainArea(painArea === area.id ? null : area.id)}
                    >
                      {area.label}
                    </Badge>
                  ))}
                </div>
                {painArea === 'other' && (
                  <Textarea
                    placeholder="Upřesni, kde to bolí..."
                    value={painAreaOther}
                    onChange={(e) => setPainAreaOther(e.target.value)}
                    className="mt-3"
                    maxLength={100}
                  />
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {renderSlider('session_fit', 'Jak sedl trénink', sessionFit, setSessionFit, '🎯')}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {renderSlider('difficulty', 'Jak těžký byl trénink', difficulty, setDifficulty, '🏋️')}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {renderSlider('fun', 'Jak moc to bavilo', fun, setFun, '😊')}
            </CardContent>
          </Card>

          {/* Optional note */}
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block text-base font-medium">
                📝 Poznámka (volitelné)
              </Label>
              <Textarea
                placeholder="Cokoliv dalšího..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {note.length}/500
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full mt-6 h-14 text-lg font-semibold"
          size="lg"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Odesílám...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Odeslat zpětnou vazbu
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vaše odpovědi jsou důvěrné a pomohou zlepšit váš trénink.
        </p>
      </div>
    </div>
  );
}
