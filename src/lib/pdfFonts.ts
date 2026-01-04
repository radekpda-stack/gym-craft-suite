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

// Roboto TTF fonts from Google Fonts CDN (jsPDF requires TTF format)
const FONT_URLS = {
  regular: "https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbGmT.ttf",
  bold: "https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuaabWmT.ttf",
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
    // Reset if previous attempt failed
    if (!fontsLoaded) {
      fontLoadAttempted = false;
    } else {
      return;
    }
  }
  
  fontLoadAttempted = true;

  try {
    console.log("Loading PDF fonts...");
    const [regularResponse, boldResponse] = await Promise.all([
      fetch(FONT_URLS.regular),
      fetch(FONT_URLS.bold),
    ]);

    if (!regularResponse.ok || !boldResponse.ok) {
      throw new Error(`Font fetch failed: regular=${regularResponse.status}, bold=${boldResponse.status}`);
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
    console.log("PDF fonts loaded successfully");
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
    // Add regular font (TTF format)
    doc.addFileToVFS("Roboto-Regular.ttf", fontCache.regular);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

    // Add bold font (TTF format)
    doc.addFileToVFS("Roboto-Bold.ttf", fontCache.bold);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

    // Set as default
    doc.setFont("Roboto");
    console.log("Roboto font registered successfully");
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
