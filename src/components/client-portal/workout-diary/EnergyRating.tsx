import { cn } from '@/lib/utils';

const ENERGY_EMOJIS = [
  { value: 1, emoji: '😩', label: 'Vyčerpaný' },
  { value: 2, emoji: '😔', label: 'Unavený' },
  { value: 3, emoji: '😐', label: 'Neutrální' },
  { value: 4, emoji: '😊', label: 'Dobrý' },
  { value: 5, emoji: '🔥', label: 'Výborný' },
] as const;

interface EnergyRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
}

export function EnergyRating({ value, onChange, label }: EnergyRatingProps) {
  return (
    <div className="space-y-2">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <div className="flex gap-1">
        {ENERGY_EMOJIS.map((energy) => (
          <button
            key={energy.value}
            type="button"
            onClick={() => onChange(energy.value)}
            title={energy.label}
            className={cn(
              "flex-1 p-2 rounded-md text-xl transition-all",
              value === energy.value 
                ? "bg-primary/20 scale-110" 
                : "hover:bg-muted opacity-60 hover:opacity-100"
            )}
          >
            {energy.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EnergyDisplay({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  const energy = ENERGY_EMOJIS.find(e => e.value === value);
  return energy ? <span title={energy.label}>{energy.emoji}</span> : null;
}

export function getEnergyEmoji(value: number | null | undefined): string {
  if (!value) return '';
  return ENERGY_EMOJIS.find(e => e.value === value)?.emoji || '';
}
