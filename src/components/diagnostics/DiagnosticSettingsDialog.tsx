import { useState } from 'react';
import { Settings2, Loader2, Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface DiagnosticSection {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  user_id: string | null;
}

interface DiagnosticQuestion {
  id: string;
  section_id: string;
  question_text: string;
  question_text_en: string | null;
  question_type: string;
  options: string[] | null;
  help_text: string | null;
  is_required: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
  min_value: number | null;
  max_value: number | null;
  unit: string | null;
}

interface DiagnosticSettingsDialogProps {
  trigger?: React.ReactNode;
}

export function DiagnosticSettingsDialog({ trigger }: DiagnosticSettingsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['diagnostic-sections-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_sections')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DiagnosticSection[];
    },
    enabled: open,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['diagnostic-questions-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_questions')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DiagnosticQuestion[];
    },
    enabled: open,
  });

  const updateSection = useMutation({
    mutationFn: async (section: Partial<DiagnosticSection> & { id: string }) => {
      const { error } = await supabase
        .from('diagnostic_sections')
        .update(section)
        .eq('id', section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-sections-settings'] });
      toast.success('Sekce aktualizována');
    },
    onError: () => {
      toast.error('Chyba při ukládání sekce');
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async (question: Partial<DiagnosticQuestion> & { id: string }) => {
      const { error } = await supabase
        .from('diagnostic_questions')
        .update(question)
        .eq('id', question.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-questions-settings'] });
      toast.success('Otázka aktualizována');
    },
    onError: () => {
      toast.error('Chyba při ukládání otázky');
    },
  });

  const addQuestion = useMutation({
    mutationFn: async ({ sectionId, sortOrder }: { sectionId: string; sortOrder: number }) => {
      const { error } = await supabase.from('diagnostic_questions').insert({
        section_id: sectionId,
        question_text: 'Nová otázka',
        question_text_en: 'New question',
        question_type: 'text',
        is_active: true,
        sort_order: sortOrder,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-questions-settings'] });
      toast.success('Otázka přidána');
    },
    onError: () => {
      toast.error('Chyba při přidávání otázky');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('diagnostic_questions')
        .delete()
        .eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-questions-settings'] });
      toast.success('Otázka smazána');
    },
    onError: () => {
      toast.error('Chyba při mazání otázky');
    },
  });

  const isLoading = sectionsLoading || questionsLoading;

  const getQuestionsForSection = (sectionId: string) => {
    return questions
      .filter((q) => q.section_id === sectionId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Nastavení dotazníku
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Nastavení diagnostického dotazníku
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upravte sekce a otázky vstupního diagnostického dotazníku pro klienty.
              </p>

              <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections}>
                {sections.map((section) => (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="glass-subtle rounded-xl mb-2 border-0 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={section.is_active ?? true}
                          onCheckedChange={(checked) =>
                            updateSection.mutate({ id: section.id, is_active: checked })
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="text-left flex-1">
                          <p className={cn('font-medium', !section.is_active && 'text-muted-foreground')}>
                            {section.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getQuestionsForSection(section.id).length} otázek
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Section Name Edit */}
                      <div className="grid gap-3 sm:grid-cols-2 mb-4 p-3 rounded-lg bg-secondary/20">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Název sekce (CZ)</Label>
                          <Input
                            value={section.name}
                            onChange={(e) => updateSection.mutate({ id: section.id, name: e.target.value })}
                            className="glass-input h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Název sekce (EN)</Label>
                          <Input
                            value={section.name_en ?? ''}
                            onChange={(e) =>
                              updateSection.mutate({ id: section.id, name_en: e.target.value })
                            }
                            className="glass-input h-9"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label className="text-xs">Popis sekce</Label>
                          <Textarea
                            value={section.description ?? ''}
                            onChange={(e) =>
                              updateSection.mutate({ id: section.id, description: e.target.value })
                            }
                            className="glass-input min-h-[60px] resize-none"
                          />
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-2">
                        {getQuestionsForSection(section.id).map((question) => (
                          <Collapsible key={question.id} className="rounded-lg border border-border bg-card">
                            <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <Switch
                                checked={question.is_active ?? true}
                                onCheckedChange={(checked) =>
                                  updateQuestion.mutate({ id: question.id, is_active: checked })
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span
                                className={cn(
                                  'flex-1 text-left text-sm truncate',
                                  !question.is_active && 'text-muted-foreground'
                                )}
                              >
                                {question.question_text}
                              </span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">
                                {question.question_type}
                              </span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-3 pb-3 pt-1">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Text otázky (CZ)</Label>
                                  <Input
                                    value={question.question_text}
                                    onChange={(e) =>
                                      updateQuestion.mutate({
                                        id: question.id,
                                        question_text: e.target.value,
                                      })
                                    }
                                    className="glass-input h-9"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Text otázky (EN)</Label>
                                  <Input
                                    value={question.question_text_en ?? ''}
                                    onChange={(e) =>
                                      updateQuestion.mutate({
                                        id: question.id,
                                        question_text_en: e.target.value,
                                      })
                                    }
                                    className="glass-input h-9"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Typ otázky</Label>
                                  <Select
                                    value={question.question_type}
                                    onValueChange={(value) =>
                                      updateQuestion.mutate({ id: question.id, question_type: value })
                                    }
                                  >
                                    <SelectTrigger className="glass-input h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="select">Výběr</SelectItem>
                                      <SelectItem value="multiselect">Vícenásobný výběr</SelectItem>
                                      <SelectItem value="scale">Škála</SelectItem>
                                      <SelectItem value="number">Číslo</SelectItem>
                                      <SelectItem value="boolean">Ano/Ne</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Nápověda</Label>
                                  <Input
                                    value={question.help_text ?? ''}
                                    onChange={(e) =>
                                      updateQuestion.mutate({ id: question.id, help_text: e.target.value })
                                    }
                                    placeholder="Volitelná nápověda pro klienta"
                                    className="glass-input h-9"
                                  />
                                </div>
                                {(question.question_type === 'select' ||
                                  question.question_type === 'multiselect') && (
                                  <div className="sm:col-span-2 space-y-1.5">
                                    <Label className="text-xs">Možnosti (oddělené čárkou)</Label>
                                    <Input
                                      value={(question.options ?? []).join(', ')}
                                      onChange={(e) =>
                                        updateQuestion.mutate({
                                          id: question.id,
                                          options: e.target.value.split(',').map((o) => o.trim()),
                                        })
                                      }
                                      placeholder="Možnost 1, Možnost 2, Možnost 3"
                                      className="glass-input h-9"
                                    />
                                  </div>
                                )}
                                {question.question_type === 'scale' && (
                                  <>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Min hodnota</Label>
                                      <Input
                                        type="number"
                                        value={question.min_value ?? 1}
                                        onChange={(e) =>
                                          updateQuestion.mutate({
                                            id: question.id,
                                            min_value: parseInt(e.target.value),
                                          })
                                        }
                                        className="glass-input h-9"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Max hodnota</Label>
                                      <Input
                                        type="number"
                                        value={question.max_value ?? 10}
                                        onChange={(e) =>
                                          updateQuestion.mutate({
                                            id: question.id,
                                            max_value: parseInt(e.target.value),
                                          })
                                        }
                                        className="glass-input h-9"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex justify-end mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteQuestion.mutate(question.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Smazat
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={() =>
                          addQuestion.mutate({
                            sectionId: section.id,
                            sortOrder: getQuestionsForSection(section.id).length + 1,
                          })
                        }
                      >
                        <Plus className="w-4 h-4" />
                        Přidat otázku
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
