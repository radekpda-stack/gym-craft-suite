import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, RotateCcw, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface PainAreaWithIntensity {
  area: string;
  intensity: number;
}

interface BodyMapSelectorProps {
  selectedAreas: string[];
  onAreasChange: (areas: string[]) => void;
  intensities?: Record<string, number>;
  onIntensityChange?: (area: string, intensity: number) => void;
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

const getIntensityColor = (intensity: number) => {
  if (intensity <= 3) return 'bg-yellow-500';
  if (intensity <= 6) return 'bg-orange-500';
  return 'bg-red-500';
};

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedAreas,
  onAreasChange,
  intensities = {},
  onIntensityChange,
  language = 'cs',
}) => {
  const [view, setView] = useState<ViewType>('front');

  const getLabel = (area: string) => AREA_LABELS[area]?.[language] || area;

  const isSelected = (area: string) => selectedAreas.includes(area);

  const getIntensity = (area: string) => intensities[area] ?? 5;

  const toggleArea = (area: string) => {
    if (isSelected(area)) {
      onAreasChange(selectedAreas.filter(a => a !== area));
    } else {
      onAreasChange([...selectedAreas, area]);
      // Set default intensity when selecting
      if (onIntensityChange && !intensities[area]) {
        onIntensityChange(area, 5);
      }
    }
  };

  const removeArea = (area: string) => {
    onAreasChange(selectedAreas.filter(a => a !== area));
  };

  const adjustIntensity = (area: string, delta: number) => {
    if (!onIntensityChange) return;
    const current = getIntensity(area);
    const newValue = Math.max(1, Math.min(10, current + delta));
    onIntensityChange(area, newValue);
  };

  const getAreaStyle = (area: string) => {
    const intensity = getIntensity(area);
    const intensityOpacity = isSelected(area) ? 0.5 + (intensity / 10) * 0.5 : 1;
    
    return cn(
      "cursor-pointer transition-all duration-200",
      isSelected(area) 
        ? "fill-primary stroke-primary animate-body-pulse" 
        : "fill-muted/50 stroke-muted-foreground hover:fill-primary/40 hover:stroke-primary",
      isSelected(area) && `opacity-[${intensityOpacity}]`
    );
  };

  // Custom style with intensity-based fill for selected areas
  const getAreaStyleWithIntensity = (area: string) => {
    if (!isSelected(area)) {
      return "fill-muted/50 stroke-muted-foreground hover:fill-primary/40 hover:stroke-primary cursor-pointer transition-all duration-200";
    }
    
    const intensity = getIntensity(area);
    // Map intensity 1-10 to color: low = yellow/orange, high = red
    let fillColor = 'fill-primary';
    if (intensity <= 3) {
      fillColor = 'fill-yellow-500';
    } else if (intensity <= 6) {
      fillColor = 'fill-orange-500';
    } else {
      fillColor = 'fill-red-500';
    }
    
    return cn(
      "cursor-pointer transition-all duration-200 animate-body-pulse stroke-2",
      fillColor,
      "stroke-foreground"
    );
  };

  const nonSelectableStyle = "fill-muted/30 stroke-muted-foreground/70";

  // Render intensity text on selected areas
  const renderIntensityLabel = (area: string, x: number, y: number, fontSize: string = "8px") => {
    if (!isSelected(area)) return null;
    const intensity = getIntensity(area);
    return (
      <text 
        x={x} 
        y={y} 
        textAnchor="middle" 
        className="fill-foreground font-bold pointer-events-none"
        style={{ fontSize }}
      >
        {intensity}
      </text>
    );
  };

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

      {/* Legend */}
      {onIntensityChange && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            1-3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            4-6
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            7-10
          </span>
        </div>
      )}

      {view === 'front' ? (
        <svg
          viewBox="0 0 200 340"
          className="w-full max-w-[200px] h-auto bg-secondary/30 rounded-xl p-2"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Head */}
          <ellipse cx="100" cy="30" rx="22" ry="26" className={nonSelectableStyle} strokeWidth="2" />

          {/* Neck */}
          <rect x="90" y="54" width="20" height="16" rx="4" className={getAreaStyleWithIntensity('neck')} strokeWidth="2" onClick={() => toggleArea('neck')} />
          {renderIntensityLabel('neck', 100, 65, '6px')}

          {/* Shoulders */}
          <ellipse cx="58" cy="82" rx="18" ry="12" className={getAreaStyleWithIntensity('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          <ellipse cx="142" cy="82" rx="18" ry="12" className={getAreaStyleWithIntensity('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          {isSelected('shoulder') && (
            <>
              {renderIntensityLabel('shoulder', 58, 85, '8px')}
              {renderIntensityLabel('shoulder', 142, 85, '8px')}
            </>
          )}

          {/* Chest */}
          <rect x="70" y="70" width="60" height="50" rx="8" className={getAreaStyleWithIntensity('chest')} strokeWidth="2" onClick={() => toggleArea('chest')} />
          {renderIntensityLabel('chest', 100, 100, '10px')}

          {/* Abdomen (non-selectable) */}
          <rect x="75" y="120" width="50" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Arms */}
          <rect x="38" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="148" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Elbows */}
          <ellipse cx="45" cy="135" rx="10" ry="8" className={getAreaStyleWithIntensity('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          <ellipse cx="155" cy="135" rx="10" ry="8" className={getAreaStyleWithIntensity('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          {isSelected('elbow') && (
            <>
              {renderIntensityLabel('elbow', 45, 138, '7px')}
              {renderIntensityLabel('elbow', 155, 138, '7px')}
            </>
          )}

          {/* Forearms */}
          <rect x="38" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="150" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Wrists */}
          <ellipse cx="44" cy="188" rx="9" ry="7" className={getAreaStyleWithIntensity('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          <ellipse cx="156" cy="188" rx="9" ry="7" className={getAreaStyleWithIntensity('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          {isSelected('wrist') && (
            <>
              {renderIntensityLabel('wrist', 44, 191, '6px')}
              {renderIntensityLabel('wrist', 156, 191, '6px')}
            </>
          )}

          {/* Hands */}
          <ellipse cx="44" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="156" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Hips */}
          <ellipse cx="75" cy="168" rx="14" ry="12" className={getAreaStyleWithIntensity('hip')} strokeWidth="2" onClick={() => toggleArea('hip')} />
          <ellipse cx="125" cy="168" rx="14" ry="12" className={getAreaStyleWithIntensity('hip')} strokeWidth="2" onClick={() => toggleArea('hip')} />
          {isSelected('hip') && (
            <>
              {renderIntensityLabel('hip', 75, 171, '8px')}
              {renderIntensityLabel('hip', 125, 171, '8px')}
            </>
          )}

          {/* Thighs */}
          <rect x="68" y="180" width="18" height="50" rx="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="114" y="180" width="18" height="50" rx="8" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Knees */}
          <ellipse cx="77" cy="240" rx="12" ry="10" className={getAreaStyleWithIntensity('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          <ellipse cx="123" cy="240" rx="12" ry="10" className={getAreaStyleWithIntensity('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          {isSelected('knee') && (
            <>
              {renderIntensityLabel('knee', 77, 243, '8px')}
              {renderIntensityLabel('knee', 123, 243, '8px')}
            </>
          )}

          {/* Shins */}
          <rect x="70" y="255" width="14" height="45" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="116" y="255" width="14" height="45" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Ankles */}
          <ellipse cx="77" cy="308" rx="10" ry="8" className={getAreaStyleWithIntensity('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          <ellipse cx="123" cy="308" rx="10" ry="8" className={getAreaStyleWithIntensity('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          {isSelected('ankle') && (
            <>
              {renderIntensityLabel('ankle', 77, 311, '7px')}
              {renderIntensityLabel('ankle', 123, 311, '7px')}
            </>
          )}

          {/* Feet */}
          <ellipse cx="77" cy="326" rx="12" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="123" cy="326" rx="12" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 200 340"
          className="w-full max-w-[200px] h-auto bg-secondary/30 rounded-xl p-2"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Head (back view) */}
          <ellipse cx="100" cy="30" rx="22" ry="26" className={nonSelectableStyle} strokeWidth="2" />

          {/* Neck (back) */}
          <rect x="90" y="54" width="20" height="16" rx="4" className={getAreaStyleWithIntensity('neck')} strokeWidth="2" onClick={() => toggleArea('neck')} />
          {renderIntensityLabel('neck', 100, 65, '6px')}

          {/* Shoulders (back) */}
          <ellipse cx="58" cy="82" rx="18" ry="12" className={getAreaStyleWithIntensity('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          <ellipse cx="142" cy="82" rx="18" ry="12" className={getAreaStyleWithIntensity('shoulder')} strokeWidth="2" onClick={() => toggleArea('shoulder')} />
          {isSelected('shoulder') && (
            <>
              {renderIntensityLabel('shoulder', 58, 85, '8px')}
              {renderIntensityLabel('shoulder', 142, 85, '8px')}
            </>
          )}

          {/* Upper back */}
          <rect x="70" y="70" width="60" height="50" rx="8" className={getAreaStyleWithIntensity('upper_back')} strokeWidth="2" onClick={() => toggleArea('upper_back')} />
          {renderIntensityLabel('upper_back', 100, 100, '10px')}

          {/* Lower back */}
          <rect x="75" y="120" width="50" height="40" rx="6" className={getAreaStyleWithIntensity('lower_back')} strokeWidth="2" onClick={() => toggleArea('lower_back')} />
          {renderIntensityLabel('lower_back', 100, 145, '10px')}

          {/* Arms (back) */}
          <rect x="38" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="148" y="90" width="14" height="40" rx="6" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Elbows (back) */}
          <ellipse cx="45" cy="135" rx="10" ry="8" className={getAreaStyleWithIntensity('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          <ellipse cx="155" cy="135" rx="10" ry="8" className={getAreaStyleWithIntensity('elbow')} strokeWidth="2" onClick={() => toggleArea('elbow')} />
          {isSelected('elbow') && (
            <>
              {renderIntensityLabel('elbow', 45, 138, '7px')}
              {renderIntensityLabel('elbow', 155, 138, '7px')}
            </>
          )}

          {/* Forearms (back) */}
          <rect x="38" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />
          <rect x="150" y="145" width="12" height="35" rx="5" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Wrists (back) */}
          <ellipse cx="44" cy="188" rx="9" ry="7" className={getAreaStyleWithIntensity('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          <ellipse cx="156" cy="188" rx="9" ry="7" className={getAreaStyleWithIntensity('wrist')} strokeWidth="2" onClick={() => toggleArea('wrist')} />
          {isSelected('wrist') && (
            <>
              {renderIntensityLabel('wrist', 44, 191, '6px')}
              {renderIntensityLabel('wrist', 156, 191, '6px')}
            </>
          )}

          {/* Hands (back) */}
          <ellipse cx="44" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="156" cy="205" rx="8" ry="10" className={nonSelectableStyle} strokeWidth="1.5" />

          {/* Glutes */}
          <ellipse cx="77" cy="168" rx="16" ry="14" className={getAreaStyleWithIntensity('glutes')} strokeWidth="2" onClick={() => toggleArea('glutes')} />
          <ellipse cx="123" cy="168" rx="16" ry="14" className={getAreaStyleWithIntensity('glutes')} strokeWidth="2" onClick={() => toggleArea('glutes')} />
          {isSelected('glutes') && (
            <>
              {renderIntensityLabel('glutes', 77, 171, '8px')}
              {renderIntensityLabel('glutes', 123, 171, '8px')}
            </>
          )}

          {/* Hamstrings */}
          <rect x="66" y="182" width="22" height="50" rx="8" className={getAreaStyleWithIntensity('hamstring')} strokeWidth="2" onClick={() => toggleArea('hamstring')} />
          <rect x="112" y="182" width="22" height="50" rx="8" className={getAreaStyleWithIntensity('hamstring')} strokeWidth="2" onClick={() => toggleArea('hamstring')} />
          {isSelected('hamstring') && (
            <>
              {renderIntensityLabel('hamstring', 77, 210, '8px')}
              {renderIntensityLabel('hamstring', 123, 210, '8px')}
            </>
          )}

          {/* Knees (back) */}
          <ellipse cx="77" cy="240" rx="12" ry="10" className={getAreaStyleWithIntensity('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          <ellipse cx="123" cy="240" rx="12" ry="10" className={getAreaStyleWithIntensity('knee')} strokeWidth="2" onClick={() => toggleArea('knee')} />
          {isSelected('knee') && (
            <>
              {renderIntensityLabel('knee', 77, 243, '8px')}
              {renderIntensityLabel('knee', 123, 243, '8px')}
            </>
          )}

          {/* Calves */}
          <rect x="68" y="255" width="18" height="45" rx="6" className={getAreaStyleWithIntensity('calf')} strokeWidth="2" onClick={() => toggleArea('calf')} />
          <rect x="114" y="255" width="18" height="45" rx="6" className={getAreaStyleWithIntensity('calf')} strokeWidth="2" onClick={() => toggleArea('calf')} />
          {isSelected('calf') && (
            <>
              {renderIntensityLabel('calf', 77, 282, '8px')}
              {renderIntensityLabel('calf', 123, 282, '8px')}
            </>
          )}

          {/* Ankles (back) */}
          <ellipse cx="77" cy="308" rx="10" ry="8" className={getAreaStyleWithIntensity('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          <ellipse cx="123" cy="308" rx="10" ry="8" className={getAreaStyleWithIntensity('ankle')} strokeWidth="2" onClick={() => toggleArea('ankle')} />
          {isSelected('ankle') && (
            <>
              {renderIntensityLabel('ankle', 77, 311, '7px')}
              {renderIntensityLabel('ankle', 123, 311, '7px')}
            </>
          )}

          {/* Heels */}
          <ellipse cx="77" cy="326" rx="10" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
          <ellipse cx="123" cy="326" rx="10" ry="8" className={nonSelectableStyle} strokeWidth="1.5" />
        </svg>
      )}

      {/* Selected areas with intensity controls */}
      {selectedAreas.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            {language === 'cs' ? 'Upravte intenzitu bolesti (1-10):' : 'Adjust pain intensity (1-10):'}
          </p>
          <div className="flex flex-col gap-2">
            {selectedAreas.filter(a => a !== 'other').map((area) => {
              const intensity = getIntensity(area);
              return (
                <div
                  key={area}
                  className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium flex-1">{getLabel(area)}</span>
                  
                  {onIntensityChange ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustIntensity(area, -1)}
                        className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                        disabled={intensity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                        getIntensityColor(intensity)
                      )}>
                        {intensity}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => adjustIntensity(area, 1)}
                        className="w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                        disabled={intensity >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Badge variant="default" className="gap-1">
                      ✓
                    </Badge>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => removeArea(area)}
                    className="w-6 h-6 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
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
