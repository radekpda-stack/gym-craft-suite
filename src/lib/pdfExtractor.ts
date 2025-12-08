export interface PDFTextExtractResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Extract text content from a PDF file using basic parsing
 * This is a simple extraction that works for text-based PDFs
 */
export async function extractTextFromPDF(file: File): Promise<PDFTextExtractResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Decode as text
    const decoder = new TextDecoder('latin1');
    const rawText = decoder.decode(uint8Array);
    
    // Extract text from PDF text objects
    const textParts: string[] = [];
    
    // Pattern 1: Text in parentheses (most common)
    const textInParens = rawText.match(/\(([^\\)]{2,})\)/g);
    if (textInParens) {
      for (const match of textInParens) {
        const text = match.slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')');
        
        // Filter out binary/control characters
        if (/^[\x20-\x7E\xA0-\xFF\s]+$/.test(text) && text.trim().length > 1) {
          textParts.push(text);
        }
      }
    }
    
    // Pattern 2: Text in angle brackets (hex encoded)
    const hexText = rawText.match(/<([0-9A-Fa-f]+)>/g);
    if (hexText) {
      for (const match of hexText) {
        const hex = match.slice(1, -1);
        if (hex.length >= 4 && hex.length % 2 === 0) {
          let decoded = '';
          for (let i = 0; i < hex.length; i += 2) {
            const charCode = parseInt(hex.substr(i, 2), 16);
            if (charCode >= 32 && charCode <= 126) {
              decoded += String.fromCharCode(charCode);
            }
          }
          if (decoded.trim().length > 1) {
            textParts.push(decoded);
          }
        }
      }
    }
    
    // Pattern 3: BT...ET text blocks with Tj/TJ operators
    const textBlocks = rawText.match(/BT[\s\S]*?ET/g);
    if (textBlocks) {
      for (const block of textBlocks) {
        // Extract Tj strings
        const tjMatches = block.match(/\(([^)]+)\)\s*Tj/g);
        if (tjMatches) {
          for (const tj of tjMatches) {
            const content = tj.match(/\(([^)]+)\)/)?.[1];
            if (content && content.trim().length > 1) {
              textParts.push(content);
            }
          }
        }
        
        // Extract TJ arrays
        const tjArrays = block.match(/\[(.*?)\]\s*TJ/g);
        if (tjArrays) {
          for (const arr of tjArrays) {
            const strings = arr.match(/\(([^)]+)\)/g);
            if (strings) {
              for (const s of strings) {
                const content = s.slice(1, -1);
                if (content.trim()) {
                  textParts.push(content);
                }
              }
            }
          }
        }
      }
    }
    
    // Combine and clean up
    let fullText = textParts.join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If we couldn't extract much, try a simpler approach
    if (fullText.length < 50) {
      // Look for common patterns in measurement PDFs
      const patterns = [
        /(\d+[.,]\d+)\s*kg/gi,
        /(\d+[.,]\d+)\s*%/gi,
        /(\d+)\s*kcal/gi,
        /váha|weight|hmotnost/gi,
        /tuk|fat/gi,
        /sval|muscle/gi,
        /metabol/gi,
      ];
      
      const matches: string[] = [];
      for (const pattern of patterns) {
        const found = rawText.match(pattern);
        if (found) {
          matches.push(...found);
        }
      }
      
      if (matches.length > 0) {
        fullText = matches.join(' ') + ' ' + fullText;
      }
    }
    
    if (!fullText || fullText.length < 10) {
      return {
        success: false,
        error: 'Nepodařilo se extrahovat text z PDF. Zkontrolujte, že PDF obsahuje text a není pouze naskenovaný obrázek.',
      };
    }
    
    return {
      success: true,
      text: fullText,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se přečíst PDF soubor',
    };
  }
}
