// PDF Font loader for Czech diacritics support
// Uses Roboto font which has full Czech character support

import jsPDF from "jspdf";

// Font cache
let fontCache: { 
  regular?: string; 
  bold?: string;
} = {};
let fontsLoaded = false;
let fontLoadAttempted = false;

// Roboto fonts from jsDelivr CDN (reliable, supports Czech)
const FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-700-normal.woff",
};

/**
 * Converts ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Loads fonts and caches them
 */
export async function loadPdfFonts(): Promise<void> {
  if (fontsLoaded) {
    return;
  }
  
  if (fontLoadAttempted) {
    return;
  }
  
  fontLoadAttempted = true;

  try {
    const [regularResponse, boldResponse] = await Promise.all([
      fetch(FONT_URLS.regular),
      fetch(FONT_URLS.bold),
    ]);

    if (!regularResponse.ok || !boldResponse.ok) {
      throw new Error("Font fetch failed");
    }

    const [regularBuffer, boldBuffer] = await Promise.all([
      regularResponse.arrayBuffer(),
      boldResponse.arrayBuffer(),
    ]);

    fontCache = {
      regular: arrayBufferToBase64(regularBuffer),
      bold: arrayBufferToBase64(boldBuffer),
    };
    
    fontsLoaded = true;
  } catch (error) {
    console.warn("Failed to load PDF fonts, using fallback:", error);
    fontsLoaded = false;
  }
}

/**
 * Legacy alias for backward compatibility
 */
export async function loadRobotoFonts(): Promise<void> {
  return loadPdfFonts();
}

/**
 * Registers Inter font (actually Roboto with Czech support)
 */
export function registerInterFont(doc: jsPDF): void {
  if (!fontCache.regular || !fontCache.bold) {
    console.warn("Fonts not loaded, using built-in helvetica");
    doc.setFont("helvetica");
    return;
  }

  try {
    // Add regular font
    doc.addFileToVFS("Roboto-Regular.woff", fontCache.regular);
    doc.addFont("Roboto-Regular.woff", "Roboto", "normal");

    // Add bold font
    doc.addFileToVFS("Roboto-Bold.woff", fontCache.bold);
    doc.addFont("Roboto-Bold.woff", "Roboto", "bold");

    // Set as default
    doc.setFont("Roboto");
  } catch (error) {
    console.warn("Failed to register fonts:", error);
    doc.setFont("helvetica");
  }
}

/**
 * Registers Roboto fonts
 */
export function registerRobotoFont(doc: jsPDF): void {
  registerInterFont(doc);
}

/**
 * Check if fonts are ready
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded && !!fontCache.regular && !!fontCache.bold;
}
