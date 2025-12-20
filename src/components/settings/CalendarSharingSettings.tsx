import { useState } from 'react';
import { Calendar, Mail, UserPlus, X, Check, Users, Send, Loader2, Link2, Copy, Eye, EyeOff, RefreshCw, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import {
  useMyCalendarShares,
  useSharedWithMe,
  usePendingInvitations,
  useCreateCalendarShare,
  useRespondToInvitation,
  useDeleteCalendarShare,
} from '@/hooks/useCalendarShares';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';

export function CalendarSharingSettings() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const { data: myShares = [], isLoading: loadingMyShares } = useMyCalendarShares();
  const { data: sharedWithMe = [], isLoading: loadingSharedWithMe } = useSharedWithMe();
  const { data: pendingInvitations = [], isLoading: loadingPending } = usePendingInvitations();
  const { data: settings } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const createShare = useCreateCalendarShare();
  const respondToInvitation = useRespondToInvitation();
  const deleteShare = useDeleteCalendarShare();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    await createShare.mutateAsync(email.trim());
    setEmail('');
  };

  // Get or generate API key for Make.com webhook
  const calendarWebhookKey = (settings as any)?.calendar_webhook_key || '';
  
  const generateNewApiKey = async () => {
    const newKey = crypto.randomUUID().replace(/-/g, '');
    await updateSetting.mutateAsync({
      key: 'calendar_webhook_key',
      value: newKey,
    });
    toast.success(texts.copied);
  };

  const webhookUrl = `https://zukmwqfqmfuyqpxfjqil.supabase.co/functions/v1/calendar-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(texts.copied);
  };

  const isLoading = loadingMyShares || loadingSharedWithMe || loadingPending;

  const t = {
    cs: {
      title: 'Sdílení kalendáře',
      description: 'Pozvěte jiné trenéry k zobrazení vašeho kalendáře',
      inviteTrainer: 'Pozvat trenéra',
      enterEmail: 'Email trenéra',
      sendInvitation: 'Odeslat pozvánku',
      myShares: 'Komu sdílím kalendář',
      sharedWithMe: 'Kdo mi sdílí kalendář',
      pendingInvitations: 'Čekající pozvánky',
      noShares: 'Zatím nikomu nesdílíte kalendář',
      noSharedWithMe: 'Nikdo vám zatím nesdílí kalendář',
      noPending: 'Žádné čekající pozvánky',
      accept: 'Přijmout',
      reject: 'Odmítnout',
      remove: 'Zrušit',
      pending: 'Čeká na přijetí',
      accepted: 'Přijato',
      // Make.com
      makeIntegration: 'Make.com integrace',
      makeIntegrationDesc: 'Import kalendáře z telefonu přes Make.com',
      webhookUrl: 'Webhook URL',
      apiKey: 'API klíč',
      copyUrl: 'Kopírovat',
      copied: 'Zkopírováno!',
      makeInstructions: 'Zkopírujte webhook URL a API klíč do Make.com scénáře pro import událostí z kalendáře telefonu.',
      generateApiKey: 'Vygenerovat nový klíč',
      showApiKey: 'Zobrazit',
      hideApiKey: 'Skrýt',
      noApiKey: 'Klikněte pro vygenerování API klíče',
    },
    en: {
      title: 'Calendar Sharing',
      description: 'Invite other trainers to view your calendar',
      inviteTrainer: 'Invite trainer',
      enterEmail: 'Trainer email',
      sendInvitation: 'Send invitation',
      myShares: 'Who I share with',
      sharedWithMe: 'Shared with me',
      pendingInvitations: 'Pending invitations',
      noShares: "You haven't shared your calendar with anyone yet",
      noSharedWithMe: "No one has shared their calendar with you yet",
      noPending: 'No pending invitations',
      accept: 'Accept',
      reject: 'Reject',
      remove: 'Remove',
      pending: 'Pending',
      accepted: 'Accepted',
      // Make.com
      makeIntegration: 'Make.com Integration',
      makeIntegrationDesc: 'Import phone calendar via Make.com',
      webhookUrl: 'Webhook URL',
      apiKey: 'API Key',
      copyUrl: 'Copy',
      copied: 'Copied!',
      makeInstructions: 'Copy the webhook URL and API key to your Make.com scenario to import events from your phone calendar.',
      generateApiKey: 'Generate new key',
      showApiKey: 'Show',
      hideApiKey: 'Hide',
      noApiKey: 'Click to generate API key',
    },
  };

  const texts = t[language];

  return (
    <div className="space-y-6">
      {/* Make.com Integration Section */}
      <Card className="p-4 border-purple-500/30 bg-purple-500/5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-purple-500" />
          <h4 className="font-medium text-foreground">{texts.makeIntegration}</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{texts.makeInstructions}</p>
        
        <div className="space-y-3">
          {/* Webhook URL */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{texts.webhookUrl}</label>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-xs bg-background/50"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{texts.apiKey}</label>
            <div className="flex gap-2">
              {calendarWebhookKey ? (
                <>
                  <Input 
                    value={showApiKey ? calendarWebhookKey : '••••••••••••••••••••••••'}
                    readOnly 
                    className="font-mono text-xs bg-background/50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(calendarWebhookKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={generateNewApiKey}
                    disabled={updateSetting.isPending}
                  >
                    <RefreshCw className={cn("w-4 h-4", updateSetting.isPending && "animate-spin")} />
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={generateNewApiKey}
                  disabled={updateSetting.isPending}
                  className="w-full justify-start text-muted-foreground"
                >
                  {updateSetting.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  {texts.noApiKey}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder={texts.enterEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          type="submit" 
          disabled={!email.trim() || createShare.isPending}
          className="gap-2"
        >
          {createShare.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {texts.sendInvitation}
        </Button>
      </form>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-amber-500" />
            <h4 className="font-medium text-foreground">{texts.pendingInvitations}</h4>
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
              {pendingInvitations.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm text-foreground">
                    {invite.ownerProfile?.display_name || invite.ownerProfile?.email || invite.owner_user_id}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => respondToInvitation.mutate({ id: invite.id, accept: false })}
                    disabled={respondToInvitation.isPending}
                  >
                    <X className="w-3 h-3" />
                    {texts.reject}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => respondToInvitation.mutate({ id: invite.id, accept: true })}
                    disabled={respondToInvitation.isPending}
                  >
                    <Check className="w-3 h-3" />
                    {texts.accept}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My shares */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-foreground">{texts.myShares}</h4>
        </div>
        {myShares.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{texts.noShares}</p>
        ) : (
          <div className="space-y-2">
            {myShares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 rounded-lg glass-subtle"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm text-foreground">
                      {share.sharedWithProfile?.display_name || share.sharedWithProfile?.email || share.shared_with_user_id}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'ml-2 text-xs',
                        share.status === 'accepted' && 'border-green-500/30 text-green-600',
                        share.status === 'pending' && 'border-amber-500/30 text-amber-600'
                      )}
                    >
                      {share.status === 'accepted' ? texts.accepted : texts.pending}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteShare.mutate(share.id)}
                  disabled={deleteShare.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared with me */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-green-500" />
          <h4 className="font-medium text-foreground">{texts.sharedWithMe}</h4>
        </div>
        {sharedWithMe.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{texts.noSharedWithMe}</p>
        ) : (
          <div className="space-y-2">
            {sharedWithMe.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 rounded-lg glass-subtle"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <Calendar className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm text-foreground">
                    {share.ownerProfile?.display_name || share.ownerProfile?.email || share.owner_user_id}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteShare.mutate(share.id)}
                  disabled={deleteShare.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
