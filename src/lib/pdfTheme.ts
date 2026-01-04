// PDF Theme utilities - Elegant dark colors on white background

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

/**
 * Elegant PDF colors - dark, sophisticated, luxurious
 * Consistent across all themes for professional look
 */
export function getPdfColorsFromTheme(_themeId?: string): PdfColors {
  // Elegant dark color palette - consistent for all themes
  return {
    // Dark slate as primary - sophisticated and elegant
    primary: [30, 41, 59],       // slate-800 - deep, elegant
    primaryDark: [15, 23, 42],   // slate-900 - darkest
    primaryLight: [51, 65, 85],  // slate-700 - slightly lighter
    
    // Text colors - crisp and readable
    text: [15, 23, 42],          // slate-900 - main text
    textMuted: [71, 85, 105],    // slate-600 - secondary text
    textLight: [100, 116, 139],  // slate-500 - light text
    
    // Backgrounds - clean white base
    background: [248, 250, 252], // slate-50 - subtle off-white
    backgroundAlt: [241, 245, 249], // slate-100 - alternating rows
    white: [255, 255, 255],
    
    // Borders - subtle and refined
    border: [226, 232, 240],     // slate-200
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
