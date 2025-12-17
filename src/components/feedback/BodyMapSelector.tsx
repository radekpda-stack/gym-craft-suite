import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BodyMapSelectorProps {
  selectedAreas: string[];
  onAreasChange: (areas: string[]) => void;
  language?: 'cs' | 'en';
}

const AREA_LABELS: Record<string, { cs: string; en: string }> = {
  // Front areas
  neck: { cs: 'Krk', en: 'Neck' },
  shoulder: { cs: 'Rameno', en: 'Shoulder' },
  chest: { cs: 'Hrudník', en: 'Chest' },
  hip: { cs: 'Kyčel', en: 'Hip' },
  knee: { cs: 'Koleno', en: 'Knee' },
  ankle: { cs: 'Kotník', en: 'Ankle' },
  wrist: { cs: 'Zápěstí', en: 'Wrist' },
  elbow: { cs: 'Loket', en: 'Elbow' },
  // Back areas
  upper_back: { cs: 'Horní záda', en: 'Upper back' },
  lower_back: { cs: 'Dolní záda', en: 'Lower back' },
  glutes: { cs: 'Hýždě', en: 'Glutes' },
  hamstring: { cs: 'Zadní stehno', en: 'Hamstring' },
  calf: { cs: 'Lýtko', en: 'Calf' },
  // Other
  other: { cs: 'Jiné', en: 'Other' },
};

export const BILATERAL_AREAS = ['knee', 'shoulder', 'hip', 'ankle', 'wrist', 'elbow', 'hamstring', 'calf', 'glutes'];

