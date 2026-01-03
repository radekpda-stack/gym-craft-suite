/**
 * Shared constants for nutrition logging
 */

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Snídaně', icon: '🌅' },
  { id: 'lunch', label: 'Oběd', icon: '☀️' },
  { id: 'dinner', label: 'Večeře', icon: '🌙' },
  { id: 'snack', label: 'Svačina', icon: '🍎' },
] as const;

export const PORTION_SIZES = [
  { id: 'small', label: 'Malá', icon: '🥄' },
  { id: 'medium', label: 'Střední', icon: '🍽️' },
  { id: 'large', label: 'Velká', icon: '🍳' },
] as const;

export const QUALITY_OPTIONS = [
  { id: 'good', label: 'Kvalitní', icon: '💚' },
  { id: 'normal', label: 'Běžná', icon: '🟡' },
  { id: 'poor', label: 'Nezdravá', icon: '🔴' },
] as const;

export const SATIATION_OPTIONS = [
  { id: 'still_hungry', label: 'Stále hlad', icon: '😕' },
  { id: 'just_right', label: 'Akorát', icon: '😊' },
  { id: 'overate', label: 'Přejedl/a', icon: '😫' },
] as const;

export const DRINK_TYPES = [
  { id: 'water', label: 'Voda', icon: '💧' },
  { id: 'sugary', label: 'Slazené', icon: '🥤' },
  { id: 'sports', label: 'Ionťák', icon: '⚡' },
  { id: 'alcohol', label: 'Alkohol', icon: '🍺' },
  { id: 'other', label: 'Jiné', icon: '🧃' },
] as const;

export const DRINK_AMOUNTS = [200, 300, 500, 750] as const;

export const COFFEE_TYPES = [
  { id: 'espresso', label: 'Espresso', icon: '☕' },
  { id: 'cappuccino', label: 'Cappuccino', icon: '🥛' },
  { id: 'tea', label: 'Čaj', icon: '🍵' },
  { id: 'energy', label: 'Energy', icon: '⚡' },
  { id: 'other', label: 'Jiné', icon: '🫖' },
] as const;

// Label mappings for display
export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
};

export const PORTION_LABELS: Record<string, string> = {
  small: 'Malá',
  medium: 'Střední',
  large: 'Velká',
};

export const QUALITY_LABELS: Record<string, string> = {
  good: 'Kvalitní',
  normal: 'Běžná',
  poor: 'Nezdravá',
};

export const SATIATION_LABELS: Record<string, string> = {
  still_hungry: 'Stále hlad',
  just_right: 'Akorát',
  overate: 'Přejedl/a',
};

export const DRINK_LABELS: Record<string, string> = {
  water: 'Voda',
  sugary: 'Slazené',
  sports: 'Ionťák',
  alcohol: 'Alkohol',
  other: 'Jiné',
};

export const COFFEE_LABELS: Record<string, string> = {
  espresso: 'Espresso',
  cappuccino: 'Cappuccino',
  tea: 'Čaj',
  energy: 'Energy drink',
  other: 'Jiné',
};

// Types
export type MealTypeId = typeof MEAL_TYPES[number]['id'];
export type PortionSizeId = typeof PORTION_SIZES[number]['id'];
export type QualityId = typeof QUALITY_OPTIONS[number]['id'];
export type SatiationId = typeof SATIATION_OPTIONS[number]['id'];
export type DrinkTypeId = typeof DRINK_TYPES[number]['id'];
export type CoffeeTypeId = typeof COFFEE_TYPES[number]['id'];
