import html2canvas from 'html2canvas';
import type { ExportFormat, ExportDimensions, EXPORT_FORMATS } from '@/types/socialExport';

interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  filename?: string;
}

const DIMENSIONS: Record<ExportFormat, ExportDimensions> = {
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Stories' },
  'facebook': { width: 1200, height: 630, label: 'Facebook' },
  'twitter': { width: 1600, height: 900, label: 'Twitter / X' },
};

export async function exportCardAsImage(
  elementRef: React.RefObject<HTMLElement>,
  options: ExportOptions
): Promise<void> {
  if (!elementRef.current) {
    throw new Error('Element not found');
  }

  const { format, quality = 0.95, filename } = options;
  const dimensions = DIMENSIONS[format];

  // Calculate scale to get desired output dimensions
  const element = elementRef.current;
  const currentWidth = element.offsetWidth;
  const scale = dimensions.width / currentWidth;

  const canvas = await html2canvas(element, {
    scale: scale * 2, // Higher quality
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  });

  // Create final canvas with exact dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = dimensions.width;
  finalCanvas.height = dimensions.height;
  
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw with proper scaling
  ctx.drawImage(
    canvas,
    0, 0, canvas.width, canvas.height,
    0, 0, dimensions.width, dimensions.height
  );

  // Convert to blob and download
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      quality
    );
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `stats-${format}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportCardAsJpeg(
  elementRef: React.RefObject<HTMLElement>,
  options: ExportOptions
): Promise<void> {
  if (!elementRef.current) {
    throw new Error('Element not found');
  }

  const { format, quality = 0.92, filename } = options;
  const dimensions = DIMENSIONS[format];

  const element = elementRef.current;
  const currentWidth = element.offsetWidth;
  const scale = dimensions.width / currentWidth;

  const canvas = await html2canvas(element, {
    scale: scale * 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#000000', // JPEG needs solid background
    logging: false,
  });

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = dimensions.width;
  finalCanvas.height = dimensions.height;
  
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.drawImage(
    canvas,
    0, 0, canvas.width, canvas.height,
    0, 0, dimensions.width, dimensions.height
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `stats-${format}-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getFormatDimensions(format: ExportFormat): ExportDimensions {
  return DIMENSIONS[format];
}
