// Exercise mapping by pattern and equipment

type ExerciseVariant = {
  name: string;
  equipment: string[];
  contraindications?: string[];
};

// Squat pattern exercises
export const SQUAT_EXERCISES: ExerciseVariant[] = [
  { name: 'Back Squat', equipment: ['barbell'], contraindications: ['knee'] },
  { name: 'Front Squat', equipment: ['barbell'], contraindications: ['knee'] },
  { name: 'Goblet Squat', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'Leg Press', equipment: ['machine'], contraindications: ['knee'] },
  { name: 'Hack Squat', equipment: ['machine'] },
  { name: 'Box Squat', equipment: ['barbell', 'bodyweight'] },
  { name: 'Bulgarian Split Squat', equipment: ['dumbbell', 'kettlebell', 'bodyweight'] },
  { name: 'Bodyweight Squat', equipment: ['bodyweight'] },
];

// Hinge pattern exercises
export const HINGE_EXERCISES: ExerciseVariant[] = [
  { name: 'Deadlift', equipment: ['barbell'], contraindications: ['lower_back'] },
  { name: 'Romanian Deadlift', equipment: ['barbell', 'dumbbell'] },
  { name: 'Trap Bar Deadlift', equipment: ['barbell'] },
  { name: 'DB Romanian Deadlift', equipment: ['dumbbell'] },
  { name: 'KB Swing', equipment: ['kettlebell'] },
  { name: 'Hip Thrust', equipment: ['barbell', 'bodyweight', 'machine'] },
  { name: 'Glute Bridge', equipment: ['bodyweight'] },
  { name: 'Back Extension', equipment: ['machine', 'bodyweight'], contraindications: ['lower_back'] },
  { name: 'Good Morning', equipment: ['barbell'], contraindications: ['lower_back'] },
];

// Push horizontal exercises
export const PUSH_HORIZONTAL_EXERCISES: ExerciseVariant[] = [
  { name: 'Bench Press', equipment: ['barbell', 'bench'] },
  { name: 'DB Bench Press', equipment: ['dumbbell', 'bench'] },
  { name: 'Incline Bench Press', equipment: ['barbell', 'bench'] },
  { name: 'Incline DB Press', equipment: ['dumbbell', 'bench'] },
  { name: 'Machine Chest Press', equipment: ['machine'] },
  { name: 'Push-up', equipment: ['bodyweight'] },
  { name: 'Landmine Press', equipment: ['barbell'] },
  { name: 'DB Floor Press', equipment: ['dumbbell'], contraindications: ['shoulder'] },
];

// Push vertical exercises
export const PUSH_VERTICAL_EXERCISES: ExerciseVariant[] = [
  { name: 'Overhead Press', equipment: ['barbell'], contraindications: ['shoulder'] },
  { name: 'DB Shoulder Press', equipment: ['dumbbell'], contraindications: ['shoulder'] },
  { name: 'Landmine Press', equipment: ['barbell'] },
  { name: 'Arnold Press', equipment: ['dumbbell'], contraindications: ['shoulder'] },
  { name: 'Machine Shoulder Press', equipment: ['machine'], contraindications: ['shoulder'] },
  { name: 'Pike Push-up', equipment: ['bodyweight'], contraindications: ['shoulder'] },
];

// Pull horizontal exercises
export const PULL_HORIZONTAL_EXERCISES: ExerciseVariant[] = [
  { name: 'Barbell Row', equipment: ['barbell'] },
  { name: 'DB Row', equipment: ['dumbbell', 'bench'] },
  { name: 'Cable Row', equipment: ['cable'] },
  { name: 'Machine Row', equipment: ['machine'] },
  { name: 'Inverted Row', equipment: ['bodyweight', 'pullup_bar'] },
  { name: 'Chest Supported Row', equipment: ['dumbbell', 'bench'] },
  { name: 'Meadows Row', equipment: ['barbell'] },
];

// Pull vertical exercises
export const PULL_VERTICAL_EXERCISES: ExerciseVariant[] = [
  { name: 'Pull-up', equipment: ['pullup_bar', 'bodyweight'] },
  { name: 'Chin-up', equipment: ['pullup_bar', 'bodyweight'] },
  { name: 'Lat Pulldown', equipment: ['cable', 'machine'] },
  { name: 'Neutral Grip Pulldown', equipment: ['cable'] },
  { name: 'Assisted Pull-up', equipment: ['machine', 'bands'] },
];

// Core exercises
export const CORE_EXERCISES: ExerciseVariant[] = [
  { name: 'Plank', equipment: ['bodyweight'] },
  { name: 'Dead Bug', equipment: ['bodyweight'] },
  { name: 'Pallof Press', equipment: ['cable', 'bands'] },
  { name: 'Ab Wheel Rollout', equipment: ['bodyweight'] },
  { name: 'Hanging Leg Raise', equipment: ['pullup_bar'] },
  { name: 'Cable Crunch', equipment: ['cable'] },
  { name: 'Bird Dog', equipment: ['bodyweight'] },
  { name: 'Side Plank', equipment: ['bodyweight'] },
  { name: 'Farmers Carry', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'Suitcase Carry', equipment: ['dumbbell', 'kettlebell'] },
];

