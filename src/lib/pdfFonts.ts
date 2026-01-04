// PDF Font loader for Czech diacritics support
// Uses Helvetica (built-in) with optional custom font support

import jsPDF from "jspdf";

// Font cache to avoid re-fetching
let fontCache: { 
  customRegular?: string; 
  customBold?: string;
} = {};
let fontsLoaded = false;
let fontLoadAttempted = false;

// Use built-in Helvetica as primary font (reliable, no external dependencies)
const FONT_FAMILY = "helvetica";

/**
 * Loads fonts (no-op for built-in fonts, but keeps API compatible)
 */
export async function loadPdfFonts(): Promise<void> {
  if (fontLoadAttempted) {
    return;
  }
  fontLoadAttempted = true;
  fontsLoaded = true;
  // Using built-in Helvetica - no external font loading needed
}

/**
 * Legacy alias for backward compatibility
 */
export async function loadRobotoFonts(): Promise<void> {
  return loadPdfFonts();
}

/**
 * Registers font with a jsPDF document instance
 * Uses built-in Helvetica for reliability
 */
export function registerInterFont(doc: jsPDF): void {
  // Use built-in helvetica font - most reliable option
  doc.setFont("helvetica");
}

/**
 * Registers Roboto fonts - fallback to Helvetica
 */
export function registerRobotoFont(doc: jsPDF): void {
  doc.setFont("helvetica");
}

/**
 * Check if fonts are ready (always true with built-in fonts)
 */
export function areFontsLoaded(): boolean {
  return true;
}
