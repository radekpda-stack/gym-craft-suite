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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Challenge, useCreateChallenge, useUpdateChallenge } from '@/hooks/useChallenges';
import { useExercises } from '@/hooks/useExercises';
import { TrainingTemplate } from '@/hooks/useTrainingTemplates';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown, Dumbbell, Users, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TemplateSelectorForChallenge } from './TemplateSelectorForChallenge';

interface ChallengeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}

export function ChallengeEditor({ open, onOpenChange, challenge }: ChallengeEditorProps) {
  const createChallenge = useCreateChallenge();
  const updateChallenge = useUpdateChallenge();
  const { exercises = [] } = useExercises();

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
  const [rankingMode, setRankingMode] = useState<string>('top3');
  const [tieBreaker, setTieBreaker] = useState<string>('earliest_submission');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [templateSectionOpen, setTemplateSectionOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Team challenge settings
  const [isTeamChallenge, setIsTeamChallenge] = useState(false);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [teamScoringMode, setTeamScoringMode] = useState<string>('sum');

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
      setRankingMode(challenge.ranking_mode || 'top3');
      setTieBreaker(challenge.tie_breaker || 'earliest_submission');
      setExerciseId((challenge as any).exercise_id || null);
      setSelectedTemplateId(challenge.training_template_id || null);
      // Team settings
      setIsTeamChallenge((challenge as any).is_team_challenge || false);
      setMinTeamSize((challenge as any).min_team_size || 2);
      setMaxTeamSize((challenge as any).max_team_size || 4);
      setTeamScoringMode((challenge as any).team_scoring_mode || 'sum');
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
      setRankingMode('top3');
      setTieBreaker('earliest_submission');
      setExerciseId(null);
      setSelectedTemplateId(null);
      setIsTeamChallenge(false);
      setMinTeamSize(2);
      setMaxTeamSize(4);
      setTeamScoringMode('sum');
    }
  }, [challenge, open]);

  const handleTemplateSelect = (template: TrainingTemplate | null) => {
    if (template) {
      setSelectedTemplateId(template.id);
      // Auto-fill form from template
      if (!title) setTitle(template.name);
      if (!description) setDescription(template.description || '');
      
      // Set metrics based on workout format
      if (template.workout_format === 'amrap') {
        setPrimaryMetric('rounds');
        setScoringType('value_higher_better');
      } else if (template.workout_format === 'for_time' || template.workout_format === 'circuit') {
        setPrimaryMetric('time_seconds');
        setScoringType('time_lower_better');
      } else if (template.workout_format === 'emom' || template.workout_format === 'tabata') {
        setPrimaryMetric('reps');
        setScoringType('value_higher_better');
      }
      
      // Generate instructions from exercises
      const exercises = template.exercises || [];
      if (exercises.length > 0 && !instructions) {
        const exerciseList = exercises.map((ex: any, idx: number) => {
          let line = `${idx + 1}. `;
          if (ex.reps) line += `${ex.reps}x `;
          if (ex.time_seconds) line += `${ex.time_seconds}s `;
          if (ex.distance_meters) line += `${ex.distance_meters}m `;
          line += ex.exercise_name;
          if (ex.weight_kg) line += ` (${ex.weight_kg}kg)`;
          return line;
        }).join('\n');
        
        let instructionText = '';
        if (template.workout_format === 'amrap' && template.time_cap_seconds) {
          instructionText = `AMRAP ${Math.floor(template.time_cap_seconds / 60)} min:\n${exerciseList}`;
        } else if (template.workout_format === 'for_time' && template.rounds) {
          instructionText = `${template.rounds} kol na čas:\n${exerciseList}`;
        } else {
          instructionText = exerciseList;
        }
        setInstructions(instructionText);
      }
    } else {
      setSelectedTemplateId(null);
    }
  };

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
      ranking_mode: rankingMode as Challenge['ranking_mode'],
      tie_breaker: tieBreaker as Challenge['tie_breaker'],
      exercise_id: exerciseId,
      training_template_id: selectedTemplateId,
      is_team_challenge: isTeamChallenge,
      min_team_size: minTeamSize,
      max_team_size: maxTeamSize,
      team_scoring_mode: teamScoringMode,
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
          {/* Template Selector Section */}
          <Collapsible open={templateSectionOpen} onOpenChange={setTemplateSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {selectedTemplateId ? 'Propojena s tréninkem' : 'Propojit s tréninkem (volitelné)'}
                </span>
                {templateSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <TemplateSelectorForChallenge
                selectedTemplateId={selectedTemplateId}
                onSelect={handleTemplateSelect}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label htmlFor="title">Název výzvy *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Únorová výzva - 100 shybů"
            />
          </div>

          {/* Exercise Linking */}
          <div className="space-y-2">
            <Label>Propojit s cvikem (volitelné)</Label>
            <Popover open={exerciseOpen} onOpenChange={setExerciseOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={exerciseOpen}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Dumbbell className="h-4 w-4 shrink-0" />
                    {exerciseId
                      ? exercises.find((e) => e.id === exerciseId)?.name || 'Neznámý cvik'
                      : 'Vyberte cvik...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Hledat cvik..." />
                  <CommandList>
                    <CommandEmpty>Cvik nenalezen</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setExerciseId(null);
                          setExerciseOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !exerciseId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Bez cviku
                      </CommandItem>
                      {exercises.slice(0, 50).map((exercise) => (
                        <CommandItem
                          key={exercise.id}
                          value={exercise.name}
                          onSelect={() => {
                            setExerciseId(exercise.id);
                            setExerciseOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              exerciseId === exercise.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {exercise.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Propojení s cvikem umožní sledovat osobní rekordy
            </p>
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

          {/* Ranking Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ocenění vítězů</Label>
              <Select value={rankingMode} onValueChange={setRankingMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top1">Pouze 1. místo</SelectItem>
                  <SelectItem value="top3">Top 3 (1.-3. místo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Při shodném výsledku</Label>
              <Select value={tieBreaker} onValueChange={setTieBreaker}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earliest_submission">Dřívější odeslání vyhrává</SelectItem>
                  <SelectItem value="coach_confirmed_first">Priorita pro coach-confirmed</SelectItem>
                  <SelectItem value="same_rank">Sdílené umístění</SelectItem>
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

            {/* Team Challenge Settings */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Týmová výzva</Label>
                    <p className="text-sm text-muted-foreground">Klienti soutěží v týmech</p>
                  </div>
                </div>
                <Switch checked={isTeamChallenge} onCheckedChange={setIsTeamChallenge} />
              </div>

              {isTeamChallenge && (
                <div className="space-y-4 pl-7">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min. členů v týmu</Label>
                      <Select 
                        value={minTeamSize.toString()} 
                        onValueChange={(v) => setMinTeamSize(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Max. členů v týmu</Label>
                      <Select 
                        value={maxTeamSize.toString()} 
                        onValueChange={(v) => setMaxTeamSize(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 8, 10].filter(n => n >= minTeamSize).map(n => (
                            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Způsob počítání skóre</Label>
                    <Select value={teamScoringMode} onValueChange={setTeamScoringMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Součet všech skóre</SelectItem>
                        <SelectItem value="average">Průměr skóre členů</SelectItem>
                        <SelectItem value="best">Nejlepší skóre každého člena</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {teamScoringMode === 'sum' && 'Všechna schválená skóre členů se sčítají'}
                      {teamScoringMode === 'average' && 'Průměr ze všech schválených skóre'}
                      {teamScoringMode === 'best' && 'Součet nejlepších skóre každého člena'}
                    </p>
                  </div>
                </div>
              )}
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
