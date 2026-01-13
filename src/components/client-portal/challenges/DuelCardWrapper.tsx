import { useDuelOpponent, PeerChallenge } from '@/hooks/usePeerChallenges';
import { DuelCard } from './DuelCard';

interface DuelCardWrapperProps {
  challenge: PeerChallenge & { my_submission?: { score_primary: number } | null };
  onClick: () => void;
}

export function DuelCardWrapper({ challenge, onClick }: DuelCardWrapperProps) {
  const { data: opponent } = useDuelOpponent(challenge.id);
  
  return (
    <DuelCard
      challenge={challenge}
      myScore={challenge.my_submission?.score_primary ?? null}
      opponentScore={opponent?.best_score ?? null}
      opponentName={opponent?.display_name ?? 'Čeká se na soupeře'}
      onClick={onClick}
    />
  );
}
