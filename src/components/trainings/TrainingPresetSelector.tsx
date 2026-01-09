import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useTrainingPresets, useCreateTrainingPreset, useDeleteTrainingPreset, type TrainingPreset } from '@/hooks/useTrainingPresets';
import { useTags } from '@/hooks/useTags';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TrainingPresetSelectorProps {
  clientId?: string;
  onApplyPreset: (preset: {
    trainingType: string | null;
    focusTagIds: string[];
    intensityTagId: string | null;
    bodyPartTagIds: string[];
    defaultRPE: number | null;
  }) => void;
  // Pro vytvoření nové sady z aktuálního stavu
  currentState?: {
    trainingType: string | null;
    focusTagIds: string[];
    intensityTagId: string | null;
    bodyPartTagIds: string[];
    coachRPE: number | null;
  };
  className?: string;
}

const PRESET_ICONS = ['💪', '🔥', '🏃', '🧘', '⚡', '❤️', '🎯', '🌿'];

export function TrainingPresetSelector({
  clientId,
  onApplyPreset,
  currentState,
  className,
}: TrainingPresetSelectorProps) {
  const { data: presets = [], isLoading } = useTrainingPresets(clientId);
  const { data: tags = [] } = useTags();
  const createPreset = useCreateTrainingPreset();
  const deletePreset = useDeleteTrainingPreset();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💪');
  const [presetToDelete, setPresetToDelete] = useState<TrainingPreset | null>(null);

  const handleApply = (preset: TrainingPreset) => {
    onApplyPreset({
      trainingType: preset.training_type,
      focusTagIds: preset.focus_tag_ids,
      intensityTagId: preset.intensity_tag_id,
      bodyPartTagIds: preset.body_part_tag_ids,
      defaultRPE: preset.default_rpe,
    });
  };

  const handleCreate = async () => {
    if (!newPresetName.trim() || !currentState) return;

    await createPreset.mutateAsync({
      name: newPresetName.trim(),
      icon: selectedIcon,
      training_type: currentState.trainingType || undefined,
      focus_tag_ids: currentState.focusTagIds,
      intensity_tag_id: currentState.intensityTagId || undefined,
      body_part_tag_ids: currentState.bodyPartTagIds,
      default_rpe: currentState.coachRPE || undefined,
      is_global: true,
      client_id: clientId,
    });

    setNewPresetName('');
    setSelectedIcon('💪');
    setIsCreateOpen(false);
  };

  const handleDelete = async () => {
    if (!presetToDelete) return;
    await deletePreset.mutateAsync(presetToDelete.id);
    setPresetToDelete(null);
  };

  // Získat popisky pro preset
  const getPresetDescription = (preset: TrainingPreset) => {
    const parts: string[] = [];

    if (preset.training_type) {
      const typeLabels: Record<string, string> = {
        strength: 'Silový',
        conditioning: 'Kondiční',
        hiit: 'HIIT',
        cardio: 'Kardio',
        running: 'Běh',
        functional: 'Funkční',
        mobility: 'Mobilita',
        regeneration: 'Regenerace',
        diagnostic: 'Diagnostický',
        other: 'Jiný',
      };
      parts.push(typeLabels[preset.training_type] || preset.training_type);
    }

    if (preset.focus_tag_ids.length > 0) {
      const focusNames = preset.focus_tag_ids
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .slice(0, 2);
      if (focusNames.length > 0) parts.push(focusNames.join(', '));
    }

    if (preset.intensity_tag_id) {
      const intensity = tags.find((t) => t.id === preset.intensity_tag_id);
      if (intensity) parts.push(intensity.name);
    }

    return parts.join(' • ') || 'Prázdná sada';
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 py-2', className)}>
        <Sparkles className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Načítání sad...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Rychlé sady</span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => handleApply(preset)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border bg-card',
                  'hover:bg-accent hover:border-primary/50 transition-colors',
                  'min-w-[140px] max-w-[180px] text-left'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{preset.icon || '📋'}</span>
                  <span className="font-medium text-sm truncate">{preset.name}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {getPresetDescription(preset)}
                </span>
              </button>
              
              {/* Delete button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPresetToDelete(preset);
                }}
                className={cn(
                  'absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:scale-110'
                )}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Create new preset button */}
          {currentState && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-dashed',
                    'hover:bg-accent hover:border-primary/50 transition-colors',
                    'min-w-[100px] min-h-[70px] text-muted-foreground'
                  )}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Nová sada</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vytvořit rychlou sadu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Název sady</Label>
                    <Input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Např. Silový fullbody"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ikona</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setSelectedIcon(icon)}
                          className={cn(
                            'w-10 h-10 rounded-lg text-xl flex items-center justify-center',
                            'border-2 transition-colors',
                            selectedIcon === icon
                              ? 'border-primary bg-primary/10'
                              : 'border-muted hover:border-primary/50'
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Uloží se aktuální nastavení:</p>
                    <p className="text-muted-foreground">
                      {currentState.trainingType && `Typ: ${currentState.trainingType}`}
                      {currentState.focusTagIds.length > 0 && ` • ${currentState.focusTagIds.length} zaměření`}
                      {currentState.intensityTagId && ' • Intenzita'}
                      {currentState.bodyPartTagIds.length > 0 && ` • ${currentState.bodyPartTagIds.length} partií`}
                      {currentState.coachRPE && ` • RPE ${currentState.coachRPE}`}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Zrušit
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newPresetName.trim() || createPreset.isPending}
                  >
                    Vytvořit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Delete confirmation */}
      <AlertDialog open={!!presetToDelete} onOpenChange={() => setPresetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat rychlou sadu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat sadu "{presetToDelete?.name}"? Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
