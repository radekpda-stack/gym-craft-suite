import { useMemo } from "react";
import { Tag, TagType } from "./useTags";

export interface TagValidationResult {
  isValid: boolean;
  missingTypes: TagType[];
  errors: string[];
  warnings: string[];
}

// Training types that don't require focus tag (matches TAG_VISIBILITY_BY_TYPE in TrainingTagStepper)
const TYPES_WITHOUT_FOCUS = ['hiit', 'cardio', 'regeneration', 'mobility', 'diagnostic'];

// Training types that don't require intensity tag - ALL types now, RPE replaces intensity
const TYPES_WITHOUT_INTENSITY = ['strength', 'functional', 'hiit', 'cardio', 'regeneration', 'mobility', 'diagnostic'];

// Training types that don't require body_part tag (auto-set or hidden in UI)
const TYPES_WITHOUT_BODY_PART = ['regeneration', 'hiit', 'cardio'];

/**
 * Validates that a training session has the required tag types based on training type:
 * - Focus tag: required unless training type is hiit, cardio, regeneration, mobility, or diagnostic
 * - Intensity tag: required unless training type is mobility or diagnostic
 * - Body part tag: required unless training type is regeneration
 */
export function useTrainingTagValidation(
  selectedTags: Tag[],
  allTags: Tag[],
  trainingType?: string | null
): TagValidationResult {
  return useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingTypes: TagType[] = [];

    // Get tag types that are selected
    const selectedTagTypes = new Set(selectedTags.map(t => t.tag_type));
    const type = trainingType?.toLowerCase() || '';

    // Check for required tag types based on training type
    const requiresFocus = !TYPES_WITHOUT_FOCUS.includes(type);
    if (requiresFocus && !selectedTagTypes.has("focus")) {
      missingTypes.push("focus");
      errors.push("Chybí tag zaměření (např. Síla, Mobilita, Kardio)");
    }

  // Intensity validation removed - RPE 1-10 replaces intensity tags
  // Historical data with intensity tags will still work for analytics

    const requiresBodyPart = !TYPES_WITHOUT_BODY_PART.includes(type);
    if (requiresBodyPart && !selectedTagTypes.has("body_part")) {
      missingTypes.push("body_part");
      errors.push("Chybí tag partie těla (např. Horní část, Dolní část)");
    }

    // Check for health-related warnings
    const healthTags = selectedTags.filter(t => t.tag_type === "health");
    if (healthTags.length > 0) {
      warnings.push(`Pozor: Trénink obsahuje zdravotní tag: ${healthTags.map(t => t.name).join(", ")}`);
    }

    // Check if training affects load
    const noLoadTags = selectedTags.filter(t => !t.affects_load);
    if (noLoadTags.length > 0 && selectedTags.every(t => !t.affects_load)) {
      warnings.push("Tento trénink nezvyšuje zátěž (regenerační)");
    }

    // Check if training affects credit
    const noCreditTags = selectedTags.filter(t => !t.affects_credit);
    if (noCreditTags.length > 0) {
      warnings.push(`Tagy bez vlivu na kredit: ${noCreditTags.map(t => t.name).join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      missingTypes,
      errors,
      warnings,
    };
  }, [selectedTags, allTags, trainingType]);
}

/**
 * Validates tag combination for a specific training session
 */
export function validateTrainingTags(
  selectedTagIds: string[],
  allTags: Tag[],
  trainingType?: string | null
): TagValidationResult {
  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingTypes: TagType[] = [];

  const selectedTagTypes = new Set(selectedTags.map(t => t.tag_type));
  const type = trainingType?.toLowerCase() || '';

  // Check for required tag types based on training type
  const requiresFocus = !TYPES_WITHOUT_FOCUS.includes(type);
  if (requiresFocus && !selectedTagTypes.has("focus")) {
    missingTypes.push("focus");
    errors.push("Chybí tag zaměření (např. Síla, Mobilita, Kardio)");
  }

  // Intensity validation removed - RPE 1-10 replaces intensity tags

  const requiresBodyPart = !TYPES_WITHOUT_BODY_PART.includes(type);
  if (requiresBodyPart && !selectedTagTypes.has("body_part")) {
    missingTypes.push("body_part");
    errors.push("Chybí tag partie těla (např. Horní část, Dolní část)");
  }

  const healthTags = selectedTags.filter(t => t.tag_type === "health");
  if (healthTags.length > 0) {
    warnings.push(`Zdravotní tag: ${healthTags.map(t => t.name).join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    missingTypes,
    errors,
    warnings,
  };
}
