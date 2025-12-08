import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { useFeedbackSettings } from '@/hooks/useFeedbackRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export function FeedbackSettings() {
  const { settings, isLoading, upsertSettings } = useFeedbackSettings();
  const isUpdating = upsertSettings.isPending;
  const [autoSend, setAutoSend] = useState(false);
  const [expirationHours, setExpirationHours] = useState(72);
  const [trainerSignature, setTrainerSignature] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('cs');
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

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

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Zadejte platnou e-mailovou adresu');
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          requestId: 'test-' + Date.now(),
          clientEmail: testEmail,
          clientName: 'Testovací klient',
          trainingDate: format(new Date(), 'd. MMMM yyyy', { locale: cs }),
          trainingType: 'Testovací trénink',
          customMessage: 'Toto je testovací e-mail z nastavení.',
          trainerSignature: trainerSignature || undefined,
          feedbackUrl: window.location.origin + '/feedback/test-token',
          isTest: true,
        },
      });

      if (error) throw error;
      
      toast.success('Testovací e-mail byl odeslán na ' + testEmail);
      setTestEmail('');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error('Nepodařilo se odeslat testovací e-mail: ' + (error.message || 'Neznámá chyba'));
    } finally {
      setIsSendingTest(false);
    }
  };

  // Sample data for preview
  const sampleDate = format(new Date(), 'd. MMMM yyyy', { locale: cs });
  const sampleClientName = 'Jan Novák';

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
          placeholder={"S pozdravem,\nVáš trenér Jan Novák"}
          className="glass-input min-h-[100px]"
        />
      </div>

      {/* Email Preview */}
      <Collapsible open={showPreview} onOpenChange={setShowPreview}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full gap-2 glass-subtle border-0">
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Skrýt náhled e-mailu' : 'Zobrazit náhled e-mailu'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="rounded-xl overflow-hidden border border-border bg-white text-black">
            {/* Email Header */}
            <div 
              className="p-6 text-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <h3 className="text-white text-lg font-semibold m-0">
                🏋️ Zpětná vazba po tréninku
              </h3>
            </div>
            
            {/* Email Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-800">
                Dobrý den, <strong>{sampleClientName}</strong>!
              </p>
              
              <p className="text-gray-600 text-sm">
                Prosíme o vyplnění krátkého dotazníku k vašemu nedávnému tréninku. 
                Vaše zpětná vazba nám pomůže lépe přizpůsobit tréninkový plán vašim potřebám.
              </p>
              
              {/* Info Box */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Datum tréninku:</span>
                  <span className="font-semibold text-gray-800">{sampleDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Typ tréninku:</span>
                  <span className="font-semibold text-gray-800">Silový trénink</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <div className="text-center py-2">
                <span 
                  className="inline-block px-8 py-3 rounded-lg text-white font-semibold cursor-default"
                  style={{ background: '#6366f1' }}
                >
                  Vyplnit zpětnou vazbu
                </span>
              </div>
              
              <p className="text-center text-gray-400 text-xs">
                Formulář trvá přibližně 1-2 minuty.
              </p>
              
              {/* Signature */}
              {trainerSignature && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-gray-500 italic text-sm whitespace-pre-line">
                    {trainerSignature}
                  </p>
                </div>
              )}
            </div>
            
            {/* Email Footer */}
            <div className="border-t border-gray-200 p-4 text-center">
              <p className="text-gray-400 text-xs m-0">
                Tento e-mail byl odeslán automaticky. Pokud jste o něj nežádali, můžete ho ignorovat.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Test Email */}
      <div className="space-y-3 p-4 rounded-xl glass-subtle">
        <Label className="text-foreground">Odeslat testovací e-mail</Label>
        <p className="text-sm text-muted-foreground">
          Vyzkoušejte, jak bude e-mail vypadat ve schránce
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="vas@email.cz"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="glass-input flex-1"
          />
          <Button 
            onClick={handleSendTestEmail}
            disabled={isSendingTest || !testEmail}
            className="gap-2"
          >
            {isSendingTest ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Odeslat
          </Button>
        </div>
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
