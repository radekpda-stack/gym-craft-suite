import { useState, useEffect } from 'react';
import { useTrainingTemplates, TrainingTemplate } from '@/hooks/useTrainingTemplates';
import { useSeedCircuitTemplates } from '@/hooks/useSeedCircuitTemplates';
import { TemplatePreviewCard } from './TemplatePreviewCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Sparkles, RefreshCw, Clock, Target, Zap, RotateCcw, Dumbbell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateSelectorForChallengeProps {
  selectedTemplateId: string | null;
  onSelect: (template: TrainingTemplate | null) => void;
}

export function TemplateSelectorForChallenge({ 
  selectedTemplateId, 
  onSelect 
}: TemplateSelectorForChallengeProps) {
  const { data: templates = [], isLoading } = useTrainingTemplates();
  const seedTemplates = useSeedCircuitTemplates();
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Auto-seed circuit templates if none exist
  useEffect(() => {
    const circuitTemplates = templates.filter(t => 
      t.workout_format && t.workout_format !== 'standard'
    );
    if (!isLoading && templates.length > 0 && circuitTemplates.length === 0) {
      // Don't auto-seed, let user trigger it
    }
  }, [templates, isLoading]);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !search || 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFormat = formatFilter === 'all' || 
      (formatFilter === 'circuit' && t.workout_format && t.workout_format !== 'standard') ||
      t.workout_format === formatFilter;
    
    return matchesSearch && matchesFormat;
  });

  const circuitTemplates = filteredTemplates.filter(t => 
    t.workout_format && t.workout_format !== 'standard'
  );
  
  const standardTemplates = filteredTemplates.filter(t => 
    !t.workout_format || t.workout_format === 'standard'
  );

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleSeedTemplates = () => {
    seedTemplates.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Propojit s tréninkem</Label>
        {circuitTemplates.length === 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSeedTemplates}
            disabled={seedTemplates.isPending}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {seedTemplates.isPending ? 'Vytvářím...' : 'Přidat vzorové tréninky'}
          </Button>
        )}
      </div>

      {/* Selected template preview */}
      {selectedTemplate && (
        <div className="mb-4">
          <TemplatePreviewCard 
            template={selectedTemplate} 
            selected 
            onSelect={() => onSelect(null)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Kliknutím zrušíte výběr
          </p>
        </div>
      )}

      {!selectedTemplate && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat šablonu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs for circuit vs standard */}
          <Tabs defaultValue="circuit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="circuit" className="gap-1">
                <RefreshCw className="h-4 w-4" />
                Kruhové ({circuitTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="standard" className="gap-1">
                <Dumbbell className="h-4 w-4" />
                Klasické ({standardTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="circuit" className="mt-3">
              {circuitTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">Žádné kruhové tréninky</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSeedTemplates}
                    disabled={seedTemplates.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Vytvořit vzorové tréninky
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {circuitTemplates.map((template) => (
                      <TemplatePreviewCard
                        key={template.id}
                        template={template}
                        compact
                        selected={selectedTemplateId === template.id}
                        onSelect={() => onSelect(template)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="standard" className="mt-3">
              {standardTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Žádné klasické šablony</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {standardTemplates.map((template) => (
                      <TemplatePreviewCard
                        key={template.id}
                        template={template}
                        compact
                        selected={selectedTemplateId === template.id}
                        onSelect={() => onSelect(template)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