// Accessory - legs
export const LEG_ACCESSORY_EXERCISES: ExerciseVariant[] = [
  { name: 'Leg Curl', equipment: ['machine'] },
  { name: 'Leg Extension', equipment: ['machine'], contraindications: ['knee'] },
  { name: 'Calf Raise', equipment: ['machine', 'bodyweight'] },
  { name: 'Walking Lunge', equipment: ['dumbbell', 'bodyweight'] },
  { name: 'Step-up', equipment: ['dumbbell', 'bodyweight'] },
  { name: 'Nordic Curl', equipment: ['bodyweight'] },
  { name: 'Hip Abduction', equipment: ['machine', 'bands'] },
  { name: 'Hip Adduction', equipment: ['machine', 'bands'] },
];

// Accessory - upper
export const UPPER_ACCESSORY_EXERCISES: ExerciseVariant[] = [
  { name: 'Bicep Curl', equipment: ['dumbbell', 'barbell', 'cable'] },
  { name: 'Tricep Pushdown', equipment: ['cable'] },
  { name: 'Tricep Dip', equipment: ['bodyweight'] },
  { name: 'Face Pull', equipment: ['cable', 'bands'] },
  { name: 'Lateral Raise', equipment: ['dumbbell', 'cable'] },
  { name: 'Rear Delt Fly', equipment: ['dumbbell', 'cable'] },
  { name: 'Skull Crusher', equipment: ['barbell', 'dumbbell'] },
  { name: 'Hammer Curl', equipment: ['dumbbell'] },
];

// Conditioning exercises
export const CONDITIONING_EXERCISES: ExerciseVariant[] = [
  { name: 'Rowing Intervals', equipment: ['rower'] },
  { name: 'Ski Erg Intervals', equipment: ['ski_erg'] },
  { name: 'Treadmill Intervals', equipment: ['treadmill'] },
  { name: 'Sled Push', equipment: ['treadmill_sled_mode'] },
  { name: 'Battle Ropes', equipment: ['bodyweight'] },
  { name: 'Burpees', equipment: ['bodyweight'] },
  { name: 'Box Jumps', equipment: ['bodyweight'] },
  { name: 'KB Swings (Conditioning)', equipment: ['kettlebell'] },
];

// Warm-up / Prep exercises
export const PREP_EXERCISES: ExerciseVariant[] = [
  { name: 'Hip Circle', equipment: ['bands', 'bodyweight'] },
  { name: 'Band Pull Apart', equipment: ['bands'] },
  { name: 'Glute Bridge (Activation)', equipment: ['bodyweight'] },
  { name: 'Cat-Cow', equipment: ['bodyweight'] },
  { name: 'World\'s Greatest Stretch', equipment: ['bodyweight'] },
  { name: '90/90 Hip Switch', equipment: ['bodyweight'] },
  { name: 'Thoracic Rotation', equipment: ['bodyweight'] },
  { name: 'Shoulder Dislocates', equipment: ['bands'] },
  { name: 'Goblet Squat Hold', equipment: ['kettlebell', 'dumbbell'] },
];

// Helper function to find suitable exercise
export function findExercise(
  exercises: ExerciseVariant[],
  availableEquipment: string[],
  painAreas: string[] = []
): ExerciseVariant | null {
  const suitable = exercises.filter(ex => {
    // Check if we have required equipment
    const hasEquipment = ex.equipment.some(eq => availableEquipment.includes(eq));
    if (!hasEquipment) return false;
    
    // Check contraindications
    if (ex.contraindications && painAreas.length > 0) {
      const hasContraindication = ex.contraindications.some(c => painAreas.includes(c));
      if (hasContraindication) return false;
    }
    
    return true;
  });
  
  return suitable.length > 0 ? suitable[Math.floor(Math.random() * suitable.length)] : null;
}

// Get best exercise for pattern
export function getExerciseForPattern(
  pattern: 'squat' | 'hinge' | 'push_horizontal' | 'push_vertical' | 'pull_horizontal' | 'pull_vertical' | 'core' | 'leg_accessory' | 'upper_accessory' | 'conditioning' | 'prep',
  availableEquipment: string[],
  painAreas: string[] = [],
  exclude: string[] = []
): string {
  const exerciseLists: Record<string, ExerciseVariant[]> = {
    squat: SQUAT_EXERCISES,
    hinge: HINGE_EXERCISES,
    push_horizontal: PUSH_HORIZONTAL_EXERCISES,
    push_vertical: PUSH_VERTICAL_EXERCISES,
    pull_horizontal: PULL_HORIZONTAL_EXERCISES,
    pull_vertical: PULL_VERTICAL_EXERCISES,
    core: CORE_EXERCISES,
    leg_accessory: LEG_ACCESSORY_EXERCISES,
    upper_accessory: UPPER_ACCESSORY_EXERCISES,
    conditioning: CONDITIONING_EXERCISES,
    prep: PREP_EXERCISES,
  };
  
  const exercises = exerciseLists[pattern] || [];
  const filtered = exercises.filter(ex => !exclude.includes(ex.name));
  const exercise = findExercise(filtered, availableEquipment, painAreas);
  
  return exercise?.name || exercises[0]?.name || 'Cvik';
}
