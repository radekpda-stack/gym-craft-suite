import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MyProfileBadgesProps {
  clientId: string;
}

export function MyProfileBadges({ clientId }: MyProfileBadgesProps) {
  // Get earned badges
  const { data: earnedBadges, isLoading: earnedLoading } = useQuery({
    queryKey: ['my-earned-badges', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_badges')
        .select(`
          *,
          badge:badge_definitions(*)
        `)
        .eq('client_id', clientId)
        .not('earned_at', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Get all badge definitions (for showing locked badges)
  const { data: allBadges, isLoading: allLoading } = useQuery({
    queryKey: ['all-badge-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = earnedLoading || allLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  const earnedIds = new Set(earnedBadges?.map(b => b.badge_id) || []);
  const lockedBadges = allBadges?.filter(b => !earnedIds.has(b.id)) || [];

  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      {earnedBadges && earnedBadges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" />
            Získané odznaky ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {earnedBadges.map((item) => (
              <BadgeCard
                key={item.id}
                badge={item.badge}
                earnedAt={item.earned_at}
                isLocked={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
            <Lock className="w-4 h-4" />
            Zamčené odznaky ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                isLocked={true}
              />
            ))}
          </div>
        </div>
      )}

      {(!earnedBadges || earnedBadges.length === 0) && (!lockedBadges || lockedBadges.length === 0) && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Award className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Zatím nejsou k dispozici žádné odznaky.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BadgeCard({ 
  badge, 
  earnedAt, 
  isLocked 
}: { 
  badge: any; 
  earnedAt?: string | null; 
  isLocked: boolean;
}) {
  const rarityColors: Record<string, string> = {
    common: 'border-muted-foreground/30 bg-muted/50',
    rare: 'border-accent/30 bg-accent/10',
    epic: 'border-primary/30 bg-primary/10',
    legendary: 'border-warning/30 bg-warning/10',
  };

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all',
      isLocked ? 'opacity-50 grayscale' : rarityColors[badge.rarity] || ''
    )}>
      <CardContent className="p-4 text-center">
        <div className="text-3xl mb-2">{badge.icon_key}</div>
        <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2">{badge.description}</p>
        {earnedAt && (
          <p className="text-xs text-primary mt-2">
            {format(new Date(earnedAt), 'd. MMM yyyy', { locale: cs })}
          </p>
        )}
        {isLocked && (
          <Lock className="absolute top-2 right-2 w-4 h-4 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}
