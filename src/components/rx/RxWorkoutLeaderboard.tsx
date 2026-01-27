import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  useRxWorkoutLeaderboard,
  RxWorkoutResult,
  formatRxScore,
} from '@/hooks/useRxWorkoutResults';
import type { RxScoringMode } from '@/hooks/useRxWorkouts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Users, Flame } from 'lucide-react';
import { RxClientHistoryDialog } from './RxClientHistoryDialog';

interface RxWorkoutLeaderboardProps {
  workoutId: string;
  workoutName?: string;
  scoringMode: RxScoringMode;
  compact?: boolean;
  maxItems?: number;
}

type GenderFilter = 'all' | 'male' | 'female';

export function RxWorkoutLeaderboard({
  workoutId,
  workoutName = 'Workout',
  scoringMode,
  compact = false,
  maxItems = 10,
}: RxWorkoutLeaderboardProps) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const { leaderboard, isLoading } = useRxWorkoutLeaderboard(workoutId, scoringMode);

  // Filter by gender
  const filteredLeaderboard = leaderboard.filter((result) => {
    if (genderFilter === 'all') return true;
    return result.client?.gender === genderFilter;
  });

  const displayLeaderboard = compact
    ? filteredLeaderboard.slice(0, 3)
    : filteredLeaderboard.slice(0, maxItems);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}.`;
    }
  };

  const formatCappedScore = (result: RxWorkoutResult): string => {
    if (result.is_capped) {
      return `CAP +${result.capped_rounds || 0}+${result.capped_reps || 0}`;
    }
    return formatRxScore(result.score_primary, scoringMode, result.score_secondary);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Zatím žádné výsledky
      </div>
    );
  }

  if (compact) {
    // Compact view for card
    return (
      <div className="space-y-1">
        {displayLeaderboard.map((result, index) => (
          <div
            key={result.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span>{getRankIcon(index + 1)}</span>
              <span className="truncate max-w-[120px]">
                {result.client?.name?.split(' ')[0] || 'Neznámý'}
                {result.client?.name?.split(' ')[1]?.[0] && ` ${result.client.name.split(' ')[1][0]}.`}
              </span>
              {result.is_personal_record && (
                <Flame className="h-3 w-3 text-orange-500" />
              )}
            </div>
            <Badge 
              variant={result.is_capped ? 'outline' : 'secondary'} 
              className="font-mono text-xs"
            >
              {formatCappedScore(result)}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  // Full leaderboard view
  return (
    <>
      <div className="space-y-4">
        {/* Gender filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{filteredLeaderboard.length} výsledků</span>
          </div>
          <ToggleGroup
            type="single"
            value={genderFilter}
            onValueChange={(v) => v && setGenderFilter(v as GenderFilter)}
            size="sm"
          >
            <ToggleGroupItem value="all" aria-label="Všichni">
              <Users className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="male" aria-label="Muži">
              M
            </ToggleGroupItem>
            <ToggleGroupItem value="female" aria-label="Ženy">
              Ž
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Results list */}
        <div className="space-y-2">
          {displayLeaderboard.map((result, index) => (
            <LeaderboardRow
              key={result.id}
              result={result}
              rank={index + 1}
              scoringMode={scoringMode}
              onClick={() => result.client && setSelectedClient({ 
                id: result.client.id, 
                name: result.client.name 
              })}
            />
          ))}
        </div>

        {filteredLeaderboard.length > maxItems && (
          <div className="text-center">
            <Button variant="ghost" size="sm">
              Zobrazit všech {filteredLeaderboard.length}
            </Button>
          </div>
        )}
      </div>

      {/* Client history dialog */}
      {selectedClient && (
        <RxClientHistoryDialog
          open={!!selectedClient}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          workoutId={workoutId}
          workoutName={workoutName}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          scoringMode={scoringMode}
        />
      )}
    </>
  );
}

function LeaderboardRow({
  result,
  rank,
  scoringMode,
  onClick,
}: {
  result: RxWorkoutResult;
  rank: number;
  scoringMode: RxScoringMode;
  onClick?: () => void;
}) {
  const getRankIcon = (r: number) => {
    switch (r) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const icon = getRankIcon(rank);
  const gender = result.client?.gender;

  const formatScore = (): string => {
    if (result.is_capped) {
      return `CAP +${result.capped_rounds || 0}+${result.capped_reps || 0}`;
    }
    return formatRxScore(result.score_primary, scoringMode, result.score_secondary);
  };

  return (
    <div 
      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Rank */}
      <div className="w-8 text-center font-medium">
        {icon || <span className="text-muted-foreground">{rank}.</span>}
      </div>

      {/* Name & gender */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {result.client?.name || 'Neznámý'}
          </span>
          {gender && (
            <Badge variant="outline" className="text-xs">
              {gender === 'male' ? 'M' : 'Ž'}
            </Badge>
          )}
          {result.is_personal_record && (
            <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">
              <Flame className="h-3 w-3 mr-1" />
              PR
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(result.performed_at), 'd. MMM yyyy', { locale: cs })}
        </div>
      </div>

      {/* Score */}
      <Badge 
        variant={result.is_capped ? 'outline' : 'default'} 
        className={`font-mono ${result.is_capped ? 'border-yellow-500/50 text-yellow-600' : ''}`}
      >
        {formatScore()}
      </Badge>
    </div>
  );
}
