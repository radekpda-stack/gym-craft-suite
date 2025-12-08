// PDF Measurement Parser for body composition data
// Extracts values from PDF reports with consistent format

export interface ParsedMeasurementData {
  clientName?: string;
  date?: string;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  basalMetabolism?: number;
  visceralFat?: number;
  rawText?: string;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedMeasurementData;
  error?: string;
  warnings?: string[];
}

// Parse number from text, handling both dot and comma as decimal separator
function parseNumber(text: string): number | undefined {
  if (!text) return undefined;
  
  // Remove any non-numeric characters except dots, commas, and minus
  const cleaned = text.replace(/[^\d.,\-]/g, '').trim();
  if (!cleaned) return undefined;
  
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  const num = parseFloat(normalized);
  
  return isNaN(num) ? undefined : num;
}

// Extract client name from PDF text
function extractClientName(text: string): string | undefined {
  // Common patterns for name in measurement PDFs
  const patterns = [
    /(?:jméno|name|klient|client)[:\s]*([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)/i,
    /(?:^|\n)([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)(?:\s|$)/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

// Extract date from PDF text
function extractDate(text: string): string | undefined {
  // Common date patterns (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
  const patterns = [
    /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/,
    /(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, a, b, c] = match;
      // Determine format and return as YYYY-MM-DD
      if (a.length === 4) {
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      } else {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
    }
  }
  
  return undefined;
}

// Extract weight value
function extractWeight(text: string): number | undefined {
  const patterns = [
    /(?:váha|weight|hmotnost)[:\s]*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(\d+[.,]\d+)\s*kg(?:\s|$)/i,
    /(?:tělesná\s*hmotnost)[:\s]*(\d+[.,]?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseNumber(match[1]);
    }
  }
  
  return undefined;
}

// Extract body fat percentage
function extractBodyFat(text: string): number | undefined {
  const patterns = [
    /(?:tělesn[ýá]\s*tuk|body\s*fat|tuk)[:\s]*(\d+[.,]?\d*)\s*%?/i,
    /(\d+[.,]\d+)\s*%\s*(?:tuk|fat)/i,
    /(?:procento\s*tuku|fat\s*percentage)[:\s]*(\d+[.,]?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseNumber(match[1]);
      // Body fat should be reasonable percentage
      if (value && value > 0 && value < 70) {
        return value;
      }
    }
  }
  
  return undefined;
}

// Extract muscle mass
function extractMuscleMass(text: string): number | undefined {
  const patterns = [
    /(?:svalov[áa]\s*hmota|muscle\s*mass|svaly)[:\s]*(\d+[.,]?\d*)\s*(?:kg)?/i,
    /(?:beztuk[ová]+\s*hmota|lean\s*mass)[:\s]*(\d+[.,]?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseNumber(match[1]);
    }
  }
  
  return undefined;
}

// Extract basal metabolism
function extractBasalMetabolism(text: string): number | undefined {
  const patterns = [
    /(?:bazální\s*metabolismus|basal\s*metabol|bmr)[:\s]*(\d+)\s*(?:kcal)?/i,
    /(?:klidov[ýá]\s*metabolismus)[:\s]*(\d+)/i,
    /(\d{3,4})\s*kcal(?:\/den)?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseNumber(match[1]);
      // BMR should be reasonable (800-4000 kcal)
      if (value && value > 800 && value < 4000) {
        return value;
      }
    }
  }
  
  return undefined;
}

// Extract visceral fat level
function extractVisceralFat(text: string): number | undefined {
  const patterns = [
    /(?:viscerální\s*tuk|visceral\s*fat|útrobní\s*tuk)[:\s]*(\d+)/i,
    /(?:visc\.?\s*fat)[:\s]*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseNumber(match[1]);
      // Visceral fat level is usually 1-60
      if (value && value > 0 && value <= 60) {
        return value;
      }
    }
  }
  
  return undefined;
}

// Main parser function
export function parseMeasurementPDF(text: string): ParseResult {
  const warnings: string[] = [];
  
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'PDF neobsahuje žádný text',
    };
  }

  const data: ParsedMeasurementData = {
    rawText: text,
    clientName: extractClientName(text),
    date: extractDate(text),
    weight: extractWeight(text),
    bodyFatPercentage: extractBodyFat(text),
    muscleMass: extractMuscleMass(text),
    basalMetabolism: extractBasalMetabolism(text),
    visceralFat: extractVisceralFat(text),
  };

  // Validate we got at least some measurements
  const hasAnyMeasurement = data.weight || data.bodyFatPercentage || 
    data.muscleMass || data.basalMetabolism || data.visceralFat;

  if (!hasAnyMeasurement) {
    return {
      success: false,
      error: 'Nepodařilo se najít žádné měřené hodnoty v PDF',
      warnings,
    };
  }

  // Add warnings for missing optional values
  if (!data.clientName) {
    warnings.push('Jméno klienta nebylo nalezeno v PDF');
  }
  if (!data.date) {
    warnings.push('Datum měření nebylo nalezeno, bude použito aktuální datum');
  }

  return {
    success: true,
    data,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Compare measurement with previous and determine trend
export type TrendType = 'better' | 'worse' | 'stagnation';

export interface MeasurementComparison {
  field: string;
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  difference: number | null;
  percentChange: number | null;
  trend: TrendType | null;
  unit: string;
}

export function compareMeasurements(
  current: ParsedMeasurementData,
  previous?: {
    weight?: number | null;
    body_fat_percentage?: number | null;
    muscle_mass?: number | null;
    basal_metabolism?: number | null;
    visceral_fat?: number | null;
  }
): MeasurementComparison[] {
  const comparisons: MeasurementComparison[] = [];

  const fields = [
    { key: 'weight', prevKey: 'weight', label: 'Váha', unit: 'kg', lowerIsBetter: true },
    { key: 'bodyFatPercentage', prevKey: 'body_fat_percentage', label: 'Tělesný tuk', unit: '%', lowerIsBetter: true },
    { key: 'muscleMass', prevKey: 'muscle_mass', label: 'Svalová hmota', unit: 'kg', lowerIsBetter: false },
    { key: 'basalMetabolism', prevKey: 'basal_metabolism', label: 'Bazální metabolismus', unit: 'kcal', lowerIsBetter: false },
    { key: 'visceralFat', prevKey: 'visceral_fat', label: 'Viscerální tuk', unit: '', lowerIsBetter: true },
  ];

  for (const field of fields) {
    const currentValue = current[field.key as keyof ParsedMeasurementData] as number | undefined;
    const previousValue = previous?.[field.prevKey as keyof typeof previous] as number | null | undefined;

    if (currentValue === undefined) continue;

    let trend: TrendType | null = null;
    let difference: number | null = null;
    let percentChange: number | null = null;

    if (previousValue !== undefined && previousValue !== null) {
      difference = currentValue - previousValue;
      percentChange = previousValue !== 0 ? (difference / previousValue) * 100 : null;
      
      const threshold = 0.5; // 0.5% change threshold for stagnation
      if (Math.abs(percentChange ?? 0) < threshold) {
        trend = 'stagnation';
      } else if (field.lowerIsBetter) {
        trend = difference < 0 ? 'better' : 'worse';
      } else {
        trend = difference > 0 ? 'better' : 'worse';
      }
    }

    comparisons.push({
      field: field.key,
      label: field.label,
      currentValue: currentValue ?? null,
      previousValue: previousValue ?? null,
      difference,
      percentChange,
      trend,
      unit: field.unit,
    });
  }

  return comparisons;
}
