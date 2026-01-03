import { useEffect, useRef } from 'react';
import { useClientActiveChallenges } from '@/hooks/useClientPortalBenchmarks';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';

/**
 * Hook that monitors for new challenges and shows toast notifications
 */
export function useChallengeNotifications() {
  const { data } = useClientActiveChallenges();
  const prevChallengeIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!data?.challenges) return;
    
    const currentIds = new Set(data.challenges.map(c => c.id));
    
    // Skip initial load
    if (!isInitializedRef.current) {
      prevChallengeIdsRef.current = currentIds;
      isInitializedRef.current = true;
      return;
    }
    
    // Find new challenges
    currentIds.forEach(id => {
      if (!prevChallengeIdsRef.current.has(id)) {
        const challenge = data.challenges.find(c => c.id === id);
        if (challenge) {
          toast.success('🏆 Nová výzva!', {
            description: challenge.title,
            duration: 8000,
            action: {
              label: 'Zobrazit',
              onClick: () => {
                window.location.href = '/client-portal/challenges';
              },
            },
          });
        }
      }
    });
    
    prevChallengeIdsRef.current = currentIds;
  }, [data?.challenges]);
}
