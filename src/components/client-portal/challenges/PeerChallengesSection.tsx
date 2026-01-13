import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  HelpCircle, 
  ChevronDown,
  Users,
  Swords,
  Globe,
  Link2,
  History
} from 'lucide-react';
import { 
  useMyPeerChallenges,
  usePeerChallengeInvitations,
  useRespondToInvitation,
  useCompletedPeerChallenges,
} from '@/hooks/usePeerChallenges';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { PeerChallengeCard } from './PeerChallengeCard';
import { DuelCardWrapper } from './DuelCardWrapper';
import { PendingInvitationsSection } from './PendingInvitationsSection';
import { CreatePeerChallengeDialog } from './CreatePeerChallengeDialog';
import { PeerChallengesOnboarding } from './PeerChallengesOnboarding';
import { PeerChallengeDetailModal } from './PeerChallengeDetailModal';
import { XPBettingStats } from './XPBettingStats';
import { XPBettingInfo } from './XPBettingInfo';
import { JoinByCodeDialog } from './JoinByCodeDialog';
import { PublicChallengesSection } from './PublicChallengesSection';
import { CompletedPeerChallengesSection } from './CompletedPeerChallengesSection';
import { cn } from '@/lib/utils';

export function PeerChallengesSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState(true); // Default to true to avoid flash

  const { clientId } = useClientPortal();
  const { data: challenges = [], isLoading: loadingChallenges } = useMyPeerChallenges();
  const { data: completedChallenges = [] } = useCompletedPeerChallenges();
  const { data: invitations = [], isLoading: loadingInvitations } = usePeerChallengeInvitations();
  const respondToInvitation = useRespondToInvitation();

  // Load onboarding state from DB
  useEffect(() => {
    const loadOnboardingState = async () => {
      if (!clientId) return;
      
      const { data } = await supabase
        .from('client_preferences')
        .select('peer_challenges_onboarding_seen')
        .eq('client_id', clientId)
        .maybeSingle();
      
      setOnboardingSeen(data?.peer_challenges_onboarding_seen ?? false);
    };
    
    loadOnboardingState();
  }, [clientId]);

  const activeChallenges = (challenges as any[]).filter((c: any) => c?.status === 'active');
  const duels = activeChallenges.filter((c: any) => c?.challenge_type === 'duel');
  const groupChallenges = activeChallenges.filter((c: any) => c?.challenge_type !== 'duel');

  const pendingCount = invitations.length;
  const totalActive = activeChallenges.length + pendingCount;

  // Check if should show onboarding
  const handleCreateClick = () => {
    if (!onboardingSeen) {
      setShowOnboarding(true);
    } else {
      setShowCreateDialog(true);
    }
  };

  const handleHelpClick = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingClose = async (dontShowAgain: boolean) => {
    setShowOnboarding(false);
    if (dontShowAgain && clientId) {
      setOnboardingSeen(true);
      // Save to DB
      await supabase
        .from('client_preferences')
        .upsert({
          client_id: clientId,
          peer_challenges_onboarding_seen: true,
        }, { onConflict: 'client_id' });
    }
    // Open create dialog after onboarding
    setShowCreateDialog(true);
  };

  const handleAcceptInvitation = (participantId: string) => {
    // Find challenge_id from invitation
    const inv = invitations.find(i => i.participant_id === participantId);
    if (inv) respondToInvitation.mutate({ challengeId: inv.challenge_id, accept: true });
  };

  const handleDeclineInvitation = (participantId: string) => {
    const inv = invitations.find(i => i.participant_id === participantId);
    if (inv) respondToInvitation.mutate({ challengeId: inv.challenge_id, accept: false });
  };

  const isLoading = loadingChallenges || loadingInvitations;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Mezi klienty</span>
                {totalActive > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalActive}
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge className="bg-orange-500 text-white">
                    {pendingCount} nových
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpClick();
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowJoinDialog(true);
                  }}
                >
                  <Link2 className="h-4 w-4 mr-1" />
                  Kódem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateClick();
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nová výzva
                </Button>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* XP Betting Stats */}
                  <XPBettingStats />

                  {/* Tabs for Active / Completed */}
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="active" className="text-xs sm:text-sm">
                        Aktivní
                        {activeChallenges.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                            {activeChallenges.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs sm:text-sm">
                        <History className="h-3.5 w-3.5 mr-1.5" />
                        Dokončené
                        {completedChallenges.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                            {completedChallenges.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-4 space-y-6">
                      {/* Pending invitations */}
                      <PendingInvitationsSection
                        invitations={invitations}
                        onAccept={handleAcceptInvitation}
                        onDecline={handleDeclineInvitation}
                        isLoading={respondToInvitation.isPending}
                      />

                      {/* Public challenges to join */}
                      <PublicChallengesSection />

                      {/* Active duels */}
                      {duels.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Swords className="h-4 w-4 text-orange-500" />
                            Aktivní duely
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {duels.map((duel) => (
                              <DuelCardWrapper
                                key={duel.id}
                                challenge={duel}
                                onClick={() => setSelectedChallengeId(duel.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Group & public challenges */}
                      {groupChallenges.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Globe className="h-4 w-4 text-green-500" />
                            Moje skupinové & veřejné výzvy
                          </h4>
                          <div className="grid gap-3">
                            {groupChallenges.map((challenge) => (
                              <PeerChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                onClick={() => setSelectedChallengeId(challenge.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {activeChallenges.length === 0 && invitations.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">Zatím žádné aktivní výzvy</p>
                          <p className="text-sm mt-1">Vytvoř první výzvu a vyzvi ostatní!</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={handleCreateClick}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Vytvořit výzvu
                          </Button>
                        </div>
                      )}

                      {/* XP Betting Info */}
                      <XPBettingInfo />
                    </TabsContent>

                    <TabsContent value="completed" className="mt-4">
                      <CompletedPeerChallengesSection />
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Dialogs */}
      <CreatePeerChallengeDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <PeerChallengesOnboarding
        open={showOnboarding}
        onClose={handleOnboardingClose}
      />

      <JoinByCodeDialog
        open={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
      />

      {selectedChallengeId && (
        <PeerChallengeDetailModal
          challengeId={selectedChallengeId}
          open={!!selectedChallengeId}
          onClose={() => setSelectedChallengeId(null)}
        />
      )}
    </>
  );
}
