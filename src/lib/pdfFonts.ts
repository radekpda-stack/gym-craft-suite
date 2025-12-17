// PDF Font loader for Czech diacritics support
// Uses Roboto font which has full Central European character support

import jsPDF from "jspdf";

// Font cache to avoid re-fetching
let fontCache: { regular?: string; bold?: string } = {};
let fontsLoaded = false;

// Google Fonts URLs for Roboto (Latin Extended which includes Czech)
const FONT_URLS = {
  regular: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf",
  bold: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf",
};

/**
 * Fetches a font file and converts it to base64
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Loads Roboto fonts and caches them
 */
export async function loadRobotoFonts(): Promise<void> {
  if (fontsLoaded && fontCache.regular && fontCache.bold) {
    return;
  }

  try {
    const [regular, bold] = await Promise.all([
      fetchFontAsBase64(FONT_URLS.regular),
      fetchFontAsBase64(FONT_URLS.bold),
    ]);

    fontCache = { regular, bold };
    fontsLoaded = true;
  } catch (error) {
    console.error("Failed to load Roboto fonts:", error);
    throw new Error("Could not load PDF fonts");
  }
}

/**
 * Registers Roboto fonts with a jsPDF document instance
 * Must be called after loadRobotoFonts()
 */
export function registerRobotoFont(doc: jsPDF): void {
  if (!fontCache.regular || !fontCache.bold) {
    console.warn("Fonts not loaded, using default Helvetica");
    return;
  }

  // Add regular font
  doc.addFileToVFS("Roboto-Regular.ttf", fontCache.regular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

  // Add bold font
  doc.addFileToVFS("Roboto-Bold.ttf", fontCache.bold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  // Set as default
  doc.setFont("Roboto");
}

/**
 * Check if fonts are already loaded
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded && !!fontCache.regular && !!fontCache.bold;
}
