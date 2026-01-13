import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CATEGORY_LABELS } from '@/hooks/useFeatureStats';

interface FeatureItem {
  name: string;
  label: string;
  category: string;
  count: number;
}

interface TopFeaturesTableProps {
  topFeatures: FeatureItem[];
  leastUsedFeatures: FeatureItem[];
}

export function TopFeaturesTable({ topFeatures, leastUsedFeatures }: TopFeaturesTableProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            Nejpoužívanější funkce
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Žádná data k zobrazení
            </p>
          ) : (
            <div className="space-y-2">
              {topFeatures.slice(0, 8).map((feature, index) => (
                <div
                  key={feature.name}
                  className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <span className="text-sm truncate">{feature.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[feature.category] || feature.category}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums w-12 text-right">
                      {feature.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Least Used Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-warning" />
            Nejméně používané funkce
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leastUsedFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Žádná data k zobrazení
            </p>
          ) : (
            <div className="space-y-2">
              {leastUsedFeatures.slice(0, 8).map((feature, index) => (
                <div
                  key={feature.name}
                  className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <span className="text-sm truncate">{feature.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[feature.category] || feature.category}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums w-12 text-right text-muted-foreground">
                      {feature.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
