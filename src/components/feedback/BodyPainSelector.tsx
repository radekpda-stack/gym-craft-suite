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
  painType?: 'muscle' | 'joint' | 'tendon';
}

interface BodyPainSelectorProps {
  selectedAreas: PainSelection[];
  onChange: (areas: PainSelection[]) => void;
  language?: 'cs' | 'en';
  gender?: 'male' | 'female' | null;
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

// Zone positions for male silhouette
const ZONE_POSITIONS_MALE = {
  front: {
    neck: { cx: 100, cy: 52, rx: 10, ry: 7 },
    shoulder: { left: { cx: 68, cy: 72, rx: 12, ry: 9 }, right: { cx: 132, cy: 72, rx: 12, ry: 9 } },
    chest: { cx: 100, cy: 90, rx: 18, ry: 10 },
    elbow: { left: { cx: 48, cy: 118, rx: 8, ry: 10 }, right: { cx: 152, cy: 118, rx: 8, ry: 10 } },
    wrist: { left: { cx: 38, cy: 155, rx: 7, ry: 7 }, right: { cx: 162, cy: 155, rx: 7, ry: 7 } },
    hip: { left: { cx: 82, cy: 138, rx: 10, ry: 9 }, right: { cx: 118, cy: 138, rx: 10, ry: 9 } },
    groin: { cx: 100, cy: 148, rx: 8, ry: 7 },
    knee: { left: { cx: 84, cy: 198, rx: 9, ry: 11 }, right: { cx: 116, cy: 198, rx: 9, ry: 11 } },
    shin: { left: { cx: 84, cy: 232, rx: 7, ry: 12 }, right: { cx: 116, cy: 232, rx: 7, ry: 12 } },
    ankle: { left: { cx: 84, cy: 268, rx: 7, ry: 7 }, right: { cx: 116, cy: 268, rx: 7, ry: 7 } },
  },
  back: {
    cervical_spine: { cx: 100, cy: 52, rx: 8, ry: 6 },
    upper_back: { cx: 100, cy: 82, rx: 16, ry: 10 },
    lower_back: { cx: 100, cy: 118, rx: 14, ry: 10 },
    shoulder_back: { left: { cx: 68, cy: 72, rx: 12, ry: 9 }, right: { cx: 132, cy: 72, rx: 12, ry: 9 } },
    elbow_back: { left: { cx: 48, cy: 118, rx: 8, ry: 10 }, right: { cx: 152, cy: 118, rx: 8, ry: 10 } },
    glutes: { left: { cx: 85, cy: 148, rx: 10, ry: 9 }, right: { cx: 115, cy: 148, rx: 10, ry: 9 } },
    hamstring: { left: { cx: 84, cy: 178, rx: 9, ry: 12 }, right: { cx: 116, cy: 178, rx: 9, ry: 12 } },
    calf: { left: { cx: 84, cy: 232, rx: 7, ry: 12 }, right: { cx: 116, cy: 232, rx: 7, ry: 12 } },
    achilles: { left: { cx: 84, cy: 262, rx: 5, ry: 7 }, right: { cx: 116, cy: 262, rx: 5, ry: 7 } },
  },
};

// Zone positions for female silhouette (slightly different proportions)
const ZONE_POSITIONS_FEMALE = {
  front: {
    neck: { cx: 100, cy: 52, rx: 9, ry: 6 },
    shoulder: { left: { cx: 72, cy: 70, rx: 10, ry: 8 }, right: { cx: 128, cy: 70, rx: 10, ry: 8 } },
    chest: { cx: 100, cy: 88, rx: 16, ry: 10 },
    elbow: { left: { cx: 52, cy: 116, rx: 7, ry: 9 }, right: { cx: 148, cy: 116, rx: 7, ry: 9 } },
    wrist: { left: { cx: 42, cy: 152, rx: 6, ry: 6 }, right: { cx: 158, cy: 152, rx: 6, ry: 6 } },
    hip: { left: { cx: 80, cy: 140, rx: 11, ry: 10 }, right: { cx: 120, cy: 140, rx: 11, ry: 10 } },
    groin: { cx: 100, cy: 150, rx: 7, ry: 6 },
    knee: { left: { cx: 84, cy: 200, rx: 8, ry: 10 }, right: { cx: 116, cy: 200, rx: 8, ry: 10 } },
    shin: { left: { cx: 84, cy: 234, rx: 6, ry: 11 }, right: { cx: 116, cy: 234, rx: 6, ry: 11 } },
    ankle: { left: { cx: 84, cy: 268, rx: 6, ry: 6 }, right: { cx: 116, cy: 268, rx: 6, ry: 6 } },
  },
  back: {
    cervical_spine: { cx: 100, cy: 52, rx: 7, ry: 5 },
    upper_back: { cx: 100, cy: 82, rx: 14, ry: 9 },
    lower_back: { cx: 100, cy: 118, rx: 12, ry: 9 },
    shoulder_back: { left: { cx: 72, cy: 70, rx: 10, ry: 8 }, right: { cx: 128, cy: 70, rx: 10, ry: 8 } },
    elbow_back: { left: { cx: 52, cy: 116, rx: 7, ry: 9 }, right: { cx: 148, cy: 116, rx: 7, ry: 9 } },
    glutes: { left: { cx: 84, cy: 150, rx: 11, ry: 10 }, right: { cx: 116, cy: 150, rx: 11, ry: 10 } },
    hamstring: { left: { cx: 84, cy: 180, rx: 8, ry: 11 }, right: { cx: 116, cy: 180, rx: 8, ry: 11 } },
    calf: { left: { cx: 84, cy: 234, rx: 6, ry: 11 }, right: { cx: 116, cy: 234, rx: 6, ry: 11 } },
    achilles: { left: { cx: 84, cy: 264, rx: 5, ry: 6 }, right: { cx: 116, cy: 264, rx: 5, ry: 6 } },
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

// Professional anatomical male silhouette - front view
const MALE_SILHOUETTE_FRONT = `
  M100,15
  C108,15 114,22 114,32
  C114,40 110,46 104,48
  L104,52
  C108,52 112,53 118,56
  L134,58
  C142,60 148,64 152,68
  L156,72
  C160,76 162,82 162,88
  L162,95
  C162,100 161,105 159,110
  L156,118
  C154,124 152,130 150,136
  L147,145
  C145,150 143,154 141,158
  L139,162
  L137,155
  C135,148 133,142 131,138
  L128,132
  C126,128 124,125 122,123
  L120,122
  L120,135
  C120,140 121,145 121,150
  L121,158
  C121,164 120,170 118,175
  L116,182
  C115,188 114,194 114,200
  L114,210
  C114,218 113,226 112,234
  L111,245
  C110,255 109,265 107,275
  L105,282
  C103,285 100,287 100,287
  C100,287 97,285 95,282
  L93,275
  C91,265 90,255 89,245
  L88,234
  C87,226 86,218 86,210
  L86,200
  C86,194 85,188 84,182
  L82,175
  C80,170 79,164 79,158
  L79,150
  C79,145 80,140 80,135
  L80,122
  L78,123
  C76,125 74,128 72,132
  L69,138
  C67,142 65,148 63,155
  L61,162
  L59,158
  C57,154 55,150 53,145
  L50,136
  C48,130 46,124 44,118
  L41,110
  C39,105 38,100 38,95
  L38,88
  C38,82 40,76 44,72
  L48,68
  C52,64 58,60 66,58
  L82,56
  C88,53 92,52 96,52
  L96,48
  C90,46 86,40 86,32
  C86,22 92,15 100,15
  Z
`;

// Professional anatomical male silhouette - back view
const MALE_SILHOUETTE_BACK = `
  M100,15
  C108,15 114,22 114,32
  C114,40 110,46 104,48
  L104,52
  C108,52 112,53 118,56
  L134,58
  C142,60 148,64 152,68
  L156,72
  C160,76 162,82 162,88
  L162,95
  C162,100 161,105 159,110
  L156,118
  C154,124 152,130 150,136
  L147,145
  C145,150 143,154 141,158
  L139,162
  L137,155
  C135,148 133,142 131,138
  L128,132
  C126,128 124,125 122,123
  L120,122
  L120,135
  C120,140 121,145 121,150
  L121,158
  C121,164 120,170 118,175
  L116,182
  C115,188 114,194 114,200
  L114,210
  C114,218 113,226 112,234
  L111,245
  C110,255 109,265 107,275
  L105,282
  C103,285 100,287 100,287
  C100,287 97,285 95,282
  L93,275
  C91,265 90,255 89,245
  L88,234
  C87,226 86,218 86,210
  L86,200
  C86,194 85,188 84,182
  L82,175
  C80,170 79,164 79,158
  L79,150
  C79,145 80,140 80,135
  L80,122
  L78,123
  C76,125 74,128 72,132
  L69,138
  C67,142 65,148 63,155
  L61,162
  L59,158
  C57,154 55,150 53,145
  L50,136
  C48,130 46,124 44,118
  L41,110
  C39,105 38,100 38,95
  L38,88
  C38,82 40,76 44,72
  L48,68
  C52,64 58,60 66,58
  L82,56
  C88,53 92,52 96,52
  L96,48
  C90,46 86,40 86,32
  C86,22 92,15 100,15
  Z
`;

// Professional anatomical female silhouette - front view  
const FEMALE_SILHOUETTE_FRONT = `
  M100,15
  C107,15 112,21 112,30
  C112,37 109,43 104,46
  L104,50
  C108,50 112,52 118,55
  L130,58
  C136,60 142,64 146,68
  L149,72
  C152,76 154,82 154,88
  L154,94
  C154,100 153,106 150,112
  L147,120
  C145,128 142,136 139,144
  L136,152
  C134,158 131,164 129,168
  L127,172
  L125,165
  C123,158 121,150 120,144
  L119,138
  C118,132 118,126 118,122
  L118,134
  C118,140 119,148 120,156
  L120,168
  C120,176 119,184 117,192
  L115,202
  C114,210 113,218 113,226
  L112,238
  C111,250 110,262 108,272
  L106,280
  C104,283 100,285 100,285
  C100,285 96,283 94,280
  L92,272
  C90,262 89,250 88,238
  L87,226
  C87,218 86,210 85,202
  L83,192
  C81,184 80,176 80,168
  L80,156
  C81,148 82,140 82,134
  L82,122
  C82,126 82,132 81,138
  L80,144
  C79,150 77,158 75,165
  L73,172
  L71,168
  C69,164 66,158 64,152
  L61,144
  C58,136 55,128 53,120
  L50,112
  C47,106 46,100 46,94
  L46,88
  C46,82 48,76 51,72
  L54,68
  C58,64 64,60 70,58
  L82,55
  C88,52 92,50 96,50
  L96,46
  C91,43 88,37 88,30
  C88,21 93,15 100,15
  Z
`;

// Professional anatomical female silhouette - back view
const FEMALE_SILHOUETTE_BACK = `
  M100,15
  C107,15 112,21 112,30
  C112,37 109,43 104,46
  L104,50
  C108,50 112,52 118,55
  L130,58
  C136,60 142,64 146,68
  L149,72
  C152,76 154,82 154,88
  L154,94
  C154,100 153,106 150,112
  L147,120
  C145,128 142,136 139,144
  L136,152
  C134,158 131,164 129,168
  L127,172
  L125,165
  C123,158 121,150 120,144
  L119,138
  C118,132 118,126 118,122
  L118,134
  C118,140 119,148 120,156
  L120,168
  C120,176 119,184 117,192
  L115,202
  C114,210 113,218 113,226
  L112,238
  C111,250 110,262 108,272
  L106,280
  C104,283 100,285 100,285
  C100,285 96,283 94,280
  L92,272
  C90,262 89,250 88,238
  L87,226
  C87,218 86,210 85,202
  L83,192
  C81,184 80,176 80,168
  L80,156
  C81,148 82,140 82,134
  L82,122
  C82,126 82,132 81,138
  L80,144
  C79,150 77,158 75,165
  L73,172
  L71,168
  C69,164 66,158 64,152
  L61,144
  C58,136 55,128 53,120
  L50,112
  C47,106 46,100 46,94
  L46,88
  C46,82 48,76 51,72
  L54,68
  C58,64 64,60 70,58
  L82,55
  C88,52 92,50 96,50
  L96,46
  C91,43 88,37 88,30
  C88,21 93,15 100,15
  Z
`;

// Muscle detail lines for male front
const MALE_MUSCLE_LINES_FRONT = `
  M85,72 Q100,78 115,72
  M75,85 Q100,92 125,85
  M92,95 L92,115
  M108,95 L108,115
  M95,118 Q100,122 105,118
  M82,155 L82,195
  M118,155 L118,195
`;

// Muscle detail lines for male back
const MALE_MUSCLE_LINES_BACK = `
  M75,72 Q100,80 125,72
  M80,90 Q100,98 120,90
  M92,105 Q100,115 108,105
  M85,145 Q100,155 115,145
  M82,165 L82,200
  M118,165 L118,200
`;

// Muscle detail lines for female front
const FEMALE_MUSCLE_LINES_FRONT = `
  M82,72 Q100,76 118,72
  M78,88 Q100,95 122,88
  M82,155 L82,195
  M118,155 L118,195
`;

// Muscle detail lines for female back  
const FEMALE_MUSCLE_LINES_BACK = `
  M78,72 Q100,78 122,72
  M80,90 Q100,96 120,90
  M85,145 Q100,152 115,145
  M82,165 L82,200
  M118,165 L118,200
`;

export const BodyPainSelector: React.FC<BodyPainSelectorProps> = ({
  selectedAreas,
  onChange,
  language = 'cs',
  gender = 'male',
}) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  
  // Temporary state for the bottom sheet
  const [tempIntensity, setTempIntensity] = useState(5);
  const [tempIsNew, setTempIsNew] = useState(true);
  const [tempPainType, setTempPainType] = useState<'muscle' | 'joint' | 'tendon' | null>(null);
  const [tempSide, setTempSide] = useState<'left' | 'right' | 'both'>('both');

  // Determine which silhouette and positions to use
  const isFemale = gender === 'female';

  const t = {
    front: language === 'cs' ? 'Zepředu' : 'Front',
    back: language === 'cs' ? 'Zezadu' : 'Back',
    left: language === 'cs' ? 'Levá' : 'Left',
    right: language === 'cs' ? 'Pravá' : 'Right',
    both: language === 'cs' ? 'Obě strany' : 'Both sides',
    new: language === 'cs' ? 'Nová' : 'New',
    known: language === 'cs' ? 'Známá' : 'Known',
    muscle: language === 'cs' ? 'Svalová bolest' : 'Muscle',
    joint: language === 'cs' ? 'Kloubní' : 'Joint',
    tendon: language === 'cs' ? 'Šlachová' : 'Tendon',
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
            ? cn(getIntensityColor(selection.intensity), "opacity-85")
            : "fill-white/10 stroke-white/40 hover:fill-white/25"
        )}
        strokeWidth={isSelected ? 0 : 1}
        strokeDasharray={isSelected ? "none" : "3,2"}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 8px currentColor)' : undefined,
        }}
        whileHover={{ scale: 1.15, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openZoneSheet(zoneId, side)}
        initial={false}
        animate={isSelected ? { 
          scale: [1, 1.08, 1],
          transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
        } : {}}
      />
    );
  };

  const currentZones = BODY_ZONES[view];
  const currentPositions = isFemale 
    ? ZONE_POSITIONS_FEMALE[view] 
    : ZONE_POSITIONS_MALE[view];
  
  // Select appropriate silhouette and muscle lines
  const silhouettePath = isFemale
    ? (view === 'front' ? FEMALE_SILHOUETTE_FRONT : FEMALE_SILHOUETTE_BACK)
    : (view === 'front' ? MALE_SILHOUETTE_FRONT : MALE_SILHOUETTE_BACK);
    
  const muscleLines = isFemale
    ? (view === 'front' ? FEMALE_MUSCLE_LINES_FRONT : FEMALE_MUSCLE_LINES_BACK)
    : (view === 'front' ? MALE_MUSCLE_LINES_FRONT : MALE_MUSCLE_LINES_BACK);

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
        <svg viewBox="0 0 200 300" className="w-52 h-80 sm:w-60 sm:h-[360px]">
          <defs>
            {/* Dark body fill gradient */}
            <linearGradient id="bodyFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="50%" stopColor="#3a3a3a" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
            
            {/* Subtle highlight for depth */}
            <filter id="bodyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Glow filter for selected areas */}
            <filter id="painGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Body silhouette - dark fill with light outline */}
          <motion.path 
            d={silhouettePath}
            fill="url(#bodyFillGradient)" 
            className="stroke-white/60"
            strokeWidth="1.5"
            filter="url(#bodyGlow)"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            key={`${view}-${gender}`}
          />

          {/* Anatomical muscle detail lines */}
          <motion.path 
            d={muscleLines}
            fill="none" 
            className="stroke-white/30"
            strokeWidth="0.75"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            key={`lines-${view}-${gender}`}
          />

          {/* Spine line for back view */}
          {view === 'back' && (
            <path 
              d="M100,52 L100,145" 
              className="stroke-white/25"
              strokeWidth="1"
              strokeDasharray="4,3"
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
                    : selection.painType === 'tendon'
                      ? (language === 'cs' ? 'šlacha' : 'tendon')
                      : null;
                
                return (
                  <motion.div
                    key={`${selection.area}-${selection.side}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "flex flex-col gap-2 p-3 rounded-xl border-2 bg-card/50 backdrop-blur-sm",
                      getIntensityBorder(selection.intensity)
                    )}
                  >
                    {/* Main row - icon, label, actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn(
                          "w-3 h-3 rounded-full shrink-0",
                          getIntensityBgColor(selection.intensity)
                        )} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{label}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(selection)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(selection)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Second row - metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium">{selection.intensity}/10</span>
                      {selection.isNew !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-muted">
                          {selection.isNew ? t.new : t.known}
                        </span>
                      )}
                      {painTypeLabel && (
                        <span className="px-1.5 py-0.5 rounded bg-muted">{painTypeLabel}</span>
                      )}
                      {selection.side && selection.side !== 'both' && (
                        <span className="px-1.5 py-0.5 rounded bg-muted">
                          {selection.side === 'left' ? t.left : t.right}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>{t.mild}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>4-6</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>{t.severe}</span>
        </div>
      </div>

      {/* Bottom Sheet for Zone Details */}
      <Drawer open={!!activeZone} onOpenChange={(open) => !open && setActiveZone(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle>
              {activeZone && getZoneLabel(activeZone, activeSide)}
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="px-6 pb-6 space-y-6 overflow-y-auto">
            {/* Intensity Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t.intensity}</span>
                <span className={cn(
                  "text-2xl font-bold",
                  tempIntensity <= 3 ? "text-amber-400" : tempIntensity <= 6 ? "text-orange-500" : "text-red-500"
                )}>
                  {tempIntensity}
                </span>
              </div>
              <Slider
                value={[tempIntensity]}
                onValueChange={([v]) => setTempIntensity(v)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t.mild}</span>
                <span>{t.severe}</span>
              </div>
            </div>

            {/* Side Selection (for bilateral zones) */}
            {activeZone && isZoneBilateral(activeZone) && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Strana</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'right', 'both'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTempSide(s)}
                      className={cn(
                        "py-2.5 px-3 text-sm rounded-xl border-2 transition-all",
                        tempSide === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      {s === 'left' ? t.left : s === 'right' ? t.right : t.both}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New/Known Toggle */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Typ bolesti</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTempIsNew(true)}
                  className={cn(
                    "py-2.5 px-4 text-sm rounded-xl border-2 transition-all",
                    tempIsNew
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                  )}
                >
                  🆕 {t.new}
                </button>
                <button
                  type="button"
                  onClick={() => setTempIsNew(false)}
                  className={cn(
                    "py-2.5 px-4 text-sm rounded-xl border-2 transition-all",
                    !tempIsNew
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                  )}
                >
                  🔄 {t.known}
                </button>
              </div>
            </div>

            {/* Pain Type Toggle */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Druh bolesti</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTempPainType(tempPainType === 'muscle' ? null : 'muscle')}
                  className={cn(
                    "py-2.5 px-2 text-xs rounded-xl border-2 transition-all",
                    tempPainType === 'muscle'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                  )}
                >
                  💪 {t.muscle}
                </button>
                <button
                  type="button"
                  onClick={() => setTempPainType(tempPainType === 'joint' ? null : 'joint')}
                  className={cn(
                    "py-2.5 px-2 text-xs rounded-xl border-2 transition-all",
                    tempPainType === 'joint'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                  )}
                >
                  🦴 {t.joint}
                </button>
                <button
                  type="button"
                  onClick={() => setTempPainType(tempPainType === 'tendon' ? null : 'tendon')}
                  className={cn(
                    "py-2.5 px-2 text-xs rounded-xl border-2 transition-all",
                    tempPainType === 'tendon'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted hover:border-muted-foreground/30"
                  )}
                >
                  🦵 {t.tendon}
                </button>
              </div>
            </div>
          </div>
          
          <DrawerFooter className="flex-row gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 rounded-xl">
                {t.cancel}
              </Button>
            </DrawerClose>
            <Button onClick={handleConfirm} className="flex-1 rounded-xl">
              {t.add}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
