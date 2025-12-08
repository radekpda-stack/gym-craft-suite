import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeedbackSettings, FeedbackSettings as FeedbackSettingsType } from '@/hooks/useFeedbackRequests';

export function FeedbackSettings() {
  const { settings, isLoading, upsertSettings } = useFeedbackSettings();
  const isUpdating = upsertSettings.isPending;
  const [autoSend, setAutoSend] = useState(false);
  const [expirationHours, setExpirationHours] = useState(72);
  const [trainerSignature, setTrainerSignature] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('cs');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoSend(settings.auto_send_after_training ?? false);
      setExpirationHours(settings.expiration_hours ?? 72);
      setTrainerSignature(settings.trainer_signature ?? '');
      setDefaultLanguage(settings.default_language ?? 'cs');
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
        <p className="text-sm text-muted-foreground mb-2">
          Jak dlouho bude odkaz pro feedback platný
        </p>
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
        <Label className="text-foreground">Výchozí jazyk feedbacku</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Jazyk formuláře pro klienty
        </p>
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

      {/* Trainer signature */}
      <div className="space-y-2">
        <Label className="text-foreground">Podpis trenéra</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Text, který se zobrazí na konci e-mailu
        </p>
        <Textarea
          value={trainerSignature}
          onChange={(e) => {
            setTrainerSignature(e.target.value);
            handleChange();
          }}
          placeholder="S pozdravem,&#10;Váš trenér Jan Novák"
          className="glass-input min-h-[100px]"
        />
      </div>

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
