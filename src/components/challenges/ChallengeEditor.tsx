import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Challenge, useCreateChallenge, useUpdateChallenge } from '@/hooks/useChallenges';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChallengeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}

export function ChallengeEditor({ open, onOpenChange, challenge }: ChallengeEditorProps) {
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [vodUrl, setVodUrl] = useState('');
  const [startAt, setStartAt] = useState<Date | undefined>(new Date());
  const [endAt, setEndAt] = useState<Date | undefined>(new Date());
  const [scoringType, setScoringType] = useState<string>('value_higher_better');
  const [primaryMetric, setPrimaryMetric] = useState<string>('reps');
  const [unitLabel, setUnitLabel] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [requiresVideo, setRequiresVideo] = useState(false);

  useEffect(() => {
    if (challenge) {
      setTitle(challenge.title);
      setDescription(challenge.description || '');
      setInstructions(challenge.instructions || '');
      setVodUrl(challenge.vod_url || '');
      setStartAt(new Date(challenge.start_at));
      setEndAt(new Date(challenge.end_at));
      setScoringType(challenge.scoring_type);
      setPrimaryMetric(challenge.primary_metric);
      setUnitLabel(challenge.unit_label || '');
      setAllowMultiple(challenge.allow_multiple_attempts);
      setRequiresVideo(challenge.requires_video);
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setInstructions('');
      setVodUrl('');
      setStartAt(new Date());
      setEndAt(new Date());
      setScoringType('value_higher_better');
      setPrimaryMetric('reps');
      setUnitLabel('');
      setAllowMultiple(true);
      setRequiresVideo(false);
    }
  }, [challenge, open]);

  const handleSave = () => {
    const data = {
      title,
      description: description || null,
      instructions: instructions || null,
      vod_url: vodUrl || null,
      start_at: startAt?.toISOString(),
      end_at: endAt?.toISOString(),
      scoring_type: scoringType as Challenge['scoring_type'],
      primary_metric: primaryMetric as Challenge['primary_metric'],
      unit_label: unitLabel || null,
      allow_multiple_attempts: allowMultiple,
      requires_video: requiresVideo,
    };

    if (challenge) {
      updateChallenge.mutate({ id: challenge.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createChallenge.mutate({ ...data, status: 'draft' }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isLoading = createChallenge.isPending || updateChallenge.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{challenge ? 'Upravit výzvu' : 'Nová výzva'}</DialogTitle>
          <DialogDescription>
            Vytvořte výzvu pro své klienty v klientské zóně
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Název výzvy *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Únorová výzva - 100 shybů"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stručný popis výzvy..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instrukce (pravidla)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Jak správně provést výzvu, co se počítá..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vodUrl">Video URL (VOD)</Label>
            <Input
              id="vodUrl"
              value={vodUrl}
              onChange={(e) => setVodUrl(e.target.value)}
              placeholder="https://youtube.com/... nebo odkaz na video"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Začátek</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startAt && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startAt ? format(startAt, 'PPP', { locale: cs }) : 'Vyberte datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startAt}
                    onSelect={setStartAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Konec</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endAt && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endAt ? format(endAt, 'PPP', { locale: cs }) : 'Vyberte datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endAt}
                    onSelect={setEndAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hlavní metrika</Label>
              <Select value={primaryMetric} onValueChange={setPrimaryMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_seconds">Čas (sekundy)</SelectItem>
                  <SelectItem value="reps">Opakování</SelectItem>
                  <SelectItem value="rounds">Kola</SelectItem>
                  <SelectItem value="weight_kg">Váha (kg)</SelectItem>
                  <SelectItem value="distance_m">Vzdálenost (m)</SelectItem>
                  <SelectItem value="calories">Kalorie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hodnocení</Label>
              <Select value={scoringType} onValueChange={setScoringType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value_higher_better">Vyšší = lepší</SelectItem>
                  <SelectItem value="time_lower_better">Nižší = lepší (čas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitLabel">Jednotka (volitelné)</Label>
            <Input
              id="unitLabel"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="např. kg, m, s"
              className="w-32"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Více pokusů</Label>
                <p className="text-sm text-muted-foreground">Klient může odeslat více výsledků</p>
              </div>
              <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Vyžadovat video</Label>
                <p className="text-sm text-muted-foreground">Klient musí přiložit video důkaz</p>
              </div>
              <Switch checked={requiresVideo} onCheckedChange={setRequiresVideo} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={!title || isLoading}>
            {isLoading ? 'Ukládám...' : challenge ? 'Uložit' : 'Vytvořit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
