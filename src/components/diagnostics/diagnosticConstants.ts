// Diagnostic form constants and types

export type DiagnosticLevel = 'quick' | 'functional' | 'deep';

export const DIAGNOSTIC_LEVELS = [
  { 
    value: 'quick' as const, 
    label: '🟢 Rychlý screening', 
    time: '5-7 min',
    description: 'Pravidelná kontrola, návrat po pauze' 
  },
  { 
    value: 'functional' as const, 
    label: '🟡 Funkční diagnostika', 
    time: '20-30 min',
    description: 'Nový klient, dlouhodobé bolesti' 
  },
  { 
    value: 'deep' as const, 
    label: '🔵 Hloubková diagnostika', 
    time: '45-60 min',
    description: 'Výkonnostní klienti, chronic pain' 
  },
];

export const MOBILITY_OPTIONS = [
  { value: 'ok', label: 'OK', color: 'bg-success/20 text-success border-success/30' },
  { value: 'limited', label: 'Omezená', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'painful', label: 'Bolestivá', color: 'bg-destructive/20 text-destructive border-destructive/30' },
];

export const PAIN_OPTIONS = [
  { value: 'none', label: 'Bez bolesti', color: 'bg-success/20 text-success border-success/30' },
  { value: 'mild', label: 'Mírná', color: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'significant', label: 'Významná', color: 'bg-destructive/20 text-destructive border-destructive/30' },
];

export const SIDE_OPTIONS = [
  { value: 'L', label: 'L' },
  { value: 'R', label: 'P' },
  { value: 'both', label: 'Obě' },
];

export const PAIN_DURATION_OPTIONS = [
  { value: 'new', label: 'Nová (<2 týdny)' },
  { value: 'longterm', label: 'Dlouhodobá (>2 měsíce)' },
  { value: 'chronic', label: 'Chronická' },
];

export const PAIN_TRIGGER_OPTIONS = [
  { value: 'rest', label: 'Klid' },
  { value: 'movement', label: 'Pohyb' },
  { value: 'load', label: 'Zátěž' },
];

export const TRAINING_STYLES = [
  'Silový trénink', 'HIIT', 'Kardio', 'Mobilita', 'Funkční trénink', 
  'Bodybuilding', 'Crossfit', 'Jóga', 'Bojové sporty', 'Jiné'
];

export const REGENERATION_METHODS = [
  'Spánek', 'Sauna', 'Masáže', 'Strečink', 'Foam rolling', 
  'Studená sprcha', 'Meditace', 'Procházky'
];

export const EATING_REGULARITY_OPTIONS = [
  { value: 'regular', label: 'Pravidelné (3-5x denně)' },
  { value: 'irregular', label: 'Nepravidelné' },
  { value: 'intermittent', label: 'Intermittent fasting' },
  { value: 'frequent', label: 'Časté (6+ jídel)' },
];

// Tabs configuration based on diagnostic level
export const TABS_CONFIG = {
  quick: ['goals', 'pain', 'conclusion'],
  functional: ['client', 'health', 'goals', 'mobility', 'pain', 'conclusion'],
  deep: ['client', 'lifestyle', 'health', 'goals', 'mobility', 'pain', 'psychology', 'nutrition', 'media', 'conclusion'],
};

export const ALL_TABS = [
  { id: 'client', label: 'Klient', icon: 'User' },
  { id: 'lifestyle', label: 'Životní styl', icon: 'Activity' },
  { id: 'health', label: 'Zdraví', icon: 'Heart' },
  { id: 'goals', label: 'Cíle', icon: 'Target' },
  { id: 'mobility', label: 'Mobilita', icon: 'Activity' },
  { id: 'pain', label: 'Bolest', icon: 'AlertTriangle' },
  { id: 'psychology', label: 'Psychika', icon: 'Brain' },
  { id: 'nutrition', label: 'Strava', icon: 'Apple' },
  { id: 'media', label: 'Foto/Video', icon: 'Camera' },
  { id: 'conclusion', label: 'Závěr', icon: 'ClipboardCheck' },
];

// Mobility areas configuration
export const MOBILITY_AREAS = [
  { field: 'mobilityAnkles', label: 'Kotníky', dbField: 'mobility_ankles' },
  { field: 'mobilityHips', label: 'Kyčle', dbField: 'mobility_hips' },
  { field: 'mobilityThoracic', label: 'Hrudní páteř', dbField: 'mobility_thoracic' },
  { field: 'mobilityShoulders', label: 'Ramena', dbField: 'mobility_shoulders' },
  { field: 'coreStability', label: 'Stabilita středu', dbField: 'core_stability' },
];

export const MOVEMENT_QUALITY_AREAS = [
  { field: 'squatQuality', label: 'Dřep', dbField: 'squat' },
  { field: 'lungeQuality', label: 'Výpad', dbField: 'lunge' },
  { field: 'pushQuality', label: 'Tlak', dbField: 'push' },
  { field: 'pullQuality', label: 'Tah', dbField: 'pull' },
  { field: 'hipHingeQuality', label: 'Hip hinge', dbField: 'hip_hinge' },
];

// Pain areas configuration
export const PAIN_AREAS = [
  { field: 'painAnkle', label: 'Kotník', dbField: 'pain_ankle' },
  { field: 'painKnee', label: 'Koleno', dbField: 'pain_knee' },
  { field: 'painHip', label: 'Kyčel', dbField: 'pain_hip' },
  { field: 'painSi', label: 'SI kloub', dbField: 'pain_si' },
  { field: 'painLumbar', label: 'Bedra', dbField: 'pain_lumbar' },
  { field: 'painThoracic', label: 'Hrudní páteř', dbField: 'pain_thoracic' },
  { field: 'painShoulder', label: 'Rameno', dbField: 'pain_shoulder' },
  { field: 'painNeck', label: 'Krk', dbField: 'pain_neck' },
];
