import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronRight, Flame, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRecentXPGains, getXPSourceLabel, getXPSourceIcon } from '@/hooks/useXPHistory';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface XPHistoryWidgetProps {
  clientId?: string;
  compact?: boolean;
}

export function XPHistoryWidget({ clientId, compact = false }: XPHistoryWidgetProps) {
  const { events, totalRecent, isLoading } = useRecentXPGains(clientId);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Zatím žádné XP záznamy
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (compact) {
    return (
      <div className="space-y-1.5">
        {events.slice(0, 3).map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 text-sm"
          >
            <span>{getXPSourceIcon(event.source_type)}</span>
            <span className="flex-1 truncate text-muted-foreground">
              {event.description || getXPSourceLabel(event.source_type)}
            </span>
            <span className="font-medium text-primary">+{event.xp_amount}</span>
          </motion.div>
        ))}
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Poslední XP
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            +{totalRecent} celkem
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence>
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-sm">
                {getXPSourceIcon(event.source_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {event.description || getXPSourceLabel(event.source_type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(event.created_at), { addSuffix: true, locale: cs })}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">+{event.xp_amount}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

interface StreakTooltipProps {
  currentStreak: number;
  children: React.ReactNode;
}

export function StreakTooltip({ currentStreak, children }: StreakTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Flame className="w-4 h-4 text-orange-500" />
              Týdenní streak: {currentStreak}
            </div>
            <p className="text-xs text-muted-foreground">
              Streak se počítá jako počet po sobě jdoucích týdnů, kdy jsi alespoň jednou trénoval/a.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
