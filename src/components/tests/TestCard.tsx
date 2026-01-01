import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Dumbbell, Heart, Move, Timer } from 'lucide-react';
import type { TestDefinition, TestDueStatus } from '@/types/tests';
import { cn, formatDuration } from '@/lib/utils';

interface TestCardProps {
  definition: TestDefinition;
  stats?: {
    dueStatus: TestDueStatus;
    lastDate: string | null;
    totalSessions: number;
  };
  onClick: () => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  cardio: Heart,
  strength: Dumbbell,
  endurance: Timer,
  grip_core: Activity,
  mobility: Move,
};

const dueStatusConfig: Record<TestDueStatus, { label: string; className: string }> = {
  due: { label: 'Splatné', className: 'bg-destructive text-destructive-foreground' },
  soon: { label: 'Brzy', className: 'bg-yellow-500 text-white' },
  ok: { label: 'OK', className: 'bg-green-500 text-white' },
};

export function TestCard({ definition, stats, onClick }: TestCardProps) {
  const Icon = categoryIcons[definition.category] || Activity;
  const dueStatus = stats?.dueStatus || 'ok';
  const config = dueStatusConfig[dueStatus];

  const formatLastDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nikdy';
    const date = new Date(dateStr);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Dnes';
    if (days === 1) return 'Včera';
    return `Před ${days} dny`;
  };

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]',
        dueStatus === 'due' && 'border-destructive/50',
        dueStatus === 'soon' && 'border-yellow-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <Badge className={config.className} variant="secondary">
            {config.label}
          </Badge>
        </div>

        <div>
          <h3 className="font-semibold text-sm line-clamp-2">
            {definition.name_cs || definition.name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatLastDate(stats?.lastDate || null)}</span>
          <span>{stats?.totalSessions || 0}×</span>
        </div>
      </CardContent>
    </Card>
  );
}
