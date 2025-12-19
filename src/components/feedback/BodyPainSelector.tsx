import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';

export interface PainSelection {
  area: string;
  intensity: number;
  side?: 'left' | 'right' | 'both';
  isNew?: boolean;
  painType?: 'muscle' | 'joint';
}

interface BodyPainSelectorProps {
  selectedAreas: PainSelection[];
  onChange: (areas: PainSelection[]) => void;
  language?: 'cs' | 'en';
}

// Functional body zones - front and back views
const BODY_ZONES = {
  front: [
    { id: 'neck', labelCs: 'Krk', labelEn: 'Neck', bilateral: false },
    { id: 'shoulder', labelCs: 'Rameno', labelEn: 'Shoulder', bilateral: true },
    { id: 'chest', labelCs: 'Hrudník', labelEn: 'Chest', bilateral: false },
    { id: 'elbow', labelCs: 'Loket', labelEn: 'Elbow', bilateral: true },
    { id: 'wrist', labelCs: 'Zápěstí/ruka', labelEn: 'Wrist/Hand', bilateral: true },
    { id: 'hip', labelCs: 'Kyčel', labelEn: 'Hip', bilateral: true },
    { id: 'groin', labelCs: 'Tříslo', labelEn: 'Groin', bilateral: false },
    { id: 'knee', labelCs: 'Koleno', labelEn: 'Knee', bilateral: true },
    { id: 'shin', labelCs: 'Holeň', labelEn: 'Shin', bilateral: true },
    { id: 'ankle', labelCs: 'Kotník/chodidlo', labelEn: 'Ankle/Foot', bilateral: true },
  ],
  back: [
    { id: 'cervical_spine', labelCs: 'Krční páteř', labelEn: 'Cervical Spine', bilateral: false },
    { id: 'upper_back', labelCs: 'Horní záda', labelEn: 'Upper Back', bilateral: false },
    { id: 'lower_back', labelCs: 'Bedra', labelEn: 'Lower Back', bilateral: false },
    { id: 'shoulder_back', labelCs: 'Rameno', labelEn: 'Shoulder', bilateral: true },
    { id: 'elbow_back', labelCs: 'Loket', labelEn: 'Elbow', bilateral: true },
    { id: 'glutes', labelCs: 'Hýždě', labelEn: 'Glutes', bilateral: true },
    { id: 'hamstring', labelCs: 'Zadní stehno', labelEn: 'Hamstring', bilateral: true },
    { id: 'calf', labelCs: 'Lýtko', labelEn: 'Calf', bilateral: true },
    { id: 'achilles', labelCs: 'Achillovka', labelEn: 'Achilles', bilateral: true },
  ],
};

// Zone positions for clickable areas - adjusted for anatomical silhouette
const ZONE_POSITIONS = {
  front: {
    neck: { cx: 100, cy: 62, rx: 12, ry: 8 },
    shoulder: { left: { cx: 70, cy: 82, rx: 14, ry: 10 }, right: { cx: 130, cy: 82, rx: 14, ry: 10 } },
    chest: { cx: 100, cy: 100, rx: 20, ry: 12 },
    elbow: { left: { cx: 52, cy: 128, rx: 9, ry: 11 }, right: { cx: 148, cy: 128, rx: 9, ry: 11 } },
    wrist: { left: { cx: 42, cy: 165, rx: 8, ry: 8 }, right: { cx: 158, cy: 165, rx: 8, ry: 8 } },
    hip: { left: { cx: 82, cy: 148, rx: 12, ry: 10 }, right: { cx: 118, cy: 148, rx: 12, ry: 10 } },
    groin: { cx: 100, cy: 160, rx: 10, ry: 8 },
    knee: { left: { cx: 84, cy: 210, rx: 10, ry: 12 }, right: { cx: 116, cy: 210, rx: 10, ry: 12 } },
    shin: { left: { cx: 84, cy: 245, rx: 8, ry: 14 }, right: { cx: 116, cy: 245, rx: 8, ry: 14 } },
    ankle: { left: { cx: 84, cy: 278, rx: 8, ry: 8 }, right: { cx: 116, cy: 278, rx: 8, ry: 8 } },
  },
  back: {
    cervical_spine: { cx: 100, cy: 62, rx: 10, ry: 8 },
    upper_back: { cx: 100, cy: 92, rx: 18, ry: 12 },
    lower_back: { cx: 100, cy: 128, rx: 16, ry: 12 },
    shoulder_back: { left: { cx: 70, cy: 82, rx: 14, ry: 10 }, right: { cx: 130, cy: 82, rx: 14, ry: 10 } },
    elbow_back: { left: { cx: 52, cy: 128, rx: 9, ry: 11 }, right: { cx: 148, cy: 128, rx: 9, ry: 11 } },
    glutes: { left: { cx: 84, cy: 158, rx: 12, ry: 10 }, right: { cx: 116, cy: 158, rx: 12, ry: 10 } },
    hamstring: { left: { cx: 84, cy: 190, rx: 10, ry: 14 }, right: { cx: 116, cy: 190, rx: 10, ry: 14 } },
    calf: { left: { cx: 84, cy: 245, rx: 8, ry: 14 }, right: { cx: 116, cy: 245, rx: 8, ry: 14 } },
    achilles: { left: { cx: 84, cy: 275, rx: 6, ry: 8 }, right: { cx: 116, cy: 275, rx: 6, ry: 8 } },
  },
};

