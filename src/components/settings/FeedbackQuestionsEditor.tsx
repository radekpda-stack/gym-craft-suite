import { useState } from 'react';
import { Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeedbackQuestionnairePreview } from './FeedbackQuestionnairePreview';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export interface FeedbackQuestion {
  id: string;
  type: 'slider';
  label: string;
  emoji: string;
  minLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  defaultValue: number;
  enabled: boolean;
  order: number;
  helpText?: string;
  showPainAreas?: boolean;
  painAreaThreshold?: number;
}

export interface PainArea {
  id: string;
  label: string;
  enabled: boolean;
}

export interface FeedbackQuestionsConfig {
  questions: FeedbackQuestion[];
  painAreas: PainArea[];
  noteEnabled: boolean;
  noteMaxLength: number;
}

interface FeedbackQuestionsEditorProps {
  config: FeedbackQuestionsConfig;
  onChange: (config: FeedbackQuestionsConfig) => void;
}

function SortableQuestionItem({ 
  question, 
  onUpdate, 
  onDelete,
  canDelete 
}: { 
  question: FeedbackQuestion; 
  onUpdate: (q: FeedbackQuestion) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <AccordionItem value={question.id} className="border-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          <Switch
            checked={question.enabled}
            onCheckedChange={(enabled) => onUpdate({ ...question, enabled })}
          />
          
          <span className="text-xl">{question.emoji}</span>
          
          <AccordionTrigger className="flex-1 py-0 hover:no-underline">
            <span className={cn(!question.enabled && "text-muted-foreground")}>
              {question.label}
            </span>
          </AccordionTrigger>
          
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <AccordionContent className="px-4 pb-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input
                value={question.emoji}
                onChange={(e) => onUpdate({ ...question, emoji: e.target.value })}
                className="glass-input"
                maxLength={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Název otázky</Label>
              <Input
                value={question.label}
                onChange={(e) => onUpdate({ ...question, label: e.target.value })}
                className="glass-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Popis pro minimum ({question.min})</Label>
              <Input
                value={question.minLabel}
                onChange={(e) => onUpdate({ ...question, minLabel: e.target.value })}
                className="glass-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Popis pro maximum ({question.max})</Label>
              <Input
                value={question.maxLabel}
                onChange={(e) => onUpdate({ ...question, maxLabel: e.target.value })}
                className="glass-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Výchozí hodnota</Label>
              <Input
                type="number"
                min={question.min}
                max={question.max}
                value={question.defaultValue}
                onChange={(e) => onUpdate({ ...question, defaultValue: parseInt(e.target.value) || question.min })}
                className="glass-input"
              />
            </div>
            
            {question.id === 'pain' && (
              <div className="space-y-2">
                <Label>Zobrazit oblasti bolesti od hodnoty</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={question.painAreaThreshold || 4}
                  onChange={(e) => onUpdate({ ...question, painAreaThreshold: parseInt(e.target.value) || 4 })}
                  className="glass-input"
                />
              </div>
            )}
          </div>
          
          {/* Help text field */}
          <div className="mt-4 space-y-2">
            <Label>Nápověda pro klienta</Label>
            <Textarea
              value={question.helpText || ''}
              onChange={(e) => onUpdate({ ...question, helpText: e.target.value })}
              placeholder="Vysvětlete klientovi, co tato položka znamená a jak ji hodnotit..."
              className="glass-input min-h-[80px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(question.helpText || '').length}/200
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

export function FeedbackQuestionsEditor({ config, onChange }: FeedbackQuestionsEditorProps) {
  const [showPainAreas, setShowPainAreas] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedQuestions = [...config.questions].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedQuestions.findIndex((q) => q.id === active.id);
      const newIndex = sortedQuestions.findIndex((q) => q.id === over.id);

      const newQuestions = arrayMove(sortedQuestions, oldIndex, newIndex).map((q, index) => ({
        ...q,
        order: index,
      }));

      onChange({ ...config, questions: newQuestions });
    }
  };

  const updateQuestion = (updated: FeedbackQuestion) => {
    onChange({
      ...config,
      questions: config.questions.map((q) => (q.id === updated.id ? updated : q)),
    });
  };

  const deleteQuestion = (id: string) => {
    onChange({
      ...config,
      questions: config.questions.filter((q) => q.id !== id),
    });
  };

  const addQuestion = () => {
    const newId = `custom_${Date.now()}`;
    const newQuestion: FeedbackQuestion = {
      id: newId,
      type: 'slider',
      label: 'Nová otázka',
      emoji: '❓',
      minLabel: 'Minimum',
      maxLabel: 'Maximum',
      min: 1,
      max: 10,
      defaultValue: 5,
      enabled: true,
      order: config.questions.length,
    };
    onChange({ ...config, questions: [...config.questions, newQuestion] });
  };

  const updatePainArea = (id: string, enabled: boolean) => {
    onChange({
      ...config,
      painAreas: config.painAreas.map((area) =>
        area.id === id ? { ...area, enabled } : area
      ),
    });
  };

  const updatePainAreaLabel = (id: string, label: string) => {
    onChange({
      ...config,
      painAreas: config.painAreas.map((area) =>
        area.id === id ? { ...area, label } : area
      ),
    });
  };

  const addPainArea = () => {
    const newId = `custom_area_${Date.now()}`;
    onChange({
      ...config,
      painAreas: [...config.painAreas, { id: newId, label: 'Nová oblast', enabled: true }],
    });
  };

  const deletePainArea = (id: string) => {
    onChange({
      ...config,
      painAreas: config.painAreas.filter((area) => area.id !== id),
    });
  };

  // Core questions that cannot be deleted (for backend compatibility)
  const coreQuestionIds = ['soreness', 'body_feel', 'energy', 'pain', 'session_fit', 'difficulty', 'fun'];

  return (
    <div className="space-y-6">
      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground">Otázky v dotazníku</Label>
            <p className="text-sm text-muted-foreground">
              Přetáhněte pro změnu pořadí, klikněte pro úpravu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackQuestionnairePreview config={config} />
            <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat otázku
            </Button>
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedQuestions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedQuestions.map((question) => (
                <SortableQuestionItem
                  key={question.id}
                  question={question}
                  onUpdate={updateQuestion}
                  onDelete={() => deleteQuestion(question.id)}
                  canDelete={!coreQuestionIds.includes(question.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Accordion>
      </div>

      {/* Pain Areas Section */}
      <Card className="glass-subtle border-0">
        <CardContent className="pt-4">
          <button
            onClick={() => setShowPainAreas(!showPainAreas)}
            className="flex items-center justify-between w-full"
          >
            <div>
              <Label className="text-foreground cursor-pointer">Oblasti bolesti</Label>
              <p className="text-sm text-muted-foreground">
                Možnosti výběru při vysoké bolesti
              </p>
            </div>
            {showPainAreas ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showPainAreas && (
            <div className="mt-4 space-y-3">
              {config.painAreas.map((area) => (
                <div key={area.id} className="flex items-center gap-3">
                  <Switch
                    checked={area.enabled}
                    onCheckedChange={(enabled) => updatePainArea(area.id, enabled)}
                  />
                  <Input
                    value={area.label}
                    onChange={(e) => updatePainAreaLabel(area.id, e.target.value)}
                    className="glass-input flex-1"
                  />
                  {!['knee', 'back', 'shoulder', 'hip', 'ankle', 'wrist', 'neck', 'other'].includes(area.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deletePainArea(area.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPainArea} className="gap-2 mt-2">
                <Plus className="w-4 h-4" />
                Přidat oblast
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Section */}
      <div className="flex items-center justify-between p-4 rounded-xl glass-subtle">
        <div>
          <Label className="text-foreground">Poznámka (volitelná)</Label>
          <p className="text-sm text-muted-foreground">
            Povolit klientovi přidat textovou poznámku
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={config.noteMaxLength}
            onChange={(e) => onChange({ ...config, noteMaxLength: parseInt(e.target.value) || 200 })}
            className="glass-input w-20"
            min={50}
            max={500}
          />
          <span className="text-sm text-muted-foreground">znaků</span>
          <Switch
            checked={config.noteEnabled}
            onCheckedChange={(noteEnabled) => onChange({ ...config, noteEnabled })}
          />
        </div>
      </div>
    </div>
  );
}
