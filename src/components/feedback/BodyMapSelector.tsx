import React from 'react';
import { cn } from '@/lib/utils';

interface BodyMapSelectorProps {
  selectedArea: string | null;
  onAreaSelect: (area: string) => void;
  language?: 'cs' | 'en';
}

const AREA_LABELS: Record<string, { cs: string; en: string }> = {
  neck: { cs: 'Krk', en: 'Neck' },
  shoulder: { cs: 'Rameno', en: 'Shoulder' },
  upper_back: { cs: 'Horní záda', en: 'Upper back' },
  lower_back: { cs: 'Dolní záda', en: 'Lower back' },
  hip: { cs: 'Kyčel', en: 'Hip' },
  knee: { cs: 'Koleno', en: 'Knee' },
  ankle: { cs: 'Kotník', en: 'Ankle' },
  wrist: { cs: 'Zápěstí', en: 'Wrist' },
  elbow: { cs: 'Loket', en: 'Elbow' },
  other: { cs: 'Jiné', en: 'Other' },
};

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedArea,
  onAreaSelect,
  language = 'cs',
}) => {
  const getLabel = (area: string) => AREA_LABELS[area]?.[language] || area;

  const isSelected = (area: string) => selectedArea === area;

  const getAreaStyle = (area: string) => cn(
    "cursor-pointer transition-all duration-200",
    isSelected(area) 
      ? "fill-primary stroke-primary opacity-100" 
      : "fill-muted-foreground/30 stroke-muted-foreground/50 hover:fill-primary/40 hover:stroke-primary/60"
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 200 340"
        className="w-full max-w-[200px] h-auto"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Head (not selectable, just for reference) */}
        <ellipse
          cx="100"
          cy="30"
          rx="22"
          ry="26"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Neck */}
        <rect
          x="90"
          y="54"
          width="20"
          height="16"
          rx="4"
          className={getAreaStyle('neck')}
          strokeWidth="2"
          onClick={() => onAreaSelect('neck')}
        />
        {isSelected('neck') && (
          <text x="100" y="65" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">
            ✓
          </text>
        )}

        {/* Shoulders - Left */}
        <ellipse
          cx="58"
          cy="82"
          rx="18"
          ry="12"
          className={getAreaStyle('shoulder')}
          strokeWidth="2"
          onClick={() => onAreaSelect('shoulder')}
        />

        {/* Shoulders - Right */}
        <ellipse
          cx="142"
          cy="82"
          rx="18"
          ry="12"
          className={getAreaStyle('shoulder')}
          strokeWidth="2"
          onClick={() => onAreaSelect('shoulder')}
        />
        {isSelected('shoulder') && (
          <>
            <text x="58" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            <text x="142" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Torso / Upper back area */}
        <rect
          x="70"
          y="70"
          width="60"
          height="50"
          rx="8"
          className={getAreaStyle('upper_back')}
          strokeWidth="2"
          onClick={() => onAreaSelect('upper_back')}
        />
        {isSelected('upper_back') && (
          <text x="100" y="100" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold pointer-events-none">
            ✓
          </text>
        )}

        {/* Lower back / Core */}
        <rect
          x="75"
          y="120"
          width="50"
          height="40"
          rx="6"
          className={getAreaStyle('lower_back')}
          strokeWidth="2"
          onClick={() => onAreaSelect('lower_back')}
        />
        {isSelected('lower_back') && (
          <text x="100" y="145" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold pointer-events-none">
            ✓
          </text>
        )}

        {/* Arms - Upper Left */}
        <rect
          x="38"
          y="90"
          width="14"
          height="40"
          rx="6"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Arms - Upper Right */}
        <rect
          x="148"
          y="90"
          width="14"
          height="40"
          rx="6"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Elbows - Left */}
        <ellipse
          cx="45"
          cy="135"
          rx="10"
          ry="8"
          className={getAreaStyle('elbow')}
          strokeWidth="2"
          onClick={() => onAreaSelect('elbow')}
        />

        {/* Elbows - Right */}
        <ellipse
          cx="155"
          cy="135"
          rx="10"
          ry="8"
          className={getAreaStyle('elbow')}
          strokeWidth="2"
          onClick={() => onAreaSelect('elbow')}
        />
        {isSelected('elbow') && (
          <>
            <text x="45" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            <text x="155" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Forearms - Left */}
        <rect
          x="38"
          y="145"
          width="12"
          height="35"
          rx="5"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Forearms - Right */}
        <rect
          x="150"
          y="145"
          width="12"
          height="35"
          rx="5"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Wrists - Left */}
        <ellipse
          cx="44"
          cy="188"
          rx="9"
          ry="7"
          className={getAreaStyle('wrist')}
          strokeWidth="2"
          onClick={() => onAreaSelect('wrist')}
        />

        {/* Wrists - Right */}
        <ellipse
          cx="156"
          cy="188"
          rx="9"
          ry="7"
          className={getAreaStyle('wrist')}
          strokeWidth="2"
          onClick={() => onAreaSelect('wrist')}
        />
        {isSelected('wrist') && (
          <>
            <text x="44" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
            <text x="156" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Hands - Left */}
        <ellipse
          cx="44"
          cy="205"
          rx="8"
          ry="10"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Hands - Right */}
        <ellipse
          cx="156"
          cy="205"
          rx="8"
          ry="10"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Hips - Left */}
        <ellipse
          cx="75"
          cy="168"
          rx="14"
          ry="12"
          className={getAreaStyle('hip')}
          strokeWidth="2"
          onClick={() => onAreaSelect('hip')}
        />

        {/* Hips - Right */}
        <ellipse
          cx="125"
          cy="168"
          rx="14"
          ry="12"
          className={getAreaStyle('hip')}
          strokeWidth="2"
          onClick={() => onAreaSelect('hip')}
        />
        {isSelected('hip') && (
          <>
            <text x="75" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            <text x="125" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Thighs - Left */}
        <rect
          x="68"
          y="180"
          width="18"
          height="50"
          rx="8"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Thighs - Right */}
        <rect
          x="114"
          y="180"
          width="18"
          height="50"
          rx="8"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Knees - Left */}
        <ellipse
          cx="77"
          cy="240"
          rx="12"
          ry="10"
          className={getAreaStyle('knee')}
          strokeWidth="2"
          onClick={() => onAreaSelect('knee')}
        />

        {/* Knees - Right */}
        <ellipse
          cx="123"
          cy="240"
          rx="12"
          ry="10"
          className={getAreaStyle('knee')}
          strokeWidth="2"
          onClick={() => onAreaSelect('knee')}
        />
        {isSelected('knee') && (
          <>
            <text x="77" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            <text x="123" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Calves - Left */}
        <rect
          x="70"
          y="255"
          width="14"
          height="45"
          rx="6"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Calves - Right */}
        <rect
          x="116"
          y="255"
          width="14"
          height="45"
          rx="6"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Ankles - Left */}
        <ellipse
          cx="77"
          cy="308"
          rx="10"
          ry="8"
          className={getAreaStyle('ankle')}
          strokeWidth="2"
          onClick={() => onAreaSelect('ankle')}
        />

        {/* Ankles - Right */}
        <ellipse
          cx="123"
          cy="308"
          rx="10"
          ry="8"
          className={getAreaStyle('ankle')}
          strokeWidth="2"
          onClick={() => onAreaSelect('ankle')}
        />
        {isSelected('ankle') && (
          <>
            <text x="77" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            <text x="123" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
          </>
        )}

        {/* Feet - Left */}
        <ellipse
          cx="77"
          cy="326"
          rx="12"
          ry="8"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />

        {/* Feet - Right */}
        <ellipse
          cx="123"
          cy="326"
          rx="12"
          ry="8"
          className="fill-muted-foreground/20 stroke-muted-foreground/40"
          strokeWidth="1.5"
        />
      </svg>

      {/* Selected area label */}
      {selectedArea && selectedArea !== 'other' && (
        <div className="text-center">
          <span className="text-sm font-medium text-primary">
            {getLabel(selectedArea)}
          </span>
        </div>
      )}

      {/* "Other" option as button below the body map */}
      <button
        type="button"
        onClick={() => onAreaSelect('other')}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          isSelected('other')
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {language === 'cs' ? 'Jiná oblast' : 'Other area'}
      </button>
    </div>
  );
};
