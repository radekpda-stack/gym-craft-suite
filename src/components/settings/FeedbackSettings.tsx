import { useState, useEffect } from 'react';
import { Loader2, Settings2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useFeedbackSettings, FeedbackQuestionsConfig } from '@/hooks/useFeedbackRequests';
import { FeedbackQuestionsEditor } from './FeedbackQuestionsEditor';

const DEFAULT_QUESTIONS_CONFIG: FeedbackQuestionsConfig = {
  questions: [
    { id: 'soreness', type: 'slider', label: 'Svalovka', emoji: '💪', minLabel: 'Žádná', maxLabel: 'Extrémní', min: 1, max: 10, defaultValue: 5, enabled: true, order: 0 },
    { id: 'body_feel', type: 'slider', label: 'Celkový pocit v těle', emoji: '🧘', minLabel: 'Špatně', maxLabel: 'Výborně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 1 },
    { id: 'energy', type: 'slider', label: 'Energie', emoji: '⚡', minLabel: 'Vyčerpaný', maxLabel: 'Plný energie', min: 1, max: 10, defaultValue: 5, enabled: true, order: 2 },
    { id: 'pain', type: 'slider', label: 'Bolest (ne jen svalovka)', emoji: '🩹', minLabel: 'Žádná', maxLabel: 'Silná', min: 1, max: 10, defaultValue: 1, enabled: true, order: 3, showPainAreas: true, painAreaThreshold: 4 },
    { id: 'session_fit', type: 'slider', label: 'Jak sedl trénink', emoji: '🎯', minLabel: 'Vůbec', maxLabel: 'Perfektně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 4 },
    { id: 'difficulty', type: 'slider', label: 'Jak těžký byl trénink', emoji: '🏋️', minLabel: 'Lehký', maxLabel: 'Velmi těžký', min: 1, max: 10, defaultValue: 5, enabled: true, order: 5 },
    { id: 'fun', type: 'slider', label: 'Jak moc to bavilo', emoji: '😊', minLabel: 'Vůbec', maxLabel: 'Maximálně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 6 },
  ],
  painAreas: [
    { id: 'knee', label: 'Koleno', enabled: true },
    { id: 'back', label: 'Záda', enabled: true },
    { id: 'shoulder', label: 'Rameno', enabled: true },
    { id: 'hip', label: 'Kyčel', enabled: true },
    { id: 'ankle', label: 'Kotník', enabled: true },
    { id: 'wrist', label: 'Zápěstí', enabled: true },
    { id: 'neck', label: 'Krk', enabled: true },
    { id: 'other', label: 'Jiné', enabled: true },
  ],
  noteEnabled: true,
  noteMaxLength: 200,
};

export function FeedbackSettings() {
  const { settings, isLoading, upsertSettings } = useFeedbackSettings();
  const isUpdating = upsertSettings.isPending;
  const [autoSend, setAutoSend] = useState(false);
  const [expirationHours, setExpirationHours] = useState(72);
  const [trainerSignature, setTrainerSignature] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('cs');
  const [questionsConfig, setQuestionsConfig] = useState<FeedbackQuestionsConfig>(DEFAULT_QUESTIONS_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Master Prompt: Red flag threshold settings
  const [painThreshold, setPainThreshold] = useState(7);
  const [bodyFeelThreshold, setBodyFeelThreshold] = useState(3);

  useEffect(() => {
    if (settings) {
      setAutoSend(settings.auto_send_after_training ?? false);
      setExpirationHours(settings.expiration_hours ?? 72);
      setTrainerSignature(settings.trainer_signature ?? '');
      setDefaultLanguage(settings.default_language ?? 'cs');
      setQuestionsConfig(settings.feedback_questions ?? DEFAULT_QUESTIONS_CONFIG);
      // Load threshold settings
      setPainThreshold((settings as any).red_flag_pain_threshold ?? 7);
      setBodyFeelThreshold((settings as any).red_flag_body_feel_threshold ?? 3);
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = () => {
    setHasChanges(true);
  };

  const handleSave = () => {
    upsertSettings.mutate({
      auto_send_after_training: autoSend,
      expiration_hours: expirationHours,
      trainer_signature: trainerSignature,
      default_language: defaultLanguage,
      feedback_questions: questionsConfig,
      // Include threshold settings
      red_flag_pain_threshold: painThreshold,
      red_flag_body_feel_threshold: bodyFeelThreshold,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* === ZÁKLADNÍ NASTAVENÍ === */}
      <div className="space-y-4">
        {/* Auto-send toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground">Automatické odesílání</Label>
            <p className="text-sm text-muted-foreground">
              Automaticky odeslat žádost o feedback po dokončení tréninku
            </p>
          </div>
          <Switch 
            checked={autoSend} 
            onCheckedChange={(checked) => {
              setAutoSend(checked);
              handleChange();
            }} 
          />
        </div>

        {/* Expiration hours */}
        <div className="space-y-2">
          <Label className="text-foreground">Platnost odkazu</Label>
          <Select 
            value={expirationHours.toString()} 
            onValueChange={(value) => {
              setExpirationHours(parseInt(value));
              handleChange();
            }}
          >
            <SelectTrigger className="w-full glass-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="24">24 hodin</SelectItem>
              <SelectItem value="48">48 hodin</SelectItem>
              <SelectItem value="72">72 hodin (3 dny)</SelectItem>
              <SelectItem value="168">168 hodin (1 týden)</SelectItem>
              <SelectItem value="336">336 hodin (2 týdny)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default language */}
        <div className="space-y-2">
          <Label className="text-foreground">Výchozí jazyk</Label>
          <Select 
            value={defaultLanguage} 
            onValueChange={(value) => {
              setDefaultLanguage(value);
              handleChange();
            }}
          >
            <SelectTrigger className="w-full glass-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="cs">🇨🇿 Čeština</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* === RED FLAG THRESHOLDS - Master Prompt === */}
      <div className="space-y-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <Label className="text-foreground font-medium">Prahy pro Red Flags</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Nastavte, při jakých hodnotách se spustí upozornění na problém.
        </p>
        
        {/* Pain threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Bolest (červený práh)</Label>
            <span className="text-sm font-medium text-warning">{painThreshold}/10</span>
          </div>
          <Slider
            value={[painThreshold]}
            onValueChange={([v]) => {
              setPainThreshold(v);
              handleChange();
            }}
            min={4}
            max={10}
            step={1}
            className="py-2"
          />
          <p className="text-xs text-muted-foreground">
            Bolest ≥ {painThreshold} vyvolá red flag
          </p>
        </div>
        
        {/* Body feel threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Pocit v těle (červený práh)</Label>
            <span className="text-sm font-medium text-warning">{bodyFeelThreshold}/10</span>
          </div>
          <Slider
            value={[bodyFeelThreshold]}
            onValueChange={([v]) => {
              setBodyFeelThreshold(v);
              handleChange();
            }}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
          <p className="text-xs text-muted-foreground">
            Pocit v těle ≤ {bodyFeelThreshold} vyvolá red flag
          </p>
        </div>
      </div>

      {/* === POKROČILÉ NASTAVENÍ === */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between gap-2 glass-subtle border-0 h-auto py-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span>Pokročilé nastavení</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Trainer signature */}
          <div className="space-y-2">
            <Label className="text-foreground">Podpis trenéra</Label>
            <p className="text-sm text-muted-foreground">
              Text, který se zobrazí na konci e-mailu
            </p>
            <Textarea
              value={trainerSignature}
              onChange={(e) => {
                setTrainerSignature(e.target.value);
                handleChange();
              }}
              placeholder={"S pozdravem,\nVáš trenér Jan Novák"}
              className="glass-input min-h-[100px]"
            />
          </div>

          {/* Questionnaire Editor */}
          <div className="space-y-2">
            <Label className="text-foreground">Editor otázek dotazníku</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Povinné otázky (💪 Svalovka, 🩹 Bolest, ⚡ Energie, 🏋️ Náročnost) jsou vždy viditelné.
              Ostatní jsou volitelné a klient je může rozbalit.
            </p>
            <div className="glass-subtle rounded-xl p-4">
              <FeedbackQuestionsEditor
                config={questionsConfig}
                onChange={(config) => {
                  setQuestionsConfig(config);
                  handleChange();
                }}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Save button */}
      {hasChanges && (
        <Button 
          onClick={handleSave} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : (
            'Uložit nastavení'
          )}
        </Button>
      )}
    </div>
  );
}