type ViewType = 'front' | 'back';

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedAreas,
  onAreasChange,
  language = 'cs',
}) => {
  const [view, setView] = useState<ViewType>('front');

  const getLabel = (area: string) => AREA_LABELS[area]?.[language] || area;

  const isSelected = (area: string) => selectedAreas.includes(area);

  const toggleArea = (area: string) => {
    if (isSelected(area)) {
      onAreasChange(selectedAreas.filter(a => a !== area));
    } else {
      onAreasChange([...selectedAreas, area]);
    }
  };

  const removeArea = (area: string) => {
    onAreasChange(selectedAreas.filter(a => a !== area));
  };

  const getAreaStyle = (area: string) => cn(
    "cursor-pointer transition-all duration-200",
    isSelected(area) 
      ? "fill-primary stroke-primary opacity-100 animate-body-pulse" 
      : "fill-muted-foreground/30 stroke-muted-foreground/50 hover:fill-primary/40 hover:stroke-primary/60"
  );

  const nonSelectableStyle = "fill-muted-foreground/20 stroke-muted-foreground/40";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* View toggle */}
      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
        <button
          type="button"
          onClick={() => setView('front')}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            view === 'front'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {language === 'cs' ? 'Zepředu' : 'Front'}
        </button>
        <button
          type="button"
          onClick={() => setView('back')}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1",
            view === 'back'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <RotateCcw className="w-3 h-3" />
          {language === 'cs' ? 'Zezadu' : 'Back'}
        </button>
      </div>

      {view === 'front' ? (
        <svg
          viewBox="0 0 200 340"
          className="w-full max-w-[200px] h-auto"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Head */}
          <ellipse cx="100" cy="30" rx="22" ry="26" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Neck */}
          <rect x="90" y="54" width="20" height="16" rx="4" className={getAreaStyle('neck')} strokeWidth="2" onClick={() => toggleArea('neck')} />
          {isSelected('neck') && <text x="100" y="65" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>}

          {/* Shoulders */}
          <ellipse cx="58" cy="82" rx="18" ry="12" className={getAreaStyle('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          <ellipse cx="142" cy="82" rx="18" ry="12" className={getAreaStyle('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          {isSelected('shoulder') && (
            <>
              <text x="58" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="142" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Chest */}
          <rect x="70" y="70" width="60" height="50" rx="8" className={getAreaStyle('chest')} strokeWidth="2" onClick={() => toggleArea('chest')} />
          {isSelected('chest') && <text x="100" y="100" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold pointer-events-none">✓</text>}

          {/* Abdomen (non-selectable) */}
          <rect x="75" y="120" width="50" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Arms */}
          <rect x="38" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="148" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Elbows */}
          <ellipse cx="45" cy="135" rx="10" ry="8" className={getAreaStyle('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          <ellipse cx="155" cy="135" rx="10" ry="8" className={getAreaStyle('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          {isSelected('elbow') && (
            <>
              <text x="45" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
              <text x="155" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Forearms */}
          <rect x="38" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="150" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Wrists */}
          <ellipse cx="44" cy="188" rx="9" ry="7" className={getAreaStyle('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          <ellipse cx="156" cy="188" rx="9" ry="7" className={getAreaStyle('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          {isSelected('wrist') && (
            <>
              <text x="44" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
              <text x="156" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Hands */}
          <ellipse cx="44" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="156" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Hips */}
          <ellipse cx="75" cy="168" rx="14" ry="12" className={getAreaStyle('hip')} strokeWidth="2" onClick={() => toggleArea('hip')} />
          <ellipse cx="125" cy="168" rx="14" ry="12" className={getAreaStyle('hip')} strokeWidth="2" onClick={() => toggleArea('hip')} />
          {isSelected('hip') && (
            <>
              <text x="75" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="125" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Thighs */}
          <rect x="68" y="180" width="18" height="50" rx="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="114" y="180" width="18" height="50" rx="8" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Knees */}
          <ellipse cx="77" cy="240" rx="12" ry="10" className={getAreaStyle('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          <ellipse cx="123" cy="240" rx="12" ry="10" className={getAreaStyle('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          {isSelected('knee') && (
            <>
              <text x="77" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="123" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Shins */}
          <rect x="70" y="255" width="14" height="45" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="116" y="255" width="14" height="45" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Ankles */}
          <ellipse cx="77" cy="308" rx="10" ry="8" className={getAreaStyle('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          <ellipse cx="123" cy="308" rx="10" ry="8" className={getAreaStyle('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          {isSelected('ankle') && (
            <>
              <text x="77" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
              <text x="123" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Feet */}
          <ellipse cx="77" cy="326" rx="12" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="123" cy="326" rx="12" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 200 340"
          className="w-full max-w-[200px] h-auto"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Head (back view) */}
          <ellipse cx="100" cy="30" rx="22" ry="26" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Neck (back) */}
          <rect x="90" y="54" width="20" height="16" rx="4" className={getAreaStyle('neck')} strokeWidth="2" onClick={() => toggleArea('neck')} />
          {isSelected('neck') && <text x="100" y="65" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>}

          {/* Shoulders (back) */}
          <ellipse cx="58" cy="82" rx="18" ry="12" className={getAreaStyle('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          <ellipse cx="142" cy="82" rx="18" ry="12" className={getAreaStyle('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          {isSelected('shoulder') && (
            <>
              <text x="58" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="142" y="85" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Upper back */}
          <rect x="70" y="70" width="60" height="50" rx="8" className={getAreaStyle('upper_back')} strokeWidth="2" onClick={() => toggleArea('upper_back')} />
          {isSelected('upper_back') && <text x="100" y="100" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold pointer-events-none">✓</text>}

          {/* Lower back */}
          <rect x="75" y="120" width="50" height="40" rx="6" className={getAreaStyle('lower_back')} strokeWidth="2" onClick={() => toggleArea('lower_back')} />
          {isSelected('lower_back') && <text x="100" y="145" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold pointer-events-none">✓</text>}

          {/* Arms (back) */}
          <rect x="38" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="148" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Elbows (back) */}
          <ellipse cx="45" cy="135" rx="10" ry="8" className={getAreaStyle('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          <ellipse cx="155" cy="135" rx="10" ry="8" className={getAreaStyle('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          {isSelected('elbow') && (
            <>
              <text x="45" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
              <text x="155" y="138" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Forearms (back) */}
          <rect x="38" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="150" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Wrists (back) */}
          <ellipse cx="44" cy="188" rx="9" ry="7" className={getAreaStyle('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          <ellipse cx="156" cy="188" rx="9" ry="7" className={getAreaStyle('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          {isSelected('wrist') && (
            <>
              <text x="44" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
              <text x="156" y="191" textAnchor="middle" className="fill-primary-foreground text-[6px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Hands (back) */}
          <ellipse cx="44" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="156" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Glutes */}
          <ellipse cx="77" cy="168" rx="16" ry="14" className={getAreaStyle('glutes')} strokeWidth="2" onClick={() => toggleArea('glutes')} />
          <ellipse cx="123" cy="168" rx="16" ry="14" className={getAreaStyle('glutes')} strokeWidth="2" onClick={() => toggleArea('glutes')} />
          {isSelected('glutes') && (
            <>
              <text x="77" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="123" y="171" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Hamstrings */}
          <rect x="66" y="182" width="22" height="50" rx="8" className={getAreaStyle('hamstring')} strokeWidth="2" onClick={() => toggleArea('hamstring')} />
          <rect x="112" y="182" width="22" height="50" rx="8" className={getAreaStyle('hamstring')} strokeWidth="2" onClick={() => toggleArea('hamstring')} />
          {isSelected('hamstring') && (
            <>
              <text x="77" y="210" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="123" y="210" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Knees (back) */}
          <ellipse cx="77" cy="240" rx="12" ry="10" className={getAreaStyle('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          <ellipse cx="123" cy="240" rx="12" ry="10" className={getAreaStyle('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          {isSelected('knee') && (
            <>
              <text x="77" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="123" y="243" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Calves */}
          <rect x="68" y="255" width="18" height="45" rx="6" className={getAreaStyle('calf')} strokeWidth="2" onClick={() => toggleArea('calf')} />
          <rect x="114" y="255" width="18" height="45" rx="6" className={getAreaStyle('calf')} strokeWidth="2" onClick={() => toggleArea('calf')} />
          {isSelected('calf') && (
            <>
              <text x="77" y="282" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
              <text x="123" y="282" textAnchor="middle" className="fill-primary-foreground text-[8px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Ankles (back) */}
          <ellipse cx="77" cy="308" rx="10" ry="8" className={getAreaStyle('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          <ellipse cx="123" cy="308" rx="10" ry="8" className={getAreaStyle('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          {isSelected('ankle') && (
            <>
              <text x="77" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
              <text x="123" y="311" textAnchor="middle" className="fill-primary-foreground text-[7px] font-bold pointer-events-none">✓</text>
            </>
          )}

          {/* Heels */}
          <ellipse cx="77" cy="326" rx="10" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="123" cy="326" rx="10" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
        </svg>
      )}

      {/* Selected areas as removable badges */}
      {selectedAreas.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedAreas.filter(a => a !== 'other').map((area) => (
            <Badge
              key={area}
              variant="default"
              className="gap-1 cursor-pointer hover:bg-primary/80"
              onClick={() => removeArea(area)}
            >
              {getLabel(area)}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* "Other" option as button below the body map */}
      <button
        type="button"
        onClick={() => toggleArea('other')}
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
