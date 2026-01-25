/**
 * Shared constants for nutrition logging
 */

export const TIME_PRESETS = [
  { label: 'Nyní', time: 'now', icon: '⏱️' },
  { label: 'Ráno', time: '07:00', icon: '🌅' },
  { label: 'Dopol.', time: '10:00', icon: '☀️' },
  { label: 'Poledne', time: '12:00', icon: '🌤️' },
  { label: 'Odpol.', time: '15:00', icon: '🍎' },
  { label: 'Večer', time: '18:00', icon: '🌙' },
] as const;

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Snídaně', icon: '🌅' },
  { id: 'lunch', label: 'Oběd', icon: '☀️' },
  { id: 'dinner', label: 'Večeře', icon: '🌙' },
  { id: 'snack', label: 'Svačina', icon: '🍎' },
] as const;

export const PORTION_SIZES = [
  { id: 'small', label: 'Malá', icon: '🥄', grams: '~100-150g' },
  { id: 'medium', label: 'Střední', icon: '🍽️', grams: '~200-300g' },
  { id: 'large', label: 'Velká', icon: '🍳', grams: '~350-500g' },
] as const;

export const PORTION_GRAMS: Record<string, string> = {
  small: '~100-150g',
  medium: '~200-300g',
  large: '~350-500g',
};

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

export const QUICK_WATER_AMOUNTS = [
  { amount: 200, label: 'Sklenice', icon: '💧' },
  { amount: 300, label: 'Hrnek', icon: '☕' },
  { amount: 500, label: 'Láhev', icon: '🍶' },
] as const;

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

// Common Czech foods for autocomplete suggestions
export const COMMON_FOODS = [
  // Snídaně
  { description: 'Ovesná kaše', category: 'breakfast' },
  { description: 'Ovesná kaše s ovocem', category: 'breakfast' },
  { description: 'Míchaná vajíčka', category: 'breakfast' },
  { description: 'Jogurt s müsli', category: 'breakfast' },
  { description: 'Pečivo s máslem', category: 'breakfast' },
  { description: 'Cottage cheese s ovocem', category: 'breakfast' },
  { description: 'Volské oko', category: 'breakfast' },
  { description: 'Tvaroh s medem', category: 'breakfast' },
  
  // Oběd/Večeře
  { description: 'Kuřecí prsa s rýží', category: 'main' },
  { description: 'Kuřecí řízek', category: 'main' },
  { description: 'Kuřecí prsa se zeleninou', category: 'main' },
  { description: 'Těstoviny s omáčkou', category: 'main' },
  { description: 'Těstoviny s kuřecím', category: 'main' },
  { description: 'Salát s tuňákem', category: 'main' },
  { description: 'Salát se zeleninou', category: 'main' },
  { description: 'Řízek s bramborovým salátem', category: 'main' },
  { description: 'Polévka', category: 'main' },
  { description: 'Hovězí s knedlíkem', category: 'main' },
  { description: 'Svíčková', category: 'main' },
  { description: 'Guláš', category: 'main' },
  { description: 'Ryba s brambory', category: 'main' },
  { description: 'Losos s rýží', category: 'main' },
  { description: 'Pizza', category: 'main' },
  { description: 'Burger', category: 'main' },
  
  // Svačiny
  { description: 'Jablko', category: 'snack' },
  { description: 'Banán', category: 'snack' },
  { description: 'Ořechy', category: 'snack' },
  { description: 'Proteinová tyčinka', category: 'snack' },
  { description: 'Jogurt', category: 'snack' },
  { description: 'Tvarohová tyčinka', category: 'snack' },
  { description: 'Zelenina', category: 'snack' },
  { description: 'Ovocný salát', category: 'snack' },
] as const;

// Types
export type MealTypeId = typeof MEAL_TYPES[number]['id'];
export type PortionSizeId = typeof PORTION_SIZES[number]['id'];
export type QualityId = typeof QUALITY_OPTIONS[number]['id'];
export type SatiationId = typeof SATIATION_OPTIONS[number]['id'];
export type DrinkTypeId = typeof DRINK_TYPES[number]['id'];
export type CoffeeTypeId = typeof COFFEE_TYPES[number]['id'];
