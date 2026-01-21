import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Trophy, Award, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPORT_TEMPLATES } from '@/types/socialExport';

interface TemplateSelectorProps {
  onSelectTemplate: (metricIds: string[]) => void;
  language?: 'cs' | 'en';
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
};

export function TemplateSelector({ onSelectTemplate, language = 'cs' }: TemplateSelectorProps) {
  const isCs = language === 'cs';

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-3">
          {isCs ? 'Rychlé šablony' : 'Quick Templates'}
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {EXPORT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1.5 text-left"
              onClick={() => onSelectTemplate(template.metrics)}
            >
              <div className="flex items-center gap-2 text-primary">
                {ICON_MAP[template.icon]}
                <span className="font-medium text-sm">
                  {isCs ? template.name : template.nameEn}
                </span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {isCs ? template.description : template.descriptionEn}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
