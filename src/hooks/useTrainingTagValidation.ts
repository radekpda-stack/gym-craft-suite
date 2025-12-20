import { useMemo } from "react";
import { Tag, TagType } from "./useTags";

export interface TagValidationResult {
  isValid: boolean;
  missingTypes: TagType[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates that a training session has the required tag types:
 * - At least 1 focus tag
 * - At least 1 intensity tag
 * - At least 1 body_part tag
 */
export function useTrainingTagValidation(
  selectedTags: Tag[],
  allTags: Tag[]
): TagValidationResult {
  return useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingTypes: TagType[] = [];

    // Get tag types that are selected
    const selectedTagTypes = new Set(selectedTags.map(t => t.tag_type));

    // Check for required tag types
    if (!selectedTagTypes.has("focus")) {
      missingTypes.push("focus");
      errors.push("Chybí tag zaměření (např. Síla, Mobilita, Kardio)");
    }

    if (!selectedTagTypes.has("intensity")) {
      missingTypes.push("intensity");
      errors.push("Chybí tag intenzity (Lehký, Střední, Těžký)");
    }

    if (!selectedTagTypes.has("body_part")) {
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
  }, [selectedTags, allTags]);
}

/**
 * Validates tag combination for a specific training session
 */
export function validateTrainingTags(
  selectedTagIds: string[],
  allTags: Tag[]
): TagValidationResult {
  const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingTypes: TagType[] = [];

  const selectedTagTypes = new Set(selectedTags.map(t => t.tag_type));

  if (!selectedTagTypes.has("focus")) {
    missingTypes.push("focus");
    errors.push("Chybí tag zaměření (např. Síla, Mobilita, Kardio)");
  }

  if (!selectedTagTypes.has("intensity")) {
    missingTypes.push("intensity");
    errors.push("Chybí tag intenzity (Lehký, Střední, Těžký)");
  }

  if (!selectedTagTypes.has("body_part")) {
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
