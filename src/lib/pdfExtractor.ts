import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export interface PDFTextExtractResult {
  success: boolean;
  text?: string;
  error?: string;
  pageCount?: number;
}

/**
 * Extract text content from a PDF file using pdf.js
 */
export async function extractTextFromPDF(file: File): Promise<PDFTextExtractResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textParts: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items, preserving some structure
      let lastY: number | null = null;
      const pageText: string[] = [];
      
      for (const item of textContent.items) {
        if ('str' in item && item.str) {
          // Check if this is a new line (different Y position)
          const currentY = 'transform' in item ? item.transform[5] : null;
          
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageText.push('\n');
          }
          
          pageText.push(item.str);
          
          if (currentY !== null) {
            lastY = currentY;
          }
        }
      }
      
      textParts.push(pageText.join(' '));
    }
    
    const fullText = textParts.join('\n\n');
    
    return {
      success: true,
      text: fullText,
      pageCount: numPages,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se přečíst PDF soubor',
    };
  }
}

/**
 * Extract text from multiple PDF files
 */
export async function extractTextFromMultiplePDFs(
  files: File[]
): Promise<Map<string, PDFTextExtractResult>> {
  const results = new Map<string, PDFTextExtractResult>();
  
  await Promise.all(
    files.map(async (file) => {
      const result = await extractTextFromPDF(file);
      results.set(file.name, result);
    })
  );
  
  return results;
}
