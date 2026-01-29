import { LucideIcon } from 'lucide-react';
import { UnifiedKPICard, KPIVariant } from './UnifiedKPICard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export interface KPICardConfig {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: KPIVariant;
  subLabel?: string;
}

interface UnifiedKPICardsProps {
  cards: KPICardConfig[];
  activeId?: string;
  onCardClick?: (id: string) => void;
  isLoading?: boolean;
  columns?: 2 | 3 | 4 | 5;
}

export function UnifiedKPICards({
  cards,
  activeId,
  onCardClick,
  isLoading,
  columns = 4,
}: UnifiedKPICardsProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-3`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {cards.map((card) => (
        <UnifiedKPICard
          key={card.id}
          {...card}
          isActive={activeId === card.id}
          onClick={onCardClick ? () => onCardClick(card.id) : undefined}
        />
      ))}
    </div>
  );
}
