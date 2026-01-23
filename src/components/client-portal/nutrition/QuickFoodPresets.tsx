import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FoodPreset {
  description: string;
  icon: string;
  portion_size: 'small' | 'medium' | 'large';
}

export const BREAKFAST_PRESETS: FoodPreset[] = [
  { description: 'Ovesná kaše s ovocem', icon: '🥣', portion_size: 'medium' },
  { description: 'Míchaná vajíčka', icon: '🍳', portion_size: 'medium' },
  { description: 'Jogurt s müsli', icon: '🥛', portion_size: 'medium' },
  { description: 'Pečivo s máslem', icon: '🥐', portion_size: 'medium' },
  { description: 'Cottage cheese', icon: '🧀', portion_size: 'medium' },
];

export const LUNCH_PRESETS: FoodPreset[] = [
  { description: 'Kuřecí prsa s rýží', icon: '🍗', portion_size: 'medium' },
  { description: 'Těstoviny s omáčkou', icon: '🍝', portion_size: 'medium' },
  { description: 'Salát se zeleninou', icon: '🥗', portion_size: 'medium' },
  { description: 'Polévka', icon: '🍲', portion_size: 'medium' },
];

export const SNACK_PRESETS: FoodPreset[] = [
  { description: 'Jablko', icon: '🍎', portion_size: 'small' },
  { description: 'Banán', icon: '🍌', portion_size: 'small' },
  { description: 'Ořechy', icon: '🥜', portion_size: 'small' },
  { description: 'Proteinová tyčinka', icon: '🍫', portion_size: 'small' },
];

interface QuickFoodPresetsProps {
  presets: FoodPreset[];
  onSelect: (preset: FoodPreset) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickFoodPresets({
  presets,
  onSelect,
  disabled,
  className,
}: QuickFoodPresetsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={() => onSelect(preset)}
          disabled={disabled}
          className="h-auto py-1.5 px-2.5 text-xs gap-1.5"
        >
          <span>{preset.icon}</span>
          <span className="truncate max-w-[100px]">{preset.description}</span>
        </Button>
      ))}
    </div>
  );
}
