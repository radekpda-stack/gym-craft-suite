import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PainSelection {
  area: string;
  intensity: number;
  side?: 'left' | 'right' | 'both';
  isNew?: boolean;
}

interface BodyPainSelectorProps {
  selectedAreas: PainSelection[];
  onChange: (areas: PainSelection[]) => void;
  language?: 'cs' | 'en';
}

const BODY_AREAS = [
  { id: 'knee', icon: '🦵', labelCs: 'Koleno', labelEn: 'Knee', bilateral: true },
  { id: 'shoulder', icon: '💪', labelCs: 'Rameno', labelEn: 'Shoulder', bilateral: true },
  { id: 'back', icon: '🔙', labelCs: 'Záda', labelEn: 'Back', bilateral: false },
  { id: 'hip', icon: '🦴', labelCs: 'Kyčel', labelEn: 'Hip', bilateral: true },
  { id: 'ankle', icon: '🦶', labelCs: 'Kotník', labelEn: 'Ankle', bilateral: true },
  { id: 'wrist', icon: '✋', labelCs: 'Zápěstí', labelEn: 'Wrist', bilateral: true },
  { id: 'neck', icon: '🦒', labelCs: 'Krk', labelEn: 'Neck', bilateral: false },
  { id: 'muscle', icon: '🏃', labelCs: 'Svaly', labelEn: 'Muscles', bilateral: false },
  { id: 'other', icon: '➕', labelCs: 'Jiné', labelEn: 'Other', bilateral: false },
];

const getIntensityColor = (intensity: number): string => {
  if (intensity <= 3) return 'bg-yellow-400/90';
  if (intensity <= 6) return 'bg-orange-500/90';
  return 'bg-red-500/90';
};

const getIntensityBorder = (intensity: number): string => {
  if (intensity <= 3) return 'border-yellow-400 shadow-yellow-400/30';
  if (intensity <= 6) return 'border-orange-500 shadow-orange-500/30';
  return 'border-red-500 shadow-red-500/30';
};

