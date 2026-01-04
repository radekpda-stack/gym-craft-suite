// PDF Theme utilities for dynamic colors based on app theme

export type ThemeId = 
  | 'theme-nike' 
  | 'theme-nike-volt' 
  | 'theme-arctic-pro' 
  | 'theme-light-minimal' 
  | 'theme-frost-minimal'
  | 'default';

export interface PdfColors {
  primary: [number, number, number];
  primaryDark: [number, number, number];
  primaryLight: [number, number, number];
  text: [number, number, number];
  textMuted: [number, number, number];
  textLight: [number, number, number];
  background: [number, number, number];
  backgroundAlt: [number, number, number];
  white: [number, number, number];
  border: [number, number, number];
}

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return [f(0), f(8), f(4)];
}

// Theme color mappings
const themeColors: Record<ThemeId, { primary: [number, number, number]; primaryDark: [number, number, number]; primaryLight: [number, number, number]; border: [number, number, number] }> = {
  // Nike - Orange (HSL: 24 95% 53%)
  'theme-nike': {
    primary: hslToRgb(24, 95, 53),
    primaryDark: hslToRgb(24, 95, 43),
    primaryLight: hslToRgb(24, 95, 63),
    border: hslToRgb(24, 50, 80),
  },
  // Nike Volt - Neon Green (HSL: 66 100% 50%)
  'theme-nike-volt': {
    primary: hslToRgb(66, 100, 50),
    primaryDark: hslToRgb(66, 100, 40),
    primaryLight: hslToRgb(66, 100, 60),
    border: hslToRgb(66, 50, 80),
  },
  // Arctic Pro - Cyan (HSL: 190 100% 50%)
  'theme-arctic-pro': {
    primary: hslToRgb(190, 100, 50),
    primaryDark: hslToRgb(190, 100, 40),
    primaryLight: hslToRgb(190, 100, 60),
    border: hslToRgb(190, 50, 80),
  },
  // Light Minimal - Blue (HSL: 221 83% 53%)
  'theme-light-minimal': {
    primary: hslToRgb(221, 83, 53),
    primaryDark: hslToRgb(221, 83, 43),
    primaryLight: hslToRgb(221, 83, 63),
    border: hslToRgb(221, 50, 85),
  },
  // Frost Minimal - Sky Blue (HSL: 199 89% 48%)
  'theme-frost-minimal': {
    primary: hslToRgb(199, 89, 48),
    primaryDark: hslToRgb(199, 89, 38),
    primaryLight: hslToRgb(199, 89, 58),
    border: hslToRgb(199, 50, 80),
  },
  // Default (Arctic Pro)
  'default': {
    primary: hslToRgb(190, 100, 50),
    primaryDark: hslToRgb(190, 100, 40),
    primaryLight: hslToRgb(190, 100, 60),
    border: hslToRgb(190, 50, 80),
  },
};

/**
 * Get PDF colors based on the current app theme
 */
export function getPdfColorsFromTheme(themeId?: string): PdfColors {
  const theme = (themeId as ThemeId) || 'default';
  const colors = themeColors[theme] || themeColors['default'];

  return {
    ...colors,
    // Standard colors for light PDF background
    text: [15, 23, 42], // slate-900
    textMuted: [100, 116, 139], // slate-500
    textLight: [148, 163, 184], // slate-400
    background: [250, 250, 250], // neutral-50
    backgroundAlt: [245, 245, 245], // neutral-100
    white: [255, 255, 255],
  };
}

/**
 * Get current theme ID from document
 */
export function getCurrentThemeId(): ThemeId {
  if (typeof document === 'undefined') return 'default';
  
  const classList = document.documentElement.classList;
  
  if (classList.contains('theme-nike')) return 'theme-nike';
  if (classList.contains('theme-nike-volt')) return 'theme-nike-volt';
  if (classList.contains('theme-arctic-pro')) return 'theme-arctic-pro';
  if (classList.contains('theme-light-minimal')) return 'theme-light-minimal';
  if (classList.contains('theme-frost-minimal')) return 'theme-frost-minimal';
  
  return 'default';
}

/**
 * Get theme display name for UI
 */
export function getThemeDisplayName(themeId: ThemeId, language: 'cs' | 'en' = 'cs'): string {
  const names: Record<ThemeId, { cs: string; en: string }> = {
    'theme-nike': { cs: 'Nike (Oranžová)', en: 'Nike (Orange)' },
    'theme-nike-volt': { cs: 'Nike Volt (Zelená)', en: 'Nike Volt (Green)' },
    'theme-arctic-pro': { cs: 'Arctic Pro (Cyan)', en: 'Arctic Pro (Cyan)' },
    'theme-light-minimal': { cs: 'Light Minimal (Modrá)', en: 'Light Minimal (Blue)' },
    'theme-frost-minimal': { cs: 'Frost Minimal (Světle modrá)', en: 'Frost Minimal (Sky Blue)' },
    'default': { cs: 'Výchozí', en: 'Default' },
  };
  
  return names[themeId]?.[language] || names['default'][language];
}