const getIntensityColor = (intensity: number): string => {
  if (intensity <= 3) return 'fill-amber-400';
  if (intensity <= 6) return 'fill-orange-500';
  return 'fill-red-500';
};

const getIntensityBgColor = (intensity: number): string => {
  if (intensity <= 3) return 'bg-amber-400';
  if (intensity <= 6) return 'bg-orange-500';
  return 'bg-red-500';
};

const getIntensityBorder = (intensity: number): string => {
  if (intensity <= 3) return 'border-amber-400';
  if (intensity <= 6) return 'border-orange-500';
  return 'border-red-500';
};

// Anatomical body silhouette paths
const BODY_SILHOUETTE_FRONT = `
  M100,20
  C112,20 122,30 122,44
  C122,54 116,62 108,66
  L108,70
  C130,72 148,82 148,82
  C158,86 162,96 162,108
  L164,130
  C166,138 168,148 166,158
  L156,178
  C154,182 150,184 146,184
  L138,172
  C136,168 134,166 132,168
  L130,170
  L128,145
  C126,138 122,134 118,136
  L118,162
  C120,170 122,178 120,186
  L118,210
  C120,218 120,228 118,240
  L116,260
  C116,270 114,280 112,290
  C110,294 106,296 100,296
  C94,296 90,294 88,290
  L86,260
  C84,240 82,228 84,218
  L82,186
  C80,178 82,170 84,162
  L84,136
  C80,134 76,138 74,145
  L72,170
  L70,168
  C68,166 66,168 64,172
  L56,184
  C52,184 48,182 46,178
  L36,158
  C34,148 36,138 38,130
  L40,108
  C40,96 44,86 54,82
  C54,82 72,72 94,70
  L94,66
  C86,62 80,54 80,44
  C80,30 90,20 100,20
  Z
`;

const BODY_SILHOUETTE_BACK = `
  M100,20
  C112,20 122,30 122,44
  C122,54 116,62 108,66
  L108,70
  C130,72 148,82 148,82
  C158,86 162,96 162,108
  L164,130
  C166,138 168,148 166,158
  L156,178
  C154,182 150,184 146,184
  L138,172
  C136,168 134,166 132,168
  L130,170
  L128,145
  C126,138 122,134 118,136
  L118,162
  C120,170 122,178 120,186
  L118,210
  C120,218 120,228 118,240
  L116,260
  C116,270 114,280 112,290
  C110,294 106,296 100,296
  C94,296 90,294 88,290
  L86,260
  C84,240 82,228 84,218
  L82,186
  C80,178 82,170 84,162
  L84,136
  C80,134 76,138 74,145
  L72,170
  L70,168
  C68,166 66,168 64,172
  L56,184
  C52,184 48,182 46,178
  L36,158
  C34,148 36,138 38,130
  L40,108
  C40,96 44,86 54,82
  C54,82 72,72 94,70
  L94,66
  C86,62 80,54 80,44
  C80,30 90,20 100,20
  Z
`;

