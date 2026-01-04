// PDF Font loader for Czech diacritics support
// Uses Inter font (same as app) with Roboto as fallback

import jsPDF from "jspdf";

// Font cache to avoid re-fetching
let fontCache: { 
  interRegular?: string; 
  interSemiBold?: string;
  robotoRegular?: string; 
  robotoBold?: string; 
} = {};
let fontsLoaded = false;

// Google Fonts URLs
const FONT_URLS = {
  // Inter (app font) - Latin Extended for Czech
  interRegular: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.ttf",
  interSemiBold: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50qjMa1ZL7.ttf",
  // Roboto as fallback
  robotoRegular: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf",
  robotoBold: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf",
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
 * Loads Inter and Roboto fonts and caches them
 */
export async function loadPdfFonts(): Promise<void> {
  if (fontsLoaded && fontCache.interRegular && fontCache.interSemiBold) {
    return;
  }

  try {
    const [interRegular, interSemiBold, robotoRegular, robotoBold] = await Promise.all([
      fetchFontAsBase64(FONT_URLS.interRegular),
      fetchFontAsBase64(FONT_URLS.interSemiBold),
      fetchFontAsBase64(FONT_URLS.robotoRegular),
      fetchFontAsBase64(FONT_URLS.robotoBold),
    ]);

    fontCache = { interRegular, interSemiBold, robotoRegular, robotoBold };
    fontsLoaded = true;
  } catch (error) {
    console.error("Failed to load PDF fonts:", error);
    throw new Error("Could not load PDF fonts");
  }
}

/**
 * Legacy alias for backward compatibility
 */
export async function loadRobotoFonts(): Promise<void> {
  return loadPdfFonts();
}

/**
 * Registers Inter font with a jsPDF document instance (preferred)
 * Must be called after loadPdfFonts()
 */
export function registerInterFont(doc: jsPDF): void {
  if (!fontCache.interRegular || !fontCache.interSemiBold) {
    console.warn("Inter fonts not loaded, falling back to Roboto");
    registerRobotoFont(doc);
    return;
  }

  // Add regular font
  doc.addFileToVFS("Inter-Regular.ttf", fontCache.interRegular);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");

  // Add semi-bold font (used as bold)
  doc.addFileToVFS("Inter-SemiBold.ttf", fontCache.interSemiBold);
  doc.addFont("Inter-SemiBold.ttf", "Inter", "bold");

  // Set as default
  doc.setFont("Inter");
}

/**
 * Registers Roboto fonts with a jsPDF document instance (fallback)
 * Must be called after loadPdfFonts()
 */
export function registerRobotoFont(doc: jsPDF): void {
  if (!fontCache.robotoRegular || !fontCache.robotoBold) {
    console.warn("Fonts not loaded, using default Helvetica");
    return;
  }

  // Add regular font
  doc.addFileToVFS("Roboto-Regular.ttf", fontCache.robotoRegular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

  // Add bold font
  doc.addFileToVFS("Roboto-Bold.ttf", fontCache.robotoBold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  // Set as default
  doc.setFont("Roboto");
}

/**
 * Check if fonts are already loaded
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded && !!fontCache.interRegular && !!fontCache.interSemiBold;
}
