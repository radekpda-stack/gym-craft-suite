import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useXPHistory, getXPSourceLabel, getXPSourceIcon } from '@/hooks/useXPHistory';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Zap, History, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface XPHistoryCardProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export function XPHistoryCard({ limit = 10, showHeader = true, className }: XPHistoryCardProps) {
  const { clientId } = useClientPortal();
  const { data: events, isLoading } = useXPHistory(clientId ?? undefined, limit);

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-yellow-500" />
              Historie XP
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8 text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Zatím žádné XP záznamy</p>
          <p className="text-xs mt-1">Začni trénovat nebo zapisovat stravu</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date
  const groupedEvents: Record<string, typeof events> = {};
  events.forEach(event => {
    const dateKey = format(new Date(event.created_at), 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
    groupedEvents[dateKey].push(event);
  });

  // Calculate totals
  const totalXP = events.reduce((sum, e) => sum + e.xp_amount, 0);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayXP = groupedEvents[todayKey]?.reduce((sum, e) => sum + e.xp_amount, 0) || 0;

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-yellow-500" />
              Historie XP
            </CardTitle>
            <div className="flex items-center gap-2">
              {todayXP > 0 && (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{todayXP} dnes
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="px-4 pb-4 space-y-4">
            {Object.entries(groupedEvents).map(([dateKey, dayEvents], groupIndex) => {
              const date = new Date(dateKey);
              const isToday = dateKey === todayKey;
              const dayTotal = dayEvents.reduce((sum, e) => sum + e.xp_amount, 0);

              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-2 sticky top-0 bg-background py-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {isToday ? 'Dnes' : format(date, 'd. MMMM', { locale: cs })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      +{dayTotal} XP
                    </Badge>
                  </div>

                  {/* Events */}
                  <div className="space-y-2">
                    {dayEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIndex * dayEvents.length + index) * 0.03 }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">{getXPSourceIcon(event.source_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getXPSourceLabel(event.source_type)}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-yellow-600">
                            +{event.xp_amount}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
