import { useMemo } from 'react';
import { useAvailableFeedbacks, PendingFeedback } from './useClientPortalFeedback';
import { useClientPortalPendingPreDiagnostic } from './useClientPortalPendingPreDiagnostic';
import { useClientPortalProfileData } from './useClientPortalProfile';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

export type ActionType = 'feedback' | 'prediagnostic' | 'profile';
export type ActionUrgency = 'high' | 'medium' | 'low';

export interface PendingAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  urgency: ActionUrgency;
  link?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export function useClientPendingActions() {
  const availableFeedbacks = useAvailableFeedbacks();
  const { data: pendingPreDiagnostic, isLoading: preDiagLoading } = useClientPortalPendingPreDiagnostic();
  const { data: profile, isLoading: profileLoading } = useClientPortalProfileData();

  const isLoading = preDiagLoading || profileLoading;

  const actions = useMemo(() => {
    const pendingActions: PendingAction[] = [];

    // 1. Feedback actions (high urgency - time-limited)
    availableFeedbacks.forEach((feedback: PendingFeedback) => {
      const timeRemaining = formatDistanceToNow(feedback.feedback_expires_at, { 
        addSuffix: false, 
        locale: cs 
      });
      
      pendingActions.push({
        id: `feedback-${feedback.training_session_id}`,
        type: 'feedback',
        title: 'Zpětná vazba po tréninku',
        description: `Zbývá ${timeRemaining}`,
        urgency: 'high',
        link: '/client/feedback',
        expiresAt: feedback.feedback_expires_at,
        metadata: { trainingSessionId: feedback.training_session_id },
      });
    });

    // 2. Pre-diagnostic action (medium urgency)
    if (pendingPreDiagnostic) {
      const timeRemaining = formatDistanceToNow(new Date(pendingPreDiagnostic.expires_at), { 
        addSuffix: false, 
        locale: cs 
      });
      
      pendingActions.push({
        id: `prediagnostic-${pendingPreDiagnostic.id}`,
        type: 'prediagnostic',
        title: 'Prediagnostický dotazník',
        description: `Pomůže trenérovi lépe tě poznat · zbývá ${timeRemaining}`,
        urgency: 'medium',
        link: `/pre-diagnostic/${pendingPreDiagnostic.token}`,
        expiresAt: new Date(pendingPreDiagnostic.expires_at),
      });
    }

    // 3. Profile completion (low urgency)
    if (profile) {
      const missingFields: string[] = [];
      
      if (!profile.email) missingFields.push('email');
      if (!profile.phone) missingFields.push('telefon');
      if (!profile.birth_date) missingFields.push('datum narození');
      if (!profile.occupation) missingFields.push('typ práce');
      if (!profile.health_restrictions) missingFields.push('zdravotní omezení');
      if (!profile.training_goals?.length) missingFields.push('cíle tréninku');
      
      // Only show if there are missing important fields (at least 2)
      if (missingFields.length >= 2) {
        const totalFields = 10;
        const filledFields = totalFields - missingFields.length;
        const percent = Math.round((filledFields / totalFields) * 100);
        
        pendingActions.push({
          id: 'profile-completion',
          type: 'profile',
          title: `Doplnit profil (${percent}%)`,
          description: missingFields.slice(0, 3).join(', ') + (missingFields.length > 3 ? '...' : ''),
          urgency: 'low',
          link: '/client/settings',
          metadata: { missingFields, completionPercent: percent },
        });
      }
    }

    // Sort by urgency
    const urgencyOrder: Record<ActionUrgency, number> = { high: 0, medium: 1, low: 2 };
    return pendingActions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, [availableFeedbacks, pendingPreDiagnostic, profile]);

  return {
    actions,
    isLoading,
    hasActions: actions.length > 0,
    count: actions.length,
  };
}
