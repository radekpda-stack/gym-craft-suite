import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { loadPdfFonts, registerInterFont } from "./pdfFonts";
import { getPdfColorsFromTheme } from "./pdfTheme";
import { formatTimeSimple } from "./timeUtils";
import type { PerformanceExportData, PerformanceExportOptions } from "@/types/performance-export";

const translations = {
  title: "Výkonnostní report",
  client: "Klient",
  period: "Období",
  issueDate: "Datum exportu",
  summary: "Souhrn",
  totalEntries: "Celkem záznamů",
  totalSessions: "Tréninků",
  totalPRs: "Osobních rekordů",
  totalVolume: "Celkový objem",
  topExercises: "Top cviky",
  personalRecords: "Osobní rekordy",
  exercise: "Cvik",
  bestResult: "Nejlepší výkon",
  date: "Datum",
  details: "Detailní záznamy",
  sets: "Série",
  reps: "Opak.",
  weight: "Váha",
  time: "Čas",
  rpe: "RPE",
  pr: "PR",
  noData: "Žádná data pro vybrané období.",
  page: "Strana",
  of: "z",
  volumeChart: "Vývoj objemu",
};

// Font sizes
const FONTS = {
  title: 22,
  subtitle: 15,
  heading: 13,
  body: 11,
  small: 10,
  tiny: 9,
};

function sanitizeFilename(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  return text.split('').map(char => map[char] || char).join('');
}

function formatTimeForExport(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  return formatTimeSimple(seconds);
}

