import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recommendation {
  type: 'success' | 'warning' | 'info';
  message: string;
}

interface UsageRecommendationsProps {
  data: Recommendation[];
}

function getRecommendationIcon(type: Recommendation['type']) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'info':
      return <Info className="w-4 h-4 text-accent" />;
  }
}

function getRecommendationStyles(type: Recommendation['type']) {
  switch (type) {
    case 'success':
      return 'bg-success/10 border-success/20';
    case 'warning':
      return 'bg-warning/10 border-warning/20';
    case 'info':
      return 'bg-accent/10 border-accent/20';
  }
}

export function UsageRecommendations({ data }: UsageRecommendationsProps) {
  if (data.length === 0) {
    return null;
  }

  // Sort: success first, then warnings, then info
  const sortedData = [...data].sort((a, b) => {
    const order = { success: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Doporučení
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedData.map((rec, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              getRecommendationStyles(rec.type)
            )}
          >
            <div className="mt-0.5">
              {getRecommendationIcon(rec.type)}
            </div>
            <p className="text-sm text-foreground flex-1">
              {rec.message}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
