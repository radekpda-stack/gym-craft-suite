import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Clock, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO } from 'date-fns';
import { useClientActiveChallenges } from '@/hooks/useClientPortalBenchmarks';

interface ActiveChallengeWidgetProps {
  className?: string;
}

export function ActiveChallengeWidget({ className }: ActiveChallengeWidgetProps) {
  const { data, isLoading } = useClientActiveChallenges();

  // Get first active challenge
  const challenge = data?.challenges?.[0];
  const submission = challenge 
    ? data?.clientSubmissions?.find(s => s.challenge_id === challenge.id)
    : null;
  const participantCount = challenge 
    ? (data?.participantCounts?.[challenge.id] ?? 0)
    : 0;

  // Don't render anything if no active challenges
  if (!isLoading && !challenge) {
    return null;
  }

  const daysRemaining = challenge 
    ? differenceInDays(parseISO(challenge.end_at), new Date())
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={className}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-500" />
            </div>
            <Link to="/client/challenges">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Výzvy <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : challenge ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                  Aktivní výzva
                </span>
                {daysRemaining <= 3 && daysRemaining > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                    Končí brzy!
                  </span>
                )}
              </div>

              <p className="text-lg font-bold truncate mb-2">
                {challenge.title}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {daysRemaining > 0 
                    ? `${daysRemaining} ${daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'} zbývá`
                    : 'Dnes končí!'
                  }
                </div>
                {participantCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5" />
                    {participantCount} účastníků
                  </div>
                )}
              </div>

              {submission ? (
                <div className="mt-3 p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tvůj nejlepší výsledek</p>
                  <p className="text-sm font-semibold">
                    {submission.score_primary} {challenge.unit_label ?? ''}
                  </p>
                </div>
              ) : (
                <Link to="/client/challenges">
                  <Button variant="secondary" size="sm" className="mt-3 w-full">
                    Odeslat výsledek
                  </Button>
                </Link>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