export async function generatePerformancePdf(
  data: PerformanceExportData,
  options: PerformanceExportOptions
): Promise<void> {
  const COLORS = getPdfColorsFromTheme();
  
  await loadPdfFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  registerInterFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper to add page numbers
  const addPageNumbers = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(FONTS.tiny);
      doc.setTextColor(...COLORS.textLight);
      doc.text(
        `${translations.page} ${i} ${translations.of} ${pageCount}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    }
  };

  // Header stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');

  yPos = 20;

  // Title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont("Roboto", "bold");
  doc.text(translations.title, margin, yPos);
  yPos += 10;

  // Separator
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Client info box
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 18, 3, 3, 'F');
  
  doc.setFontSize(FONTS.heading);
  doc.setTextColor(...COLORS.text);
  doc.setFont("Roboto", "bold");
  doc.text(`${translations.client}:`, margin + 5, yPos + 5);
  doc.setFont("Roboto", "normal");
  doc.text(options.clientName, margin + 25, yPos + 5);

  // Period and date
  doc.setFontSize(FONTS.small);
  doc.setTextColor(...COLORS.textMuted);
  const periodStr = `${format(parseISO(data.stats.periodStart), 'd. M. yyyy', { locale: cs })} - ${format(parseISO(data.stats.periodEnd), 'd. M. yyyy', { locale: cs })}`;
  doc.text(`${translations.period}: ${periodStr}`, pageWidth - margin - 5, yPos + 5, { align: "right" });
  doc.text(
    `${translations.issueDate}: ${format(new Date(), 'd. M. yyyy', { locale: cs })}`,
    pageWidth - margin - 5,
    yPos + 11,
    { align: "right" }
  );
  
  yPos += 24;

  // Summary section (if enabled)
  if (options.includeStats) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 24, 3, 3, 'F');
    
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.white);
    doc.setFont("Roboto", "bold");
    doc.text(translations.summary, margin + 5, yPos + 7);

    doc.setFontSize(FONTS.small);
    doc.setFont("Roboto", "normal");
    
    // Stats row
    const statsText = [
      `${data.stats.totalEntries} ${translations.totalEntries.toLowerCase()}`,
      `${data.stats.totalSessions} ${translations.totalSessions.toLowerCase()}`,
      `${data.stats.totalPRs} PR`,
      data.stats.totalVolume > 0 ? `${data.stats.totalVolume.toLocaleString('cs-CZ')} kg objem` : null,
    ].filter(Boolean).join(' · ');
    
    doc.text(statsText, margin + 5, yPos + 14);

    // Top exercises
    if (data.stats.topExercises.length > 0) {
      doc.setFontSize(FONTS.tiny);
      const topText = `Top: ${data.stats.topExercises.slice(0, 3).map(e => `${e.name} (${e.count}×)`).join(', ')}`;
      doc.text(topText, margin + 5, yPos + 20);
    }
    
    yPos += 32;
  }

  // Personal Records table (if enabled)
  if (options.includePRs && data.prs.length > 0) {
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(translations.personalRecords, margin, yPos);
    yPos += 6;

    const prTableData = data.prs.slice(0, 15).map(pr => [
      pr.exerciseName,
      pr.bestDisplay,
      format(parseISO(pr.achievedAt), 'd. M. yyyy', { locale: cs }),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [[translations.exercise, translations.bestResult, translations.date]],
      body: prTableData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: FONTS.small,
        fontStyle: "bold",
        font: "Roboto",
      },
      bodyStyles: {
        fontSize: FONTS.small,
        textColor: COLORS.text,
        cellPadding: 2,
        font: "Roboto",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Chart section (simple text representation since we can't render actual charts)
  if (options.includeChart && data.chartData.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(translations.volumeChart, margin, yPos);
    yPos += 6;

    // Simple bar representation using boxes
    const chartHeight = 30;
    const chartWidth = pageWidth - 2 * margin;
    const maxVolume = Math.max(...data.chartData.map(d => d.volume), 1);
    const barWidth = Math.min(8, (chartWidth - 10) / data.chartData.length);
    
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(margin, yPos, chartWidth, chartHeight + 10, 2, 2, 'F');

    // Draw bars
    const recentData = data.chartData.slice(-Math.floor(chartWidth / barWidth));
    recentData.forEach((point, index) => {
      const barHeight = (point.volume / maxVolume) * chartHeight;
      const x = margin + 5 + index * barWidth;
      const y = yPos + chartHeight - barHeight + 5;
      
      doc.setFillColor(...COLORS.primary);
      doc.rect(x, y, barWidth - 1, barHeight, 'F');
    });

    yPos += chartHeight + 18;
  }

  // Detailed entries table (if enabled)
  if (options.includeDetails && data.entries.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(translations.details, margin, yPos);
    yPos += 6;

    const detailsData = data.entries.slice(0, 100).map(entry => {
      const weightOrTime = entry.weightKg 
        ? `${entry.weightKg} kg` 
        : entry.distanceMeters
          ? `${Math.round(entry.distanceMeters * 100)} cm`
          : entry.timeSeconds 
            ? formatTimeForExport(entry.timeSeconds)
            : '-';
      
      return [
        format(parseISO(entry.date), 'd.M.', { locale: cs }),
        entry.exerciseName.length > 25 ? entry.exerciseName.substring(0, 22) + '...' : entry.exerciseName,
        entry.sets?.toString() || '-',
        entry.reps?.toString() || '-',
        weightOrTime,
        entry.rpe?.toString() || '-',
        entry.isPr ? '🏆' : '',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [[translations.date, translations.exercise, translations.sets, translations.reps, translations.weight, translations.rpe, translations.pr]],
      body: detailsData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: FONTS.tiny,
        fontStyle: "bold",
        font: "Roboto",
      },
      bodyStyles: {
        fontSize: FONTS.tiny,
        textColor: COLORS.text,
        cellPadding: 1.5,
        font: "Roboto",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 10, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      // Handle pagination
      didDrawPage: () => {
        // Re-add header on new pages
      },
    });
  }

  // No data message
  if (data.entries.length === 0) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(translations.noData, margin, yPos);
  }

  // Add page numbers
  addPageNumbers();

  // Save the PDF
  const filename = `vykon_${sanitizeFilename(options.clientName)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
