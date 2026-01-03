import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Scale, Flame, UserPlus, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useWinOfTheWeek, WinOfTheWeek } from '@/hooks/useWinOfTheWeek';
import { cn } from '@/lib/utils';

const iconMap = {
  trophy: Trophy,
  medal: Trophy,
  scale: Scale,
  flame: Flame,
  'user-plus': UserPlus,
};

export const WinOfTheWeekCard = memo(function WinOfTheWeekCard() {
  const { data, isLoading } = useWinOfTheWeek();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.topWin) {
    return null; // Don't show if no wins
  }

  const win = data.topWin;
  const Icon = iconMap[win.icon] || Trophy;

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Úspěch týdne
          </span>
        </div>

        <Link
          to={`/clients/${win.clientId}`}
          className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-amber-500/10 transition-colors group"
        >
          <div className="p-2 rounded-full bg-amber-500/20">
            <Icon className="w-5 h-5 text-amber-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{win.title}</p>
            <p className="text-sm text-muted-foreground">{win.description}</p>
            {win.value && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                {win.value}
              </span>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>

        {data.wins.length > 1 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            +{data.wins.length - 1} dalších úspěchů tento týden
          </p>
        )}
      </CardContent>
    </Card>
  );
});
