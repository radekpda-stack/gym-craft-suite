import {
  AlertTriangle,
  TrendingDown,
  Dumbbell,
  RefreshCw,
  Layers,
  Target,
  Coffee,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { StagnationData, StagnationSuggestion } from '@/hooks/useTrainingAnalytics';

interface StagnationAlertsProps {
  data: StagnationData[];
}

const suggestionIcons = {
  variant: RefreshCw,
  volume: Layers,
  technique: Target,
  deload: Coffee,
};

const priorityStyles = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function StagnationAlerts({ data }: StagnationAlertsProps) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(
    data.length > 0 ? data[0].exerciseName : null
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="glass border-warning/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-warning" />
          Detekována stagnace ({data.length} cviků)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => {
          const isExpanded = expandedExercise === item.exerciseName;

          return (
            <Collapsible
              key={item.exerciseName}
              open={isExpanded}
              onOpenChange={() =>
                setExpandedExercise(isExpanded ? null : item.exerciseName)
              }
            >
              <div
                className={cn(
                  'rounded-xl border transition-all',
                  isExpanded
                    ? 'bg-warning/10 border-warning/30'
                    : 'bg-secondary/30 border-transparent hover:border-warning/20'
                )}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/20">
                        <Dumbbell className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-medium">{item.exerciseName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Stagnace {item.weeksStagnant} týdnů
                          {item.currentValue > 0 && ` • ${item.currentValue} kg`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        {item.suggestions.length} návrhy
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-sm font-medium mb-3 text-muted-foreground">
                        Doporučené kroky:
                      </p>
                      <div className="space-y-2">
                        {item.suggestions.map((suggestion, idx) => (
                          <SuggestionCard key={idx} suggestion={suggestion} />
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion }: { suggestion: StagnationSuggestion }) {
  const Icon = suggestionIcons[suggestion.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        priorityStyles[suggestion.priority]
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-sm">{suggestion.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{suggestion.description}</p>
      </div>
      {suggestion.priority === 'high' && (
        <Badge className="ml-auto text-xs bg-red-500/30 text-red-300 border-red-500/50">
          Priorita
        </Badge>
      )}
    </div>
  );
}
