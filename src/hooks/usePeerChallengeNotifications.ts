import { useEffect, useRef } from 'react';
import { usePeerChallengeInvitations, useMyPeerChallenges } from '@/hooks/usePeerChallenges';
import { useClientPortalNotifications } from '@/hooks/useClientPortalNotifications';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Hook that monitors for new peer challenge invitations and completed challenges
 * and shows toast notifications
 */
export function usePeerChallengeNotifications() {
  const navigate = useNavigate();
  const { data: invitations = [] } = usePeerChallengeInvitations();
  const { data: notifications = [] } = useClientPortalNotifications();
  
  const prevInvitationIdsRef = useRef<Set<string>>(new Set());
  const processedNotificationIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  
  // Track invitation changes
  useEffect(() => {
    const currentIds = new Set(invitations.map(i => i.participant_id));
    
    // Skip initial load
    if (!isInitializedRef.current) {
      prevInvitationIdsRef.current = currentIds;
      isInitializedRef.current = true;
      return;
    }
    
    // Find new invitations
    currentIds.forEach(id => {
      if (!prevInvitationIdsRef.current.has(id)) {
        const invitation = invitations.find(i => i.participant_id === id);
        if (invitation) {
          toast('⚔️ Nová výzva!', {
            description: `${invitation.invited_by_name} tě vyzývá: ${invitation.challenge_title}`,
            duration: 10000,
            action: {
              label: 'Zobrazit',
              onClick: () => {
                navigate('/client-portal/challenges?tab=challenges');
              },
            },
          });
        }
      }
    });
    
    prevInvitationIdsRef.current = currentIds;
  }, [invitations, navigate]);

  // Track peer challenge notifications from DB
  useEffect(() => {
    const peerNotifications = notifications.filter(
      n => n.type.startsWith('peer_challenge_') && !n.is_read
    );

    for (const notification of peerNotifications) {
      if (processedNotificationIdsRef.current.has(notification.id)) continue;
      processedNotificationIdsRef.current.add(notification.id);

      // Show toast for specific peer challenge notification types
      if (notification.type === 'peer_challenge_ended') {
        const xpResult = notification.metadata?.xp_result as number | undefined;
        const icon = xpResult && xpResult > 0 ? '🏆' : '🎯';
        
        toast(`${icon} ${notification.title}`, {
          description: notification.message || undefined,
          duration: 10000,
          action: {
            label: 'Zobrazit',
            onClick: () => {
              navigate('/client-portal/challenges?tab=challenges');
            },
          },
        });
      }
    }
  }, [notifications, navigate]);
}
