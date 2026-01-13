import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Lock, Check, Sparkles, Info } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useBadgeDefinitions, useClientBadges, BadgeDefinition } from '@/hooks/useClientGamification';
import { XPHistoryCard } from '@/components/client-portal/gamification/XPHistoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { getBadgeIcon } from '@/hooks/useBadgeNotifications';

// Use shared badge icons from hook
const badgeIcons = getBadgeIcon;

interface BadgeCardProps {
  definition: BadgeDefinition;
  earned: boolean;
  earnedAt?: string | null;
  progressCurrent?: number;
  progressTarget?: number;
}

function BadgeCard({ definition, earned, earnedAt, progressCurrent = 0, progressTarget = 1 }: BadgeCardProps) {
  const progressPercent = Math.min((progressCurrent / progressTarget) * 100, 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-4 rounded-2xl border-2 transition-all duration-300",
        earned 
          ? "bg-card border-primary/30" 
          : "bg-muted/30 border-muted opacity-60"
      )}
    >
      {/* Badge Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3",
        earned ? "bg-primary/10" : "bg-muted"
      )}>
        {earned ? (
          <span>{badgeIcons(definition.icon_key)}</span>
        ) : (
          <Lock className="w-6 h-6 text-muted-foreground/50" />
        )}
      </div>
      
      {/* Badge Info */}
      <div className="text-center space-y-1">
        <h3 className={cn(
          "font-semibold text-sm",
          !earned && "text-muted-foreground"
        )}>
          {definition.name}
        </h3>
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {definition.description}
        </p>
      </div>
      
      {/* Progress or Earned Date */}
      {earned ? (
        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-primary">
          <Check className="w-3 h-3" />
          <span>
            {earnedAt 
              ? format(parseISO(earnedAt), 'd. M. yyyy', { locale: cs })
              : 'Získáno'
            }
          </span>
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary/50 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.2, duration: 0.5 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {progressCurrent}/{progressTarget}
          </p>
        </div>
      )}
      
      {/* Earned indicator */}
      {earned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export default function ClientPortalBadges() {
  const { clientId } = useClientPortal();
  const { data: definitions, isLoading: definitionsLoading } = useBadgeDefinitions();
  const { data: clientBadges, isLoading: badgesLoading } = useClientBadges(clientId ?? undefined);
  
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  
  const isLoading = definitionsLoading || badgesLoading;
  
  // Merge definitions with client progress
  const badges = definitions?.map(def => {
    const clientBadge = clientBadges?.find(cb => cb.badge_id === def.id);
    return {
      definition: def,
      earned: !!clientBadge?.earned_at,
      earnedAt: clientBadge?.earned_at,
      progressCurrent: clientBadge?.progress_current ?? 0,
      progressTarget: clientBadge?.progress_target ?? (def.rule_value as any)?.count ?? 1,
    };
  }) ?? [];
  
  // Apply filters - simplified (removed rarity filter)
  const filteredBadges = badges.filter(b => {
    if (filter === 'earned' && !b.earned) return false;
    if (filter === 'locked' && b.earned) return false;
    return true;
  });
  
  // Stats
  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Odznaky</h1>
            <p className="text-sm text-muted-foreground">
              {earnedCount} z {totalCount} získáno
            </p>
          </div>
        </div>
        
        {earnedCount > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{Math.round((earnedCount / totalCount) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Explanation for new users */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Odznaky získáváš za své úspěchy - pravidelné tréninky, osobní rekordy a splněné výzvy. Sbírej je všechny!
          </p>
        </div>
      </div>

      {/* XP History */}
      <XPHistoryCard limit={5} className="bg-gradient-to-br from-warning/10 via-background to-warning/5 border-warning/20" />
      
      {/* Filters - Simplified */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Vše</TabsTrigger>
          <TabsTrigger value="earned" className="flex-1">Získané</TabsTrigger>
          <TabsTrigger value="locked" className="flex-1">Nezískané</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === 'earned' 
                ? 'Zatím nemáš žádné odznaky' 
                : filter === 'locked'
                ? 'Všechny odznaky máš! 🎉'
                : 'Žádné odznaky nenalezeny'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.definition.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <BadgeCard
                  definition={badge.definition}
                  earned={badge.earned}
                  earnedAt={badge.earnedAt}
                  progressCurrent={badge.progressCurrent}
                  progressTarget={badge.progressTarget}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
