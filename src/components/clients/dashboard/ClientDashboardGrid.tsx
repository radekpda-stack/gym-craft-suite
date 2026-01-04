/**
 * ClientDashboardGrid Component
 * 
 * Grid layout for dashboard cards with intelligent sorting based on usage.
 * 2 columns on desktop, 1 column on mobile.
 */
import { ReactNode, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useSectionUsage, getSortedGroups, getMostUsedGroup } from '@/hooks/useSectionUsage';

interface DashboardCard {
  id: string;
  component: ReactNode;
}

interface ClientDashboardGridProps {
  clientId: string;
  cards: DashboardCard[];
  className?: string;
}

export function ClientDashboardGrid({
  clientId,
  cards,
  className,
}: ClientDashboardGridProps) {
  const { data: usageData = [] } = useSectionUsage(clientId);
  
  // Get sorted order based on usage
  const sortedCardIds = useMemo(() => getSortedGroups(usageData), [usageData]);
  const mostUsedId = useMemo(() => getMostUsedGroup(usageData), [usageData]);

  // Sort cards according to usage
  const sortedCards = useMemo(() => {
    const cardMap = new Map(cards.map(c => [c.id, c]));
    
    // First add cards in sorted order
    const sorted = sortedCardIds
      .map(id => cardMap.get(id))
      .filter((c): c is DashboardCard => !!c);
    
    // Add remaining cards that weren't in usage data
    const addedIds = new Set(sorted.map(c => c.id));
    cards.forEach(card => {
      if (!addedIds.has(card.id)) {
        sorted.push(card);
      }
    });
    
    return sorted;
  }, [cards, sortedCardIds]);

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 gap-3',
      className
    )}>
      {sortedCards.map((card) => (
        <div key={card.id} data-card-id={card.id}>
          {card.component}
        </div>
      ))}
    </div>
  );
}
