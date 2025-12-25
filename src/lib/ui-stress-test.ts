/**
 * UI Stress Test Mode
 * 
 * Provides utilities for testing UI with extreme data conditions:
 * - Long texts (150-300 characters)
 * - Long words without spaces (UUID/tokens)
 * - Large amounts of data
 * - Empty states
 */

// Feature flag for stress test mode
export const UI_STRESS_TEST_KEY = 'ui_stress_test_mode';

export function isStressTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(UI_STRESS_TEST_KEY) === 'true';
}

export function enableStressTestMode(): void {
  localStorage.setItem(UI_STRESS_TEST_KEY, 'true');
  window.location.reload();
}

export function disableStressTestMode(): void {
  localStorage.removeItem(UI_STRESS_TEST_KEY);
  window.location.reload();
}

export function toggleStressTestMode(): void {
  if (isStressTestMode()) {
    disableStressTestMode();
  } else {
    enableStressTestMode();
  }
}

// Generate stress test data
export const STRESS_TEST_DATA = {
  // Long text (200 characters)
  longText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.',
  
  // Extra long text (300 characters)
  extraLongText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
  
  // Long word without spaces (UUID-like)
  longToken: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  
  // UUID
  uuid: '550e8400-e29b-41d4-a716-446655440000-550e8400-e29b-41d4-a716',
  
  // Long client name
  longClientName: 'Jan Novák-Procházka Starší z Velkého Meziříčí-Vrchlabí',
  
  // Long exercise name
  longExerciseName: 'Unilaterální bulharský dřep s jednoručkou v overhead pozici s exterotací ramene',
  
  // Long email
  longEmail: 'jan.novak.prochazka.starsi.z.velkeho.mezirici@example-dlouha-domena.cz',
  
  // Long phone
  longPhone: '+420 123 456 789 / +421 987 654 321',
  
  // Long notes
  longNotes: 'Klient má problémy s kolenem od fotbalového zranění z roku 2019. Doporučeno vyhýbat se hlubokým dřepům a nárazovým cvikům. Preferuje ranní tréninky, nejlépe mezi 7-9 hodinou. Alergie na latex.',
  
  // Currency with many digits
  largeCurrency: 999999999.99,
  
  // Large count
  largeCount: 99999,
} as const;

// Apply stress test data to an object
export function applyStressTestOverrides<T extends Record<string, unknown>>(
  data: T,
  overrides: Partial<Record<keyof T, keyof typeof STRESS_TEST_DATA>>
): T {
  if (!isStressTestMode()) return data;
  
  const result = { ...data };
  for (const [key, stressKey] of Object.entries(overrides)) {
    if (stressKey && STRESS_TEST_DATA[stressKey as keyof typeof STRESS_TEST_DATA]) {
      (result as Record<string, unknown>)[key] = STRESS_TEST_DATA[stressKey as keyof typeof STRESS_TEST_DATA];
    }
  }
  return result;
}

// Generate array of stress test items
export function generateStressTestItems<T>(
  generator: (index: number) => T,
  count: number = 50
): T[] {
  if (!isStressTestMode()) return [];
  return Array.from({ length: count }, (_, i) => generator(i));
}

// Stress test badge for UI
export function getStressTestBadge(): { show: boolean; label: string } {
  return {
    show: isStressTestMode(),
    label: '🔬 UI STRESS TEST',
  };
}