export const BodyPainSelector: React.FC<BodyPainSelectorProps> = ({
  selectedAreas,
  onChange,
  language = 'cs',
}) => {
  const [showSilhouette, setShowSilhouette] = useState(false);
  const [silhouetteView, setSilhouetteView] = useState<'front' | 'back'>('front');

  const isSelected = (areaId: string) => selectedAreas.some(a => a.area === areaId);
  
  const getSelection = (areaId: string) => selectedAreas.find(a => a.area === areaId);

  const toggleArea = (areaId: string) => {
    if (isSelected(areaId)) {
      onChange(selectedAreas.filter(a => a.area !== areaId));
    } else {
      onChange([...selectedAreas, { area: areaId, intensity: 5, isNew: true }]);
    }
  };

  const updateIntensity = (areaId: string, delta: number) => {
    onChange(selectedAreas.map(a => {
      if (a.area === areaId) {
        const newIntensity = Math.max(1, Math.min(10, a.intensity + delta));
        return { ...a, intensity: newIntensity };
      }
      return a;
    }));
  };

  const updateSide = (areaId: string, side: 'left' | 'right' | 'both') => {
    onChange(selectedAreas.map(a => {
      if (a.area === areaId) {
        return { ...a, side };
      }
      return a;
    }));
  };

  const updateIsNew = (areaId: string, isNew: boolean) => {
    onChange(selectedAreas.map(a => {
      if (a.area === areaId) {
        return { ...a, isNew };
      }
      return a;
    }));
  };

  const removeArea = (areaId: string) => {
    onChange(selectedAreas.filter(a => a.area !== areaId));
  };

  const t = {
    title: language === 'cs' ? 'Bolí tě něco?' : 'Any pain?',
    subtitle: language === 'cs' ? 'Klikni na oblast, která tě bolí' : 'Tap the area that hurts',
    showOnBody: language === 'cs' ? 'Ukázat na těle' : 'Show on body',
    hideBody: language === 'cs' ? 'Skrýt siluetu' : 'Hide silhouette',
    front: language === 'cs' ? 'Zepředu' : 'Front',
    back: language === 'cs' ? 'Zezadu' : 'Back',
    left: language === 'cs' ? 'L' : 'L',
    right: language === 'cs' ? 'P' : 'R',
    both: language === 'cs' ? 'Obě' : 'Both',
    selected: language === 'cs' ? 'Vybrané oblasti' : 'Selected areas',
    legend: language === 'cs' ? 'Intenzita' : 'Intensity',
    new: language === 'cs' ? 'Nová' : 'New',
    known: language === 'cs' ? 'Známá' : 'Known',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {BODY_AREAS.map((area) => {
          const selected = isSelected(area.id);
          const selection = getSelection(area.id);
          const label = language === 'cs' ? area.labelCs : area.labelEn;

          return (
            <motion.button
              key={area.id}
              onClick={() => toggleArea(area.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200",
                "min-h-[80px] sm:min-h-[90px]",
                selected
                  ? cn("border-2 shadow-lg", getIntensityBorder(selection?.intensity || 5))
                  : "border-border/50 bg-card/50 hover:bg-card hover:border-border"
              )}
            >
              {/* Icon */}
              <span className="text-2xl sm:text-3xl mb-1">{area.icon}</span>
              
              {/* Label */}
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                selected ? "text-foreground" : "text-muted-foreground"
              )}>
                {label}
              </span>

              {/* Intensity Badge */}
              {selected && selection && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                    getIntensityColor(selection.intensity)
                  )}
                >
                  {selection.intensity}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Areas Details */}
      <AnimatePresence>
        {selectedAreas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="text-sm font-medium text-muted-foreground">{t.selected}:</div>
            
            {selectedAreas.map((selection) => {
              const area = BODY_AREAS.find(a => a.id === selection.area);
              if (!area) return null;
              const label = language === 'cs' ? area.labelCs : area.labelEn;

              return (
                <motion.div
                  key={selection.area}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "flex flex-col gap-3 p-3 rounded-lg border-2",
                    getIntensityBorder(selection.intensity)
                  )}
                >
                  {/* Top row: Area info + intensity + remove */}
                  <div className="flex items-center gap-3">
                    {/* Area Info */}
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <span className="text-xl">{area.icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>

                    {/* Intensity Control */}
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateIntensity(selection.area, -1); }}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white",
                        getIntensityColor(selection.intensity)
                      )}>
                        {selection.intensity}
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); updateIntensity(selection.area, 1); }}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeArea(selection.area); }}
                      className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom row: Side selection + New/Known toggle */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Side Selection (for bilateral areas) */}
                    {area.bilateral ? (
                      <div className="flex gap-1">
                        {(['left', 'right', 'both'] as const).map((side) => (
                          <button
                            key={side}
                            onClick={(e) => { e.stopPropagation(); updateSide(selection.area, side); }}
                            className={cn(
                              "px-2 py-1 text-xs rounded-md transition-colors",
                              selection.side === side
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                          >
                            {side === 'left' ? t.left : side === 'right' ? t.right : t.both}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* New/Known Toggle */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateIsNew(selection.area, true); }}
                        className={cn(
                          "px-2 py-1 text-xs rounded-md transition-colors",
                          selection.isNew === true
                            ? "bg-orange-500 text-white"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        {t.new}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateIsNew(selection.area, false); }}
                        className={cn(
                          "px-2 py-1 text-xs rounded-md transition-colors",
                          selection.isNew === false
                            ? "bg-blue-500 text-white"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        )}
                      >
                        {t.known}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Silhouette Toggle */}
      <div className="pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowSilhouette(!showSilhouette)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {showSilhouette ? t.hideBody : t.showOnBody}
        </Button>
      </div>

      {/* Simple Silhouette (Optional) */}
      <AnimatePresence>
        {showSilhouette && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* View Toggle */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setSilhouetteView('front')}
                className={cn(
                  "px-4 py-2 text-sm rounded-full transition-colors",
                  silhouetteView === 'front'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t.front}
              </button>
              <button
                onClick={() => setSilhouetteView('back')}
                className={cn(
                  "px-4 py-2 text-sm rounded-full transition-colors",
                  silhouetteView === 'back'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t.back}
              </button>
            </div>

            {/* Minimalist Silhouette */}
            <div className="flex justify-center">
              <SimpleSilhouette
                view={silhouetteView}
                selectedAreas={selectedAreas}
                onAreaClick={toggleArea}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <span>{t.legend}:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span>1-3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>4-6</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>7-10</span>
        </div>
      </div>
    </div>
  );
};

// Simple minimalist silhouette component
interface SimpleSilhouetteProps {
  view: 'front' | 'back';
  selectedAreas: PainSelection[];
  onAreaClick: (areaId: string) => void;
}

const SimpleSilhouette: React.FC<SimpleSilhouetteProps> = ({
  view,
  selectedAreas,
  onAreaClick,
}) => {
  const getPointColor = (areaId: string) => {
    const selection = selectedAreas.find(a => a.area === areaId);
    if (!selection) return 'fill-muted-foreground/30 stroke-muted-foreground/50';
    if (selection.intensity <= 3) return 'fill-yellow-400 stroke-yellow-500';
    if (selection.intensity <= 6) return 'fill-orange-500 stroke-orange-600';
    return 'fill-red-500 stroke-red-600';
  };

  // Simplified point positions for front/back view
  const points = view === 'front' ? [
    { id: 'neck', cx: 100, cy: 35 },
    { id: 'shoulder', cx: 70, cy: 55 },
    { id: 'shoulder', cx: 130, cy: 55, side: 'right' },
    { id: 'wrist', cx: 45, cy: 115 },
    { id: 'wrist', cx: 155, cy: 115, side: 'right' },
    { id: 'hip', cx: 80, cy: 120 },
    { id: 'hip', cx: 120, cy: 120, side: 'right' },
    { id: 'knee', cx: 80, cy: 170 },
    { id: 'knee', cx: 120, cy: 170, side: 'right' },
    { id: 'ankle', cx: 80, cy: 215 },
    { id: 'ankle', cx: 120, cy: 215, side: 'right' },
  ] : [
    { id: 'neck', cx: 100, cy: 35 },
    { id: 'shoulder', cx: 70, cy: 55 },
    { id: 'shoulder', cx: 130, cy: 55, side: 'right' },
    { id: 'back', cx: 100, cy: 85 },
    { id: 'hip', cx: 80, cy: 120 },
    { id: 'hip', cx: 120, cy: 120, side: 'right' },
    { id: 'muscle', cx: 80, cy: 145 },
    { id: 'muscle', cx: 120, cy: 145, side: 'right' },
    { id: 'knee', cx: 80, cy: 170 },
    { id: 'knee', cx: 120, cy: 170, side: 'right' },
    { id: 'ankle', cx: 80, cy: 215 },
    { id: 'ankle', cx: 120, cy: 215, side: 'right' },
  ];

  return (
    <svg
      viewBox="0 0 200 240"
      className="w-40 h-48"
    >
      {/* Ultra minimalist body outline */}
      <ellipse cx="100" cy="20" rx="18" ry="20" className="fill-none stroke-muted-foreground/30 stroke-2" />
      <line x1="100" y1="40" x2="100" y2="110" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="100" y1="50" x2="55" y2="100" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="100" y1="50" x2="145" y2="100" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="55" y1="100" x2="40" y2="120" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="145" y1="100" x2="160" y2="120" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="100" y1="110" x2="80" y2="220" className="stroke-muted-foreground/30 stroke-2" />
      <line x1="100" y1="110" x2="120" y2="220" className="stroke-muted-foreground/30 stroke-2" />

      {/* Interactive points */}
      {points.map((point, i) => (
        <motion.circle
          key={`${point.id}-${i}`}
          cx={point.cx}
          cy={point.cy}
          r="10"
          className={cn(
            "cursor-pointer stroke-2 transition-colors",
            getPointColor(point.id)
          )}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onAreaClick(point.id)}
        />
      ))}
    </svg>
  );
};

export default BodyPainSelector;
