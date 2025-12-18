import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Minus, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PainAreaWithIntensity {
  area: string;
  intensity: number;
  side?: 'left' | 'right' | 'both';
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
  achilles: { cs: 'Achillovka', en: 'Achilles' },
  quad: { cs: 'Přední stehno', en: 'Quad' },
  shin: { cs: 'Holeň', en: 'Shin' },
  forearm: { cs: 'Předloktí', en: 'Forearm' },
  // Other
  other: { cs: 'Jiné', en: 'Other' },
};

export const BILATERAL_AREAS = ['knee', 'shoulder', 'hip', 'ankle', 'wrist', 'elbow', 'hamstring', 'calf', 'glutes', 'achilles', 'quad', 'shin', 'forearm'];

type ViewType = 'front' | 'back';

// Color scale with patterns for accessibility
const getIntensityStyle = (intensity: number, isSelected: boolean) => {
  if (!isSelected) {
    return {
      fill: 'var(--body-zone-default)',
      stroke: 'var(--body-zone-stroke)',
      opacity: 1,
    };
  }
  
  // Accessible color scale: yellow -> orange -> red with distinct patterns
  if (intensity <= 3) {
    return {
      fill: '#fbbf24', // Yellow-400
      stroke: '#d97706', // Amber-600
      opacity: 0.8 + (intensity / 30),
    };
  }
  if (intensity <= 6) {
    return {
      fill: '#f97316', // Orange-500
      stroke: '#c2410c', // Orange-700
      opacity: 0.8 + ((intensity - 3) / 30),
    };
  }
  return {
    fill: '#ef4444', // Red-500
    stroke: '#b91c1c', // Red-700
    opacity: 0.85 + ((intensity - 6) / 40),
  };
};

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedAreas,
  onAreasChange,
  intensities = {},
  onIntensityChange,
  language = 'cs',
}) => {
  const [view, setView] = useState<ViewType>('front');
  const [activeArea, setActiveArea] = useState<string | null>(null);

  const getLabel = (area: string) => AREA_LABELS[area]?.[language] || area;

  const isSelected = useCallback((area: string) => selectedAreas.includes(area), [selectedAreas]);

  const getIntensity = useCallback((area: string) => intensities[area] ?? 5, [intensities]);

  const toggleArea = useCallback((area: string, e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    if (isSelected(area)) {
      setActiveArea(null);
      onAreasChange(selectedAreas.filter(a => a !== area));
    } else {
      onAreasChange([...selectedAreas, area]);
      if (onIntensityChange && !intensities[area]) {
        onIntensityChange(area, 5);
      }
      setActiveArea(area);
    }
  }, [isSelected, selectedAreas, onAreasChange, onIntensityChange, intensities]);

  const adjustIntensity = useCallback((area: string, delta: number, e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    if (!onIntensityChange) return;
    const current = getIntensity(area);
    const newValue = Math.max(1, Math.min(10, current + delta));
    onIntensityChange(area, newValue);
  }, [getIntensity, onIntensityChange]);

  const removeArea = useCallback((area: string, e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setActiveArea(null);
    onAreasChange(selectedAreas.filter(a => a !== area));
  }, [selectedAreas, onAreasChange]);

  // Zone component for cleaner code
  const Zone = ({ 
    area, 
    d, 
    transform,
    cx, cy, rx, ry,
    x, y, width, height, rr,
    type = 'path'
  }: { 
    area: string; 
    d?: string; 
    transform?: string;
    cx?: number; cy?: number; rx?: number; ry?: number;
    x?: number; y?: number; width?: number; height?: number; rr?: number;
    type?: 'path' | 'ellipse' | 'rect';
  }) => {
    const selected = isSelected(area);
    const intensity = getIntensity(area);
    const style = getIntensityStyle(intensity, selected);
    const isActive = activeArea === area;

    const baseProps = {
      onClick: (e: React.MouseEvent) => toggleArea(area, e),
      onTouchEnd: (e: React.TouchEvent) => {
        e.preventDefault();
        toggleArea(area, e);
      },
      style: { 
        fill: style.fill, 
        stroke: style.stroke,
        opacity: style.opacity,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      strokeWidth: selected ? 2.5 : 1.5,
      className: cn(
        'transition-all duration-200 touch-manipulation',
        selected && 'animate-pulse-soft',
        isActive && 'ring-2 ring-primary ring-offset-1'
      ),
    };

    if (type === 'ellipse') {
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...baseProps} />;
    }
    if (type === 'rect') {
      return <rect x={x} y={y} width={width} height={height} rx={rr} {...baseProps} />;
    }
    return <path d={d} transform={transform} {...baseProps} />;
  };

  // Non-selectable body parts
  const BodyPart = ({ d, transform }: { d: string; transform?: string }) => (
    <path 
      d={d} 
      transform={transform}
      fill="var(--body-fill)"
      stroke="var(--body-stroke)"
      strokeWidth="1.5"
      style={{ pointerEvents: 'none' }}
    />
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {/* CSS Variables for theming */}
      <style>{`
        :root {
          --body-fill: hsl(var(--muted) / 0.3);
          --body-stroke: hsl(var(--muted-foreground) / 0.5);
          --body-zone-default: hsl(var(--muted) / 0.5);
          --body-zone-stroke: hsl(var(--muted-foreground) / 0.7);
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>

      {/* View toggle - pill style */}
      <div className="flex items-center bg-muted/50 rounded-full p-1 shadow-inner">
        <button
          type="button"
          onClick={() => setView('front')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            view === 'front'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {language === 'cs' ? 'Zepředu' : 'Front'}
        </button>
        <button
          type="button"
          onClick={() => setView('back')}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
            view === 'back'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {language === 'cs' ? 'Zezadu' : 'Back'}
        </button>
      </div>

      {/* Legend - compact horizontal */}
      {onIntensityChange && (
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-amber-600" />
            <span className="text-muted-foreground">1-3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500 border border-orange-700" />
            <span className="text-muted-foreground">4-6</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700" />
            <span className="text-muted-foreground">7-10</span>
          </div>
        </div>
      )}

      {/* Body Map SVG */}
      <div className="relative w-full">
        <svg
          viewBox="0 0 200 340"
          className="w-full h-auto max-h-[400px]"
          style={{ touchAction: 'manipulation' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="340" rx="16" fill="url(#bodyGradient)" />

          {view === 'front' ? (
            <g>
              {/* Head - non-selectable */}
              <ellipse cx="100" cy="28" rx="20" ry="24" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Neck */}
              <Zone area="neck" type="rect" x={92} y={50} width={16} height={14} rr={4} />
              
              {/* Torso outline - non-selectable */}
              <path 
                d="M70 64 Q65 64 60 72 L55 90 L55 130 Q55 140 65 145 L65 160 Q68 175 80 180 L80 180 Q100 185 120 180 L120 180 Q132 175 135 160 L135 145 Q145 140 145 130 L145 90 L140 72 Q135 64 130 64 Z"
                fill="var(--body-fill)" 
                stroke="var(--body-stroke)" 
                strokeWidth="1.5"
              />
              
              {/* Shoulders */}
              <Zone area="shoulder" type="ellipse" cx={60} cy={78} rx={15} ry={10} />
              <Zone area="shoulder" type="ellipse" cx={140} cy={78} rx={15} ry={10} />
              
              {/* Chest */}
              <Zone area="chest" type="rect" x={72} y={70} width={56} height={42} rr={8} />
              
              {/* Upper arms - non-selectable */}
              <rect x="42" y="86" width="12" height="36" rx="5" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <rect x="146" y="86" width="12" height="36" rx="5" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Elbows */}
              <Zone area="elbow" type="ellipse" cx={48} cy={128} rx={9} ry={7} />
              <Zone area="elbow" type="ellipse" cx={152} cy={128} rx={9} ry={7} />
              
              {/* Forearms */}
              <Zone area="forearm" type="rect" x={42} y={138} width={12} height={32} rr={5} />
              <Zone area="forearm" type="rect" x={146} y={138} width={12} height={32} rr={5} />
              
              {/* Wrists */}
              <Zone area="wrist" type="ellipse" cx={48} cy={178} rx={8} ry={6} />
              <Zone area="wrist" type="ellipse" cx={152} cy={178} rx={8} ry={6} />
              
              {/* Hands - non-selectable */}
              <ellipse cx="48" cy="195" rx="7" ry="10" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <ellipse cx="152" cy="195" rx="7" ry="10" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Hips */}
              <Zone area="hip" type="ellipse" cx={78} cy={162} rx={12} ry={10} />
              <Zone area="hip" type="ellipse" cx={122} cy={162} rx={12} ry={10} />
              
              {/* Quads (front thighs) */}
              <Zone area="quad" type="rect" x={70} y={175} width={18} height={48} rr={8} />
              <Zone area="quad" type="rect" x={112} y={175} width={18} height={48} rr={8} />
              
              {/* Knees */}
              <Zone area="knee" type="ellipse" cx={79} cy={232} rx={11} ry={9} />
              <Zone area="knee" type="ellipse" cx={121} cy={232} rx={11} ry={9} />
              
              {/* Shins */}
              <Zone area="shin" type="rect" x={72} y={248} width={14} height={42} rr={6} />
              <Zone area="shin" type="rect" x={114} y={248} width={14} height={42} rr={6} />
              
              {/* Ankles */}
              <Zone area="ankle" type="ellipse" cx={79} cy={298} rx={9} ry={7} />
              <Zone area="ankle" type="ellipse" cx={121} cy={298} rx={9} ry={7} />
              
              {/* Feet - non-selectable */}
              <ellipse cx="79" cy="318" rx="11" ry="7" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <ellipse cx="121" cy="318" rx="11" ry="7" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              {/* Back view */}
              {/* Head - non-selectable */}
              <ellipse cx="100" cy="28" rx="20" ry="24" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Neck */}
              <Zone area="neck" type="rect" x={92} y={50} width={16} height={14} rr={4} />
              
              {/* Torso outline - non-selectable */}
              <path 
                d="M70 64 Q65 64 60 72 L55 90 L55 130 Q55 140 65 145 L65 160 Q68 175 80 180 L80 180 Q100 185 120 180 L120 180 Q132 175 135 160 L135 145 Q145 140 145 130 L145 90 L140 72 Q135 64 130 64 Z"
                fill="var(--body-fill)" 
                stroke="var(--body-stroke)" 
                strokeWidth="1.5"
              />
              
              {/* Shoulders */}
              <Zone area="shoulder" type="ellipse" cx={60} cy={78} rx={15} ry={10} />
              <Zone area="shoulder" type="ellipse" cx={140} cy={78} rx={15} ry={10} />
              
              {/* Upper back */}
              <Zone area="upper_back" type="rect" x={72} y={70} width={56} height={38} rr={8} />
              
              {/* Lower back */}
              <Zone area="lower_back" type="rect" x={78} y={112} width={44} height={36} rr={6} />
              
              {/* Upper arms - non-selectable */}
              <rect x="42" y="86" width="12" height="36" rx="5" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <rect x="146" y="86" width="12" height="36" rx="5" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Elbows */}
              <Zone area="elbow" type="ellipse" cx={48} cy={128} rx={9} ry={7} />
              <Zone area="elbow" type="ellipse" cx={152} cy={128} rx={9} ry={7} />
              
              {/* Forearms */}
              <Zone area="forearm" type="rect" x={42} y={138} width={12} height={32} rr={5} />
              <Zone area="forearm" type="rect" x={146} y={138} width={12} height={32} rr={5} />
              
              {/* Wrists */}
              <Zone area="wrist" type="ellipse" cx={48} cy={178} rx={8} ry={6} />
              <Zone area="wrist" type="ellipse" cx={152} cy={178} rx={8} ry={6} />
              
              {/* Hands - non-selectable */}
              <ellipse cx="48" cy="195" rx="7" ry="10" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <ellipse cx="152" cy="195" rx="7" ry="10" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              
              {/* Glutes */}
              <Zone area="glutes" type="ellipse" cx={79} cy={162} rx={14} ry={12} />
              <Zone area="glutes" type="ellipse" cx={121} cy={162} rx={14} ry={12} />
              
              {/* Hamstrings */}
              <Zone area="hamstring" type="rect" x={68} y={178} width={20} height={44} rr={8} />
              <Zone area="hamstring" type="rect" x={112} y={178} width={20} height={44} rr={8} />
              
              {/* Knees */}
              <Zone area="knee" type="ellipse" cx={79} cy={232} rx={11} ry={9} />
              <Zone area="knee" type="ellipse" cx={121} cy={232} rx={11} ry={9} />
              
              {/* Calves */}
              <Zone area="calf" type="rect" x={70} y={248} width={16} height={38} rr={6} />
              <Zone area="calf" type="rect" x={114} y={248} width={16} height={38} rr={6} />
              
              {/* Achilles */}
              <Zone area="achilles" type="ellipse" cx={79} cy={294} rx={7} ry={5} />
              <Zone area="achilles" type="ellipse" cx={121} cy={294} rx={7} ry={5} />
              
              {/* Ankles */}
              <Zone area="ankle" type="ellipse" cx={79} cy={305} rx={9} ry={6} />
              <Zone area="ankle" type="ellipse" cx={121} cy={305} rx={9} ry={6} />
              
              {/* Feet - non-selectable */}
              <ellipse cx="79" cy="318" rx="11" ry="7" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
              <ellipse cx="121" cy="318" rx="11" ry="7" fill="var(--body-fill)" stroke="var(--body-stroke)" strokeWidth="1.5" />
            </g>
          )}
          
          {/* Intensity numbers overlay */}
          <g className="pointer-events-none">
            {selectedAreas.map(area => {
              // Get position for intensity label based on area and view
              const positions: Record<string, Record<ViewType, { x: number; y: number }[]>> = {
                neck: { front: [{ x: 100, y: 60 }], back: [{ x: 100, y: 60 }] },
                shoulder: { front: [{ x: 60, y: 82 }, { x: 140, y: 82 }], back: [{ x: 60, y: 82 }, { x: 140, y: 82 }] },
                chest: { front: [{ x: 100, y: 95 }], back: [] },
                upper_back: { front: [], back: [{ x: 100, y: 92 }] },
                lower_back: { front: [], back: [{ x: 100, y: 132 }] },
                elbow: { front: [{ x: 48, y: 132 }, { x: 152, y: 132 }], back: [{ x: 48, y: 132 }, { x: 152, y: 132 }] },
                forearm: { front: [{ x: 48, y: 156 }, { x: 152, y: 156 }], back: [{ x: 48, y: 156 }, { x: 152, y: 156 }] },
                wrist: { front: [{ x: 48, y: 182 }, { x: 152, y: 182 }], back: [{ x: 48, y: 182 }, { x: 152, y: 182 }] },
                hip: { front: [{ x: 78, y: 166 }, { x: 122, y: 166 }], back: [] },
                glutes: { front: [], back: [{ x: 79, y: 166 }, { x: 121, y: 166 }] },
                quad: { front: [{ x: 79, y: 202 }, { x: 121, y: 202 }], back: [] },
                hamstring: { front: [], back: [{ x: 78, y: 202 }, { x: 122, y: 202 }] },
                knee: { front: [{ x: 79, y: 236 }, { x: 121, y: 236 }], back: [{ x: 79, y: 236 }, { x: 121, y: 236 }] },
                shin: { front: [{ x: 79, y: 272 }, { x: 121, y: 272 }], back: [] },
                calf: { front: [], back: [{ x: 78, y: 270 }, { x: 122, y: 270 }] },
                achilles: { front: [], back: [{ x: 79, y: 296 }, { x: 121, y: 296 }] },
                ankle: { front: [{ x: 79, y: 302 }, { x: 121, y: 302 }], back: [{ x: 79, y: 308 }, { x: 121, y: 308 }] },
              };
              
              const pos = positions[area]?.[view] || [];
              if (pos.length === 0) return null;
              
              const intensity = getIntensity(area);
              
              return pos.map((p, i) => (
                <text
                  key={`${area}-${i}`}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground font-bold"
                  style={{ fontSize: '10px', textShadow: '0 0 3px white, 0 0 3px white' }}
                >
                  {intensity}
                </text>
              ));
            })}
          </g>
        </svg>
      </div>

      {/* Selected areas list with intensity controls */}
      {selectedAreas.length > 0 && (
        <div className="w-full space-y-2 mt-2">
          <p className="text-xs text-muted-foreground text-center mb-2">
            {language === 'cs' ? 'Klikněte na zónu pro odebrání, nebo upravte intenzitu:' : 'Click zone to remove, or adjust intensity:'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {selectedAreas.map(area => {
              const intensity = getIntensity(area);
              const style = getIntensityStyle(intensity, true);
              
              return (
                <div
                  key={area}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-all",
                    "bg-card border shadow-sm"
                  )}
                  style={{ borderColor: style.stroke }}
                >
                  {/* Intensity controls */}
                  <button
                    type="button"
                    onClick={(e) => adjustIntensity(area, -1, e)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                    disabled={intensity <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: style.fill, border: `1px solid ${style.stroke}` }}
                    />
                    <span className="font-medium truncate">{getLabel(area)}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {intensity}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => adjustIntensity(area, 1, e)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                    disabled={intensity >= 10}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => removeArea(area, e)}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {selectedAreas.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {language === 'cs' 
            ? 'Klepněte na oblast těla, kde cítíte bolest' 
            : 'Tap on body areas where you feel pain'}
        </p>
      )}
    </div>
  );
};

export default BodyMapSelector;
