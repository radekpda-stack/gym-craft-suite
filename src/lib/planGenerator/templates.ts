// Training plan templates by goal and frequency

import { 
  GeneratedPlan, 
  GeneratedWeek, 
  GeneratedDay, 
  GeneratedWorkout, 
  GeneratedExercise,
  GenerationParams,
  BlockType 
} from './types';
import { getExerciseForPattern } from './exerciseMapping';

// Get rep/set schemes based on goal
function getScheme(goal: string, blockType: BlockType, level: string) {
  const schemes: Record<string, Record<BlockType, { sets: number; repsMin: number; repsMax: number; rpe?: number; rir?: number; rest: number }>> = {
    strength: {
      prep: { sets: 2, repsMin: 8, repsMax: 12, rest: 30 },
      primary: { sets: 4, repsMin: 3, repsMax: 5, rpe: 8, rest: 180 },
      secondary: { sets: 4, repsMin: 4, repsMax: 6, rpe: 7, rest: 150 },
      accessory: { sets: 3, repsMin: 6, repsMax: 10, rir: 2, rest: 90 },
      core: { sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
      conditioning: { sets: 6, repsMin: 30, repsMax: 45, rest: 90 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
    hypertrophy: {
      prep: { sets: 2, repsMin: 10, repsMax: 15, rest: 30 },
      primary: { sets: 4, repsMin: 6, repsMax: 10, rir: 2, rest: 120 },
      secondary: { sets: 3, repsMin: 8, repsMax: 12, rir: 2, rest: 90 },
      accessory: { sets: 3, repsMin: 10, repsMax: 15, rir: 1, rest: 60 },
      core: { sets: 3, repsMin: 12, repsMax: 20, rest: 45 },
      conditioning: { sets: 4, repsMin: 45, repsMax: 60, rest: 60 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
    conditioning: {
      prep: { sets: 2, repsMin: 10, repsMax: 15, rest: 20 },
      primary: { sets: 3, repsMin: 8, repsMax: 12, rpe: 7, rest: 90 },
      secondary: { sets: 3, repsMin: 10, repsMax: 15, rpe: 6, rest: 60 },
      accessory: { sets: 2, repsMin: 12, repsMax: 15, rest: 45 },
      core: { sets: 3, repsMin: 15, repsMax: 20, rest: 30 },
      conditioning: { sets: 8, repsMin: 30, repsMax: 60, rest: 60 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
    fat_loss: {
      prep: { sets: 2, repsMin: 10, repsMax: 15, rest: 20 },
      primary: { sets: 3, repsMin: 10, repsMax: 15, rir: 2, rest: 60 },
      secondary: { sets: 3, repsMin: 12, repsMax: 15, rir: 2, rest: 45 },
      accessory: { sets: 2, repsMin: 15, repsMax: 20, rest: 30 },
      core: { sets: 3, repsMin: 15, repsMax: 20, rest: 30 },
      conditioning: { sets: 10, repsMin: 30, repsMax: 45, rest: 45 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
    ocr: {
      prep: { sets: 2, repsMin: 10, repsMax: 15, rest: 20 },
      primary: { sets: 4, repsMin: 5, repsMax: 8, rpe: 7, rest: 120 },
      secondary: { sets: 3, repsMin: 8, repsMax: 12, rpe: 7, rest: 90 },
      accessory: { sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
      core: { sets: 3, repsMin: 15, repsMax: 20, rest: 45 },
      conditioning: { sets: 8, repsMin: 45, repsMax: 60, rest: 60 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
    rehab_general: {
      prep: { sets: 3, repsMin: 10, repsMax: 15, rest: 30 },
      primary: { sets: 3, repsMin: 10, repsMax: 12, rir: 3, rest: 90 },
      secondary: { sets: 3, repsMin: 12, repsMax: 15, rir: 3, rest: 60 },
      accessory: { sets: 2, repsMin: 12, repsMax: 15, rir: 3, rest: 45 },
      core: { sets: 3, repsMin: 10, repsMax: 15, rest: 45 },
      conditioning: { sets: 4, repsMin: 60, repsMax: 90, rest: 60 },
      cooldown: { sets: 2, repsMin: 30, repsMax: 60, rest: 0 },
    },
    general_fitness: {
      prep: { sets: 2, repsMin: 10, repsMax: 15, rest: 30 },
      primary: { sets: 3, repsMin: 8, repsMax: 12, rir: 2, rest: 90 },
      secondary: { sets: 3, repsMin: 10, repsMax: 15, rir: 2, rest: 60 },
      accessory: { sets: 2, repsMin: 12, repsMax: 15, rest: 45 },
      core: { sets: 3, repsMin: 12, repsMax: 15, rest: 45 },
      conditioning: { sets: 6, repsMin: 45, repsMax: 60, rest: 60 },
      cooldown: { sets: 1, repsMin: 30, repsMax: 60, rest: 0 },
    },
  };
  
  // Adjust for beginner
  const scheme = schemes[goal]?.[blockType] || schemes.general_fitness[blockType];
  if (level === 'beginner') {
    return {
      ...scheme,
      sets: Math.max(2, scheme.sets - 1),
      rpe: scheme.rpe ? scheme.rpe - 1 : undefined,
      rir: scheme.rir ? scheme.rir + 1 : undefined,
    };
  }
  if (level === 'advanced') {
    return {
      ...scheme,
      sets: scheme.sets + 1,
    };
  }
  return scheme;
}

// Generate prep block
function generatePrepBlock(params: GenerationParams, focus: string, usedExercises: string[]): GeneratedExercise[] {
  const exercises: GeneratedExercise[] = [];
  const scheme = getScheme(params.goal, 'prep', params.level);
  let order = 0;
  
  // Add 2-3 prep exercises based on focus
  const prepPatterns = focus.includes('lower') || focus.includes('squat') || focus.includes('hinge') 
    ? ['prep', 'prep', 'prep'] 
    : ['prep', 'prep'];
  
  prepPatterns.forEach(() => {
    const name = getExerciseForPattern('prep', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(name);
    exercises.push({
      exercise_name: name,
      block_type: 'prep',
      sets: scheme.sets,
      reps_min: scheme.repsMin,
      reps_max: scheme.repsMax,
      rest_seconds: scheme.rest,
      notes: 'Aktivace a mobilita',
      sort_order: order++,
    });
  });
  
  return exercises;
}

// Generate main workout for full body day
function generateFullBodyWorkout(params: GenerationParams, dayFocus: 'A' | 'B' | 'C', usedExercises: string[]): GeneratedExercise[] {
  const exercises: GeneratedExercise[] = [];
  let order = 0;
  
  // Prep
  exercises.push(...generatePrepBlock(params, 'full', usedExercises));
  order = exercises.length;
  
  const primaryScheme = getScheme(params.goal, 'primary', params.level);
  const secondaryScheme = getScheme(params.goal, 'secondary', params.level);
  const accessoryScheme = getScheme(params.goal, 'accessory', params.level);
  const coreScheme = getScheme(params.goal, 'core', params.level);
  
  if (dayFocus === 'A') {
    // Squat + Push dominant
    const squat = getExerciseForPattern('squat', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(squat);
    exercises.push({
      exercise_name: squat,
      block_type: 'primary',
      ...primaryScheme,
      reps_min: primaryScheme.repsMin,
      reps_max: primaryScheme.repsMax,
      rest_seconds: primaryScheme.rest,
      tempo: params.goal === 'hypertrophy' ? '3-0-1' : undefined,
      notes: 'Hlavní cvik - squat pattern',
      sort_order: order++,
    });
    
    const push = getExerciseForPattern('push_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(push);
    exercises.push({
      exercise_name: push,
      block_type: 'secondary',
      ...secondaryScheme,
      reps_min: secondaryScheme.repsMin,
      reps_max: secondaryScheme.repsMax,
      rest_seconds: secondaryScheme.rest,
      notes: 'Sekundární cvik - push',
      sort_order: order++,
    });
    
    const pull = getExerciseForPattern('pull_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(pull);
    exercises.push({
      exercise_name: pull,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Row varianta pro balance',
      sort_order: order++,
    });
    
    const singleLeg = getExerciseForPattern('leg_accessory', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(singleLeg);
    exercises.push({
      exercise_name: singleLeg,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Unilaterální práce nohou',
      sort_order: order++,
    });
    
  } else if (dayFocus === 'B') {
    // Hinge + Pull dominant
    const hinge = getExerciseForPattern('hinge', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(hinge);
    exercises.push({
      exercise_name: hinge,
      block_type: 'primary',
      ...primaryScheme,
      reps_min: primaryScheme.repsMin,
      reps_max: primaryScheme.repsMax,
      rest_seconds: primaryScheme.rest,
      notes: 'Hlavní cvik - hinge pattern',
      sort_order: order++,
    });
    
    const pull = getExerciseForPattern('pull_vertical', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(pull);
    exercises.push({
      exercise_name: pull,
      block_type: 'secondary',
      ...secondaryScheme,
      reps_min: secondaryScheme.repsMin,
      reps_max: secondaryScheme.repsMax,
      rest_seconds: secondaryScheme.rest,
      notes: 'Sekundární cvik - vertical pull',
      sort_order: order++,
    });
    
    const press = getExerciseForPattern('push_vertical', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(press);
    exercises.push({
      exercise_name: press,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Press varianta',
      sort_order: order++,
    });
    
    const hamstring = getExerciseForPattern('leg_accessory', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(hamstring);
    exercises.push({
      exercise_name: hamstring,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Hamstring práce',
      sort_order: order++,
    });
    
  } else {
    // Mixed / Light day
    const squat = getExerciseForPattern('squat', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(squat);
    exercises.push({
      exercise_name: squat,
      block_type: 'primary',
      sets: primaryScheme.sets - 1,
      reps_min: primaryScheme.repsMin + 2,
      reps_max: primaryScheme.repsMax + 2,
      rpe: primaryScheme.rpe ? primaryScheme.rpe - 1 : undefined,
      rir: primaryScheme.rir ? primaryScheme.rir + 1 : undefined,
      rest_seconds: primaryScheme.rest - 30,
      notes: 'Lehčí squat varianta',
      sort_order: order++,
    });
    
    const pull = getExerciseForPattern('pull_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(pull);
    exercises.push({
      exercise_name: pull,
      block_type: 'secondary',
      ...secondaryScheme,
      reps_min: secondaryScheme.repsMin,
      reps_max: secondaryScheme.repsMax,
      rest_seconds: secondaryScheme.rest,
      notes: 'Objem upper back',
      sort_order: order++,
    });
    
    const push = getExerciseForPattern('push_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(push);
    exercises.push({
      exercise_name: push,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Push objem',
      sort_order: order++,
    });
    
    const arms = getExerciseForPattern('upper_accessory', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(arms);
    exercises.push({
      exercise_name: arms,
      block_type: 'accessory',
      ...accessoryScheme,
      reps_min: accessoryScheme.repsMin,
      reps_max: accessoryScheme.repsMax,
      rest_seconds: accessoryScheme.rest,
      notes: 'Doplňkový cvik paže/ramena',
      sort_order: order++,
    });
  }
  
  // Core
  const core = getExerciseForPattern('core', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(core);
  exercises.push({
    exercise_name: core,
    block_type: 'core',
    ...coreScheme,
    reps_min: coreScheme.repsMin,
    reps_max: coreScheme.repsMax,
    rest_seconds: coreScheme.rest,
    notes: 'Core stabilizace',
    sort_order: order++,
  });
  
  // Optional conditioning based on time and goal
  if (params.sessionDuration >= 60 && ['conditioning', 'fat_loss', 'ocr'].includes(params.goal)) {
    const condScheme = getScheme(params.goal, 'conditioning', params.level);
    const cond = getExerciseForPattern('conditioning', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(cond);
    exercises.push({
      exercise_name: cond,
      block_type: 'conditioning',
      ...condScheme,
      reps_min: condScheme.repsMin,
      reps_max: condScheme.repsMax,
      rest_seconds: condScheme.rest,
      notes: 'Intervaly dle cíle',
      sort_order: order++,
    });
  }
  
  return exercises;
}

// Generate upper body workout
function generateUpperWorkout(params: GenerationParams, variant: 'push' | 'pull' | 'mixed', usedExercises: string[]): GeneratedExercise[] {
  const exercises: GeneratedExercise[] = [];
  let order = 0;
  
  exercises.push(...generatePrepBlock(params, 'upper', usedExercises));
  order = exercises.length;
  
  const primaryScheme = getScheme(params.goal, 'primary', params.level);
  const secondaryScheme = getScheme(params.goal, 'secondary', params.level);
  const accessoryScheme = getScheme(params.goal, 'accessory', params.level);
  const coreScheme = getScheme(params.goal, 'core', params.level);
  
  if (variant === 'push' || variant === 'mixed') {
    const benchPress = getExerciseForPattern('push_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(benchPress);
    exercises.push({
      exercise_name: benchPress,
      block_type: 'primary',
      ...primaryScheme,
      reps_min: primaryScheme.repsMin,
      reps_max: primaryScheme.repsMax,
      rest_seconds: primaryScheme.rest,
      notes: 'Hlavní tlak',
      sort_order: order++,
    });
  }
  
  if (variant === 'pull' || variant === 'mixed') {
    const row = getExerciseForPattern('pull_horizontal', params.equipment, params.painAreas, usedExercises);
    usedExercises.push(row);
    exercises.push({
      exercise_name: row,
      block_type: variant === 'mixed' ? 'secondary' : 'primary',
      ...(variant === 'mixed' ? secondaryScheme : primaryScheme),
      reps_min: (variant === 'mixed' ? secondaryScheme : primaryScheme).repsMin,
      reps_max: (variant === 'mixed' ? secondaryScheme : primaryScheme).repsMax,
      rest_seconds: (variant === 'mixed' ? secondaryScheme : primaryScheme).rest,
      notes: 'Hlavní tah',
      sort_order: order++,
    });
  }
  
  // Secondary
  const secondary = variant === 'push' 
    ? getExerciseForPattern('push_vertical', params.equipment, params.painAreas, usedExercises)
    : getExerciseForPattern('pull_vertical', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(secondary);
  exercises.push({
    exercise_name: secondary,
    block_type: 'secondary',
    ...secondaryScheme,
    reps_min: secondaryScheme.repsMin,
    reps_max: secondaryScheme.repsMax,
    rest_seconds: secondaryScheme.rest,
    sort_order: order++,
  });
  
  // Accessories
  const acc1 = getExerciseForPattern('upper_accessory', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(acc1);
  exercises.push({
    exercise_name: acc1,
    block_type: 'accessory',
    ...accessoryScheme,
    reps_min: accessoryScheme.repsMin,
    reps_max: accessoryScheme.repsMax,
    rest_seconds: accessoryScheme.rest,
    sort_order: order++,
  });
  
  const acc2 = getExerciseForPattern('upper_accessory', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(acc2);
  exercises.push({
    exercise_name: acc2,
    block_type: 'accessory',
    ...accessoryScheme,
    reps_min: accessoryScheme.repsMin,
    reps_max: accessoryScheme.repsMax,
    rest_seconds: accessoryScheme.rest,
    sort_order: order++,
  });
  
  // Core
  const core = getExerciseForPattern('core', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(core);
  exercises.push({
    exercise_name: core,
    block_type: 'core',
    ...coreScheme,
    reps_min: coreScheme.repsMin,
    reps_max: coreScheme.repsMax,
    rest_seconds: coreScheme.rest,
    sort_order: order++,
  });
  
  return exercises;
}

// Generate lower body workout
function generateLowerWorkout(params: GenerationParams, variant: 'squat' | 'hinge', usedExercises: string[]): GeneratedExercise[] {
  const exercises: GeneratedExercise[] = [];
  let order = 0;
  
  exercises.push(...generatePrepBlock(params, 'lower', usedExercises));
  order = exercises.length;
  
  const primaryScheme = getScheme(params.goal, 'primary', params.level);
  const secondaryScheme = getScheme(params.goal, 'secondary', params.level);
  const accessoryScheme = getScheme(params.goal, 'accessory', params.level);
  const coreScheme = getScheme(params.goal, 'core', params.level);
  
  // Primary
  const primary = variant === 'squat'
    ? getExerciseForPattern('squat', params.equipment, params.painAreas, usedExercises)
    : getExerciseForPattern('hinge', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(primary);
  exercises.push({
    exercise_name: primary,
    block_type: 'primary',
    ...primaryScheme,
    reps_min: primaryScheme.repsMin,
    reps_max: primaryScheme.repsMax,
    rest_seconds: primaryScheme.rest,
    tempo: params.goal === 'hypertrophy' ? '3-0-1' : undefined,
    sort_order: order++,
  });
  
  // Secondary (opposite pattern)
  const secondary = variant === 'squat'
    ? getExerciseForPattern('hinge', params.equipment, params.painAreas, usedExercises)
    : getExerciseForPattern('squat', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(secondary);
  exercises.push({
    exercise_name: secondary,
    block_type: 'secondary',
    ...secondaryScheme,
    reps_min: secondaryScheme.repsMin,
    reps_max: secondaryScheme.repsMax,
    rest_seconds: secondaryScheme.rest,
    sort_order: order++,
  });
  
  // Accessories
  const acc1 = getExerciseForPattern('leg_accessory', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(acc1);
  exercises.push({
    exercise_name: acc1,
    block_type: 'accessory',
    ...accessoryScheme,
    reps_min: accessoryScheme.repsMin,
    reps_max: accessoryScheme.repsMax,
    rest_seconds: accessoryScheme.rest,
    sort_order: order++,
  });
  
  const acc2 = getExerciseForPattern('leg_accessory', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(acc2);
  exercises.push({
    exercise_name: acc2,
    block_type: 'accessory',
    ...accessoryScheme,
    reps_min: accessoryScheme.repsMin,
    reps_max: accessoryScheme.repsMax,
    rest_seconds: accessoryScheme.rest,
    sort_order: order++,
  });
  
  // Core / Carry
  const core = getExerciseForPattern('core', params.equipment, params.painAreas, usedExercises);
  usedExercises.push(core);
  exercises.push({
    exercise_name: core,
    block_type: 'core',
    ...coreScheme,
    reps_min: coreScheme.repsMin,
    reps_max: coreScheme.repsMax,
    rest_seconds: coreScheme.rest,
    notes: 'Core / Carry',
    sort_order: order++,
  });
  
  return exercises;
}

// Main generation function
export function generatePlan(params: GenerationParams): GeneratedPlan {
  const weeks: GeneratedWeek[] = [];
  const { sessionsPerWeek, weeksCount, goal, sessionDuration, split } = params;
  
  // Determine deload weeks
  const deloadWeeks = new Set<number>();
  if (weeksCount >= 4) deloadWeeks.add(4);
  if (weeksCount >= 8) deloadWeeks.add(8);
  if (weeksCount >= 12) deloadWeeks.add(12);
  
  for (let w = 1; w <= weeksCount; w++) {
    const isDeload = deloadWeeks.has(w);
    const weekDays: GeneratedDay[] = [];
    
    for (let d = 1; d <= sessionsPerWeek; d++) {
      const usedExercises: string[] = [];
      let dayExercises: GeneratedExercise[] = [];
      let dayFocus = '';
      
      // Determine workout structure based on split and frequency
      if (split === 'upper_lower' && sessionsPerWeek >= 4) {
        // Upper/Lower split
        if (d % 2 === 1) {
          // Lower days
          const variant = d === 1 ? 'squat' : 'hinge';
          dayExercises = generateLowerWorkout(params, variant as 'squat' | 'hinge', usedExercises);
          dayFocus = variant === 'squat' ? 'Squat dominant' : 'Hinge dominant';
        } else {
          // Upper days
          const variant = d === 2 ? 'push' : 'pull';
          dayExercises = generateUpperWorkout(params, variant as 'push' | 'pull' | 'mixed', usedExercises);
          dayFocus = variant === 'push' ? 'Push dominant' : 'Pull dominant';
        }
      } else {
        // Full body (default for most frequencies)
        const dayVariant = ['A', 'B', 'C'][d % 3] as 'A' | 'B' | 'C';
        dayExercises = generateFullBodyWorkout(params, dayVariant, usedExercises);
        dayFocus = dayVariant === 'A' ? 'Squat + Push' : dayVariant === 'B' ? 'Hinge + Pull' : 'Mixed';
      }
      
      // Apply deload modifications
      if (isDeload) {
        dayExercises = dayExercises.map(ex => ({
          ...ex,
          sets: Math.max(2, ex.sets - 1),
          rpe: ex.rpe ? ex.rpe - 1 : undefined,
          rir: ex.rir ? ex.rir + 1 : undefined,
          notes: ex.notes ? `${ex.notes} (Deload)` : 'Deload',
        }));
      }
      
      const workout: GeneratedWorkout = {
        name: `Trénink ${String.fromCharCode(64 + d)}`,
        focus: dayFocus,
        estimated_duration: sessionDuration,
        exercises: dayExercises,
      };
      
      weekDays.push({
        day_number: d,
        focus: dayFocus,
        workouts: [workout],
      });
    }
    
    weeks.push({
      week_number: w,
      is_deload: isDeload,
      focus_note: isDeload ? 'Deload týden - snížený objem a intenzita' : undefined,
      days: weekDays,
    });
  }
  
  return { weeks };
}
