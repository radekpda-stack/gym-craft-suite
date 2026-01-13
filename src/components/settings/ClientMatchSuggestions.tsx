import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Sparkles, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MatchSuggestion {
  client_id: string;
  name: string;
  score: number;
  match_type: 'exact_full' | 'exact_first' | 'exact_last' | 'nickname' | 'alias' | 'fuzzy';
}

interface ClientMatchSuggestionsProps {
  suggestions: MatchSuggestion[];
  onSelect: (clientId: string) => void;
  onLearn?: (clientId: string) => void;
  showLearnButton?: boolean;
  disabled?: boolean;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  'exact_full': 'Celé jméno',
  'exact_first': 'Křestní jméno',
  'exact_last': 'Příjmení',
  'nickname': 'Přezdívka',
  'alias': 'Naučený vzor',
  'fuzzy': 'Podobnost',
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success bg-success/10 border-success/30';
  if (score >= 70) return 'text-warning bg-warning/10 border-warning/30';
  return 'text-muted-foreground bg-muted/50 border-border';
}

export function ClientMatchSuggestions({
  suggestions,
  onSelect,
  onLearn,
  showLearnButton = true,
  disabled = false,
}: ClientMatchSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const topSuggestions = suggestions.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5">
      {topSuggestions.map((suggestion, index) => (
        <Tooltip key={suggestion.client_id}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-colors hover:bg-primary/10 gap-1.5 pr-1",
                getScoreColor(suggestion.score),
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onSelect(suggestion.client_id)}
            >
              <span className="font-medium">{suggestion.name}</span>
              <span className="text-xs opacity-70">{suggestion.score}%</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-0.5 hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(suggestion.client_id);
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="text-xs">
              <p className="font-medium">{MATCH_TYPE_LABELS[suggestion.match_type] || suggestion.match_type}</p>
              <p className="text-muted-foreground">Shoda: {suggestion.score}%</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
      
      {showLearnButton && onLearn && topSuggestions.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onLearn(topSuggestions[0].client_id)}
              disabled={disabled}
            >
              <GraduationCap className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Naučit se tento vzor</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
