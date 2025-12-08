/**
 * Image Measurement Parser using OCR via Lovable AI Edge Function
 * Extracts body composition values from photos/screenshots
 */

import { ParsedMeasurementData, ParseResult } from './pdfMeasurementParser';
import { supabase } from '@/integrations/supabase/client';

interface OCRExtractionResult {
  clientName?: string;
  date?: string;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  basalMetabolism?: number;
  visceralFat?: number;
  rawText?: string;
}

/**
 * Convert image file to base64 data URL
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract measurement data from image using AI OCR via edge function
 */
export async function parseImageMeasurement(file: File): Promise<ParseResult> {
  try {
    const imageBase64 = await imageToBase64(file);
    
    const { data, error } = await supabase.functions.invoke('ocr-measurement', {
      body: { imageBase64 },
    });

    if (error) {
      throw new Error('Nepodařilo se analyzovat obrázek');
    }

    if (!data.success) {
      throw new Error(data.error || 'Nepodařilo se zpracovat obrázek');
    }

    const extractedData: OCRExtractionResult = data.data;

    const hasAnyMeasurement = 
      extractedData.weight != null ||
      extractedData.bodyFatPercentage != null ||
      extractedData.muscleMass != null ||
      extractedData.basalMetabolism != null ||
      extractedData.visceralFat != null;

    if (!hasAnyMeasurement) {
      return {
        success: false,
        error: 'Nepodařilo se najít žádné měřené hodnoty v obrázku',
        warnings: ['Zkontrolujte, že obrázek obsahuje čitelné hodnoty měření'],
      };
    }

    const warnings: string[] = [];
    if (!extractedData.clientName) warnings.push('Jméno klienta nebylo nalezeno');
    if (!extractedData.date) warnings.push('Datum měření nebylo nalezeno');

    return {
      success: true,
      data: {
        clientName: extractedData.clientName || undefined,
        date: extractedData.date || undefined,
        weight: extractedData.weight ?? undefined,
        bodyFatPercentage: extractedData.bodyFatPercentage ?? undefined,
        muscleMass: extractedData.muscleMass ?? undefined,
        basalMetabolism: extractedData.basalMetabolism ?? undefined,
        visceralFat: extractedData.visceralFat ?? undefined,
        rawText: extractedData.rawText || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se zpracovat obrázek',
    };
  }
}

export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
  return imageTypes.includes(file.type.toLowerCase()) || 
    /\.(jpg|jpeg|png|heic|heif)$/i.test(file.name);
}

export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function getSupportedFileTypes(): string {
  return '.pdf,.jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,application/pdf';
}
