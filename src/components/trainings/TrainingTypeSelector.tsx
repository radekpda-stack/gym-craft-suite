import { useState } from 'react';
import { TRAINING_TYPES, TrainingType } from '@/hooks/useTrainingProgress';
import { useCustomTrainingTypes, useCreateCustomTrainingType } from '@/hooks/useCustomTrainingTypes';
import { cn } from '@/lib/utils';
import { 
  Dumbbell, 
  Activity, 
  PersonStanding, 
  Leaf, 
  MoreHorizontal,
  Zap,
  Heart,
  Move,
  Expand,
  Target,
  ClipboardCheck,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TrainingTypeSelectorProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const typeIcons: Record<TrainingType, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  conditioning: Activity,
  hiit: Zap,
  cardio: Heart,
  running: PersonStanding,
  mobility: Move,
  flexibility: Expand,
  regeneration: Leaf,
  functional: Target,
  diagnostic: ClipboardCheck,
  other: MoreHorizontal,
};

const CUSTOM_COLORS = [
  { value: 'bg-slate-500', label: 'Šedá' },
  { value: 'bg-red-500', label: 'Červená' },
  { value: 'bg-orange-500', label: 'Oranžová' },
  { value: 'bg-amber-500', label: 'Jantarová' },
  { value: 'bg-lime-500', label: 'Limetková' },
  { value: 'bg-emerald-500', label: 'Smaragdová' },
  { value: 'bg-cyan-500', label: 'Tyrkysová' },
  { value: 'bg-blue-500', label: 'Modrá' },
  { value: 'bg-violet-500', label: 'Fialová' },
  { value: 'bg-pink-500', label: 'Růžová' },
];

export function TrainingTypeSelector({ value, onChange, disabled }: TrainingTypeSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedColor, setSelectedColor] = useState('bg-slate-500');
  
  const { data: customTypes = [] } = useCustomTrainingTypes();
  const createCustomType = useCreateCustomTrainingType();

  const handleOtherClick = () => {
    setDialogOpen(true);
  };

  const handleAddCustomType = async () => {
    if (!newTypeName.trim()) return;
    
    try {
      const result = await createCustomType.mutateAsync({ 
        name: newTypeName.trim(),
        color: selectedColor 
      });
      // Select the newly created type
      onChange(`custom:${result.id}`);
      setDialogOpen(false);
      setNewTypeName('');
      setSelectedColor('bg-slate-500');
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleSelectCustomType = (customTypeId: string) => {
    onChange(`custom:${customTypeId}`);
  };

  // Check if current value is a custom type
  const isCustomSelected = value?.startsWith('custom:');
  const selectedCustomId = isCustomSelected ? value?.replace('custom:', '') : null;
  const selectedCustomType = customTypes.find(ct => ct.id === selectedCustomId);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Built-in types (except "other") */}
        {(Object.keys(TRAINING_TYPES) as TrainingType[])
          .filter(type => type !== 'other')
          .map((type) => {
            const config = TRAINING_TYPES[type];
            const Icon = typeIcons[type];
            const isSelected = value === type;

            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onChange(type)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  "border",
                  isSelected
                    ? cn(config.color, "text-white border-transparent")
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </button>
            );
          })}

        {/* Custom types */}
        {customTypes.map((customType) => {
          const isSelected = selectedCustomId === customType.id;
          return (
            <button
              key={customType.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectCustomType(customType.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                "border",
                isSelected
                  ? cn(customType.color, "text-white border-transparent")
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{customType.name}</span>
            </button>
          );
        })}

        {/* "Jiný" button - opens dialog to add new type */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleOtherClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            "border",
            "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>Jiný</span>
          <Plus className="w-3 h-3 ml-1" />
        </button>
      </div>

      {/* Dialog for adding new custom type */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Přidat vlastní typ tréninku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="typeName">Název typu</Label>
              <Input
                id="typeName"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="např. Plavání, Box, Jóga..."
                className="bg-secondary border-border"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomType();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Barva</Label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.value,
                      selectedColor === color.value 
                        ? "ring-2 ring-offset-2 ring-primary ring-offset-background" 
                        : "hover:scale-110"
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            {/* Preview */}
            {newTypeName.trim() && (
              <div className="space-y-2">
                <Label>Náhled</Label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white",
                    selectedColor
                  )}>
                    {newTypeName.trim()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleAddCustomType}
              disabled={!newTypeName.trim() || createCustomType.isPending}
            >
              {createCustomType.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat typ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TrainingTypeBadge({ type }: { type?: string | null }) {
  const { data: customTypes = [] } = useCustomTrainingTypes();
  
  // Check if it's a custom type
  if (type?.startsWith('custom:')) {
    const customId = type.replace('custom:', '');
    const customType = customTypes.find(ct => ct.id === customId);
    if (customType) {
      return (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
          customType.color
        )}>
          {customType.name}
        </span>
      );
    }
  }
  
  const trainingType = (type || 'other') as TrainingType;
  const config = TRAINING_TYPES[trainingType] || TRAINING_TYPES.other;
  const Icon = typeIcons[trainingType] || typeIcons.other;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white",
      config.color
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