export const BodyPainSelector: React.FC<BodyPainSelectorProps> = ({
  selectedAreas,
  onChange,
  language = 'cs',
}) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  
  // Temporary state for the bottom sheet
  const [tempIntensity, setTempIntensity] = useState(5);
  const [tempIsNew, setTempIsNew] = useState(true);
  const [tempPainType, setTempPainType] = useState<'muscle' | 'joint' | null>(null);
  const [tempSide, setTempSide] = useState<'left' | 'right' | 'both'>('both');

  const t = {
    front: language === 'cs' ? 'Zepředu' : 'Front',
    back: language === 'cs' ? 'Zezadu' : 'Back',
    left: language === 'cs' ? 'Levá' : 'Left',
    right: language === 'cs' ? 'Pravá' : 'Right',
    both: language === 'cs' ? 'Obě strany' : 'Both sides',
    new: language === 'cs' ? 'Nová' : 'New',
    known: language === 'cs' ? 'Známá' : 'Known',
    muscle: language === 'cs' ? 'Svalová' : 'Muscle',
    joint: language === 'cs' ? 'Kloub/šlacha' : 'Joint/Tendon',
    add: language === 'cs' ? 'Přidat' : 'Add',
    cancel: language === 'cs' ? 'Zrušit' : 'Cancel',
    intensity: language === 'cs' ? 'Intenzita' : 'Intensity',
    mild: language === 'cs' ? 'Mírná' : 'Mild',
    severe: language === 'cs' ? 'Silná' : 'Severe',
    selectedAreas: language === 'cs' ? 'Vybrané oblasti' : 'Selected areas',
    tapToAdd: language === 'cs' ? 'Klikni na oblast pro přidání bolesti' : 'Tap an area to add pain',
    legend: language === 'cs' ? 'Intenzita' : 'Intensity',
    edit: language === 'cs' ? 'Upravit' : 'Edit',
    remove: language === 'cs' ? 'Odstranit' : 'Remove',
  };

  const getZoneLabel = (zoneId: string, side?: 'left' | 'right' | null): string => {
    const zones = [...BODY_ZONES.front, ...BODY_ZONES.back];
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return zoneId;
    
    const label = language === 'cs' ? zone.labelCs : zone.labelEn;
    
    if (side && zone.bilateral) {
      const sideLabel = side === 'left' 
        ? (language === 'cs' ? 'Levé' : 'Left')
        : (language === 'cs' ? 'Pravé' : 'Right');
      return `${sideLabel} ${label.toLowerCase()}`;
    }
    
    return label;
  };

  const isZoneBilateral = (zoneId: string): boolean => {
    const zones = [...BODY_ZONES.front, ...BODY_ZONES.back];
    return zones.find(z => z.id === zoneId)?.bilateral ?? false;
  };

  const findSelection = (zoneId: string, side?: 'left' | 'right'): PainSelection | undefined => {
    return selectedAreas.find(a => {
      if (a.area === zoneId && !side) return true;
      if (a.area === zoneId && a.side === side) return true;
      if (a.area === zoneId && a.side === 'both') return true;
      return false;
    });
  };

  const openZoneSheet = (zoneId: string, side?: 'left' | 'right') => {
    const existing = findSelection(zoneId, side);
    
    if (existing) {
      setTempIntensity(existing.intensity);
      setTempIsNew(existing.isNew ?? true);
      setTempPainType(existing.painType ?? null);
      setTempSide(existing.side ?? 'both');
    } else {
      setTempIntensity(5);
      setTempIsNew(true);
      setTempPainType(null);
      setTempSide(side ?? 'both');
    }
    
    setActiveZone(zoneId);
    setActiveSide(side ?? null);
  };

  const handleConfirm = () => {
    if (!activeZone) return;
    
    const bilateral = isZoneBilateral(activeZone);
    const finalSide = bilateral ? tempSide : undefined;
    
    // Remove existing selection for this zone/side
    const filtered = selectedAreas.filter(a => {
      if (a.area !== activeZone) return true;
      if (!bilateral) return false;
      if (finalSide === 'both') return false;
      return a.side !== finalSide && a.side !== 'both';
    });
    
    // Add new selection
    const newSelection: PainSelection = {
      area: activeZone,
      intensity: tempIntensity,
      side: finalSide,
      isNew: tempIsNew,
      painType: tempPainType ?? undefined,
    };
    
    onChange([...filtered, newSelection]);
    setActiveZone(null);
    setActiveSide(null);
  };

  const handleEdit = (selection: PainSelection) => {
    openZoneSheet(selection.area, selection.side === 'both' ? undefined : selection.side);
  };

  const handleRemove = (selection: PainSelection) => {
    onChange(selectedAreas.filter(a => 
      !(a.area === selection.area && a.side === selection.side)
    ));
  };

  const renderZone = (
    zoneId: string, 
    position: { cx: number; cy: number; rx: number; ry: number },
    side?: 'left' | 'right'
  ) => {
    const selection = findSelection(zoneId, side);
    const isSelected = !!selection;
    
    return (
      <motion.ellipse
        key={`${zoneId}-${side || 'center'}`}
        cx={position.cx}
        cy={position.cy}
        rx={position.rx}
        ry={position.ry}
        className={cn(
          "cursor-pointer transition-all duration-300",
          isSelected
            ? cn(getIntensityColor(selection.intensity), "opacity-80")
            : "fill-primary/10 hover:fill-primary/30"
        )}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 6px currentColor)' : undefined,
        }}
        whileHover={{ scale: 1.15, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openZoneSheet(zoneId, side)}
        initial={false}
        animate={isSelected ? { 
          scale: [1, 1.05, 1],
          transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        } : {}}
      />
    );
  };

  const currentZones = BODY_ZONES[view];
  const currentPositions = ZONE_POSITIONS[view];
  const silhouettePath = view === 'front' ? BODY_SILHOUETTE_FRONT : BODY_SILHOUETTE_BACK;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView('front')}
          className={cn(
            "px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300",
            view === 'front'
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {t.front}
        </button>
        <button
          type="button"
          onClick={() => setView('back')}
          className={cn(
            "px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300",
            view === 'back'
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {t.back}
        </button>
      </div>

      {/* SVG Silhouette */}
      <div className="flex justify-center py-4">
        <svg viewBox="0 0 200 310" className="w-52 h-80 sm:w-60 sm:h-[360px]">
          <defs>
            {/* Body gradient */}
            <linearGradient id="bodyGradientPro" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="50%" stopColor="hsl(var(--muted))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Glow filter for selected areas */}
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Subtle inner shadow */}
            <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="0" dy="2"/>
              <feGaussianBlur stdDeviation="2" result="offset-blur"/>
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
              <feFlood floodColor="black" floodOpacity="0.15" result="color"/>
              <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
              <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
            </filter>
          </defs>
          
          {/* Body silhouette */}
          <motion.path 
            d={silhouettePath}
            fill="url(#bodyGradientPro)" 
            className="stroke-muted-foreground/30"
            strokeWidth="1.5"
            filter="url(#innerShadow)"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            key={view}
          />

          {/* Center line indicator for back view */}
          {view === 'back' && (
            <path 
              d="M100,70 L100,160" 
              className="stroke-muted-foreground/20"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}

          {/* Render clickable zones */}
          {currentZones.map(zone => {
            const position = currentPositions[zone.id as keyof typeof currentPositions];
            if (!position) return null;
            
            if (zone.bilateral) {
              const bilateralPos = position as { left: { cx: number; cy: number; rx: number; ry: number }; right: { cx: number; cy: number; rx: number; ry: number } };
              return (
                <React.Fragment key={zone.id}>
                  {renderZone(zone.id, bilateralPos.left, 'left')}
                  {renderZone(zone.id, bilateralPos.right, 'right')}
                </React.Fragment>
              );
            } else {
              const centerPos = position as { cx: number; cy: number; rx: number; ry: number };
              return renderZone(zone.id, centerPos);
            }
          })}
        </svg>
      </div>

      {/* Tap hint */}
      <p className="text-center text-sm text-muted-foreground">{t.tapToAdd}</p>

      {/* Selected Areas Overview */}
      <AnimatePresence>
        {selectedAreas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="text-sm font-medium text-muted-foreground">{t.selectedAreas}:</div>
            
            <div className="space-y-2">
              {selectedAreas.map((selection, index) => {
                const label = getZoneLabel(selection.area, selection.side === 'both' ? null : selection.side);
                const painTypeLabel = selection.painType === 'muscle' 
                  ? (language === 'cs' ? 'sval' : 'muscle')
                  : selection.painType === 'joint'
                    ? (language === 'cs' ? 'kloub' : 'joint')
                    : null;
                
                return (
                  <motion.div
                    key={`${selection.area}-${selection.side}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border-2 bg-card/50 backdrop-blur-sm",
                      getIntensityBorder(selection.intensity)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg",
                        getIntensityBgColor(selection.intensity)
                      )}>
                        {selection.intensity}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {selection.isNew ? t.new : t.known}
                          {painTypeLabel && ` · ${painTypeLabel}`}
                          {selection.side === 'both' && ` · ${t.both.toLowerCase()}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(selection)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(selection)}
                        className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
        <span>{t.legend}:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
          <span>1-3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
          <span>4-6</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
          <span>7-10</span>
        </div>
      </div>

      {/* Bottom Sheet / Drawer for Zone Details */}
      <Drawer open={activeZone !== null} onOpenChange={(open) => !open && setActiveZone(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle>
              {activeZone && getZoneLabel(activeZone, activeSide)}
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="px-6 pb-6 space-y-6">
            {/* Intensity Slider */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.intensity}</span>
                <span className={cn(
                  "font-bold text-lg px-3 py-1 rounded-full text-white shadow-md",
                  getIntensityBgColor(tempIntensity)
                )}>
                  {tempIntensity}
                </span>
              </div>
              <Slider
                value={[tempIntensity]}
                onValueChange={([value]) => setTempIntensity(value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t.mild}</span>
                <span>{t.severe}</span>
              </div>
            </div>

            {/* Side Selection (for bilateral zones) */}
            {activeZone && isZoneBilateral(activeZone) && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {(['left', 'right', 'both'] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setTempSide(side)}
                      className={cn(
                        "flex-1 py-2.5 px-3 text-sm rounded-xl border-2 transition-all duration-200",
                        tempSide === side
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >
                      {side === 'left' ? t.left : side === 'right' ? t.right : t.both}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New/Known Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTempIsNew(true)}
                className={cn(
                  "flex-1 py-3 px-4 text-sm rounded-xl border-2 transition-all duration-200",
                  tempIsNew
                    ? "border-orange-500 bg-orange-500/10 text-orange-600 font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                {t.new}
              </button>
              <button
                type="button"
                onClick={() => setTempIsNew(false)}
                className={cn(
                  "flex-1 py-3 px-4 text-sm rounded-xl border-2 transition-all duration-200",
                  !tempIsNew
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
                )}
              >
                {t.known}
              </button>
            </div>

            {/* Pain Type (Muscle/Joint) */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTempPainType(tempPainType === 'muscle' ? null : 'muscle')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm rounded-xl border-2 transition-all duration-200",
                    tempPainType === 'muscle'
                      ? "border-purple-500 bg-purple-500/10 text-purple-600 font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {t.muscle}
                </button>
                <button
                  type="button"
                  onClick={() => setTempPainType(tempPainType === 'joint' ? null : 'joint')}
                  className={cn(
                    "flex-1 py-3 px-4 text-sm rounded-xl border-2 transition-all duration-200",
                    tempPainType === 'joint'
                      ? "border-teal-500 bg-teal-500/10 text-teal-600 font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {t.joint}
                </button>
              </div>
            </div>
          </div>

          <DrawerFooter className="flex-row gap-3">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                {t.cancel}
              </Button>
            </DrawerClose>
            <Button onClick={handleConfirm} className="flex-1">
              {t.add}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default BodyPainSelector;
