import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  HelpCircle, 
  ChevronDown,
  Users,
  Swords,
  Globe
} from 'lucide-react';
import { 
  useMyPeerChallenges,
  usePeerChallengeInvitations,
  useRespondToInvitation,
} from '@/hooks/usePeerChallenges';
import { PeerChallengeCard } from './PeerChallengeCard';
import { DuelCard } from './DuelCard';
import { PendingInvitationsSection } from './PendingInvitationsSection';
import { CreatePeerChallengeDialog } from './CreatePeerChallengeDialog';
import { PeerChallengesOnboarding } from './PeerChallengesOnboarding';
import { PeerChallengeDetailModal } from './PeerChallengeDetailModal';
import { XPBettingStats } from './XPBettingStats';
import { XPBettingInfo } from './XPBettingInfo';
import { cn } from '@/lib/utils';

export function PeerChallengesSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  const { data: challenges = [], isLoading: loadingChallenges } = useMyPeerChallenges();
  const { data: invitations = [], isLoading: loadingInvitations } = usePeerChallengeInvitations();
  const respondToInvitation = useRespondToInvitation();

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

  const handleOnboardingClose = (dontShowAgain: boolean) => {
    setShowOnboarding(false);
    if (dontShowAgain) {
      setOnboardingSeen(true);
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
            <div className="p-4 pt-0 space-y-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {/* XP Betting Stats */}
                  <XPBettingStats />

                  {/* Pending invitations */}
                  <PendingInvitationsSection
                    invitations={invitations}
                    onAccept={handleAcceptInvitation}
                    onDecline={handleDeclineInvitation}
                    isLoading={respondToInvitation.isPending}
                  />

                  {/* Active duels */}
                  {duels.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Swords className="h-4 w-4 text-orange-500" />
                        Aktivní duely
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {duels.map((duel) => (
                          <DuelCard
                            key={duel.id}
                            challenge={duel}
                            myScore={duel.my_submission?.score_primary ?? null}
                            opponentScore={null} // TODO: Get opponent score
                            opponentName="Soupeř" // TODO: Get opponent name
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
                        Skupinové & veřejné výzvy
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
                      <p className="font-medium">Zatím žádné výzvy</p>
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
