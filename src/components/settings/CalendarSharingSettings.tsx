import { useState } from 'react';
import { Calendar, Mail, UserPlus, X, Check, Users, Send, Loader2 } from 'lucide-react';
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

export function CalendarSharingSettings() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  
  const { data: myShares = [], isLoading: loadingMyShares } = useMyCalendarShares();
  const { data: sharedWithMe = [], isLoading: loadingSharedWithMe } = useSharedWithMe();
  const { data: pendingInvitations = [], isLoading: loadingPending } = usePendingInvitations();
  
  const createShare = useCreateCalendarShare();
  const respondToInvitation = useRespondToInvitation();
  const deleteShare = useDeleteCalendarShare();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    await createShare.mutateAsync(email.trim());
    setEmail('');
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
    },
  };

  const texts = t[language];

  return (
    <div className="space-y-6">
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
