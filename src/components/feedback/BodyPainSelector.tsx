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

// Zone positions for SVG silhouette
const ZONE_POSITIONS = {
  front: {
    neck: { cx: 100, cy: 52, rx: 14, ry: 10 },
    shoulder: { left: { cx: 68, cy: 72, rx: 16, ry: 12 }, right: { cx: 132, cy: 72, rx: 16, ry: 12 } },
    chest: { cx: 100, cy: 90, rx: 22, ry: 14 },
    elbow: { left: { cx: 48, cy: 115, rx: 10, ry: 12 }, right: { cx: 152, cy: 115, rx: 10, ry: 12 } },
    wrist: { left: { cx: 38, cy: 148, rx: 10, ry: 10 }, right: { cx: 162, cy: 148, rx: 10, ry: 10 } },
    hip: { left: { cx: 78, cy: 135, rx: 14, ry: 12 }, right: { cx: 122, cy: 135, rx: 14, ry: 12 } },
    groin: { cx: 100, cy: 148, rx: 12, ry: 10 },
    knee: { left: { cx: 82, cy: 195, rx: 12, ry: 14 }, right: { cx: 118, cy: 195, rx: 12, ry: 14 } },
    shin: { left: { cx: 82, cy: 228, rx: 10, ry: 16 }, right: { cx: 118, cy: 228, rx: 10, ry: 16 } },
    ankle: { left: { cx: 82, cy: 262, rx: 10, ry: 10 }, right: { cx: 118, cy: 262, rx: 10, ry: 10 } },
  },
  back: {
    cervical_spine: { cx: 100, cy: 52, rx: 12, ry: 10 },
    upper_back: { cx: 100, cy: 80, rx: 20, ry: 14 },
    lower_back: { cx: 100, cy: 115, rx: 18, ry: 14 },
    shoulder_back: { left: { cx: 68, cy: 72, rx: 16, ry: 12 }, right: { cx: 132, cy: 72, rx: 16, ry: 12 } },
    elbow_back: { left: { cx: 48, cy: 115, rx: 10, ry: 12 }, right: { cx: 152, cy: 115, rx: 10, ry: 12 } },
    glutes: { left: { cx: 82, cy: 145, rx: 14, ry: 12 }, right: { cx: 118, cy: 145, rx: 14, ry: 12 } },
    hamstring: { left: { cx: 82, cy: 175, rx: 12, ry: 16 }, right: { cx: 118, cy: 175, rx: 12, ry: 16 } },
    calf: { left: { cx: 82, cy: 228, rx: 10, ry: 16 }, right: { cx: 118, cy: 228, rx: 10, ry: 16 } },
    achilles: { left: { cx: 82, cy: 258, rx: 8, ry: 10 }, right: { cx: 118, cy: 258, rx: 8, ry: 10 } },
  },
};

const getIntensityColor = (intensity: number): string => {
  if (intensity <= 3) return 'fill-yellow-400';
  if (intensity <= 6) return 'fill-orange-500';
  return 'fill-red-500';
};

const getIntensityBgColor = (intensity: number): string => {
  if (intensity <= 3) return 'bg-yellow-400';
  if (intensity <= 6) return 'bg-orange-500';
  return 'bg-red-500';
};

const getIntensityBorder = (intensity: number): string => {
  if (intensity <= 3) return 'border-yellow-400';
  if (intensity <= 6) return 'border-orange-500';
  return 'border-red-500';
};

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

  const getSelectionKey = (zoneId: string, side?: 'left' | 'right' | 'both'): string => {
    return side ? `${zoneId}_${side}` : zoneId;
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
          "cursor-pointer transition-all duration-200 stroke-2",
          isSelected
            ? cn(getIntensityColor(selection.intensity), "stroke-white/50")
            : "fill-muted/40 stroke-muted-foreground/30 hover:fill-primary/20 hover:stroke-primary/50"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openZoneSheet(zoneId, side)}
      />
    );
  };

  const currentZones = BODY_ZONES[view];
  const currentPositions = ZONE_POSITIONS[view];

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView('front')}
          className={cn(
            "px-6 py-2 text-sm font-medium rounded-full transition-all",
            view === 'front'
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {t.front}
        </button>
        <button
          type="button"
          onClick={() => setView('back')}
          className={cn(
            "px-6 py-2 text-sm font-medium rounded-full transition-all",
            view === 'back'
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {t.back}
        </button>
      </div>

      {/* SVG Silhouette */}
      <div className="flex justify-center">
        <svg viewBox="0 0 200 280" className="w-48 h-72 sm:w-56 sm:h-80">
          {/* Body outline - minimalist silhouette */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Head */}
          <ellipse cx="100" cy="28" rx="22" ry="26" fill="url(#bodyGradient)" className="stroke-muted-foreground/20 stroke-1" />
          
          {/* Neck */}
          <rect x="92" y="52" width="16" height="12" fill="url(#bodyGradient)" className="stroke-muted-foreground/20 stroke-1" />
          
          {/* Torso */}
          <path 
            d="M60 64 Q60 62, 68 62 L132 62 Q140 62, 140 64 L145 130 Q145 155, 122 160 L78 160 Q55 155, 55 130 Z" 
            fill="url(#bodyGradient)" 
            className="stroke-muted-foreground/20 stroke-1"
          />
          
          {/* Arms */}
          <path d="M60 64 Q40 75, 35 115 Q32 135, 38 155" fill="none" className="stroke-muted-foreground/20 stroke-[12]" strokeLinecap="round" />
          <path d="M140 64 Q160 75, 165 115 Q168 135, 162 155" fill="none" className="stroke-muted-foreground/20 stroke-[12]" strokeLinecap="round" />
          
          {/* Legs */}
          <path d="M78 160 Q75 200, 82 270" fill="none" className="stroke-muted-foreground/20 stroke-[16]" strokeLinecap="round" />
          <path d="M122 160 Q125 200, 118 270" fill="none" className="stroke-muted-foreground/20 stroke-[16]" strokeLinecap="round" />

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
                      "flex items-center justify-between p-3 rounded-lg border-2 bg-card",
                      getIntensityBorder(selection.intensity)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
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
                  "font-bold text-lg px-3 py-1 rounded-full text-white",
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
                        "flex-1 py-2 px-3 text-sm rounded-lg border-2 transition-all",
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
                  "flex-1 py-3 px-4 text-sm rounded-lg border-2 transition-all",
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
                  "flex-1 py-3 px-4 text-sm rounded-lg border-2 transition-all",
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
                    "flex-1 py-3 px-4 text-sm rounded-lg border-2 transition-all",
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
                    "flex-1 py-3 px-4 text-sm rounded-lg border-2 transition-all",
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
