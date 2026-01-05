import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { loadPdfFonts, registerInterFont } from "./pdfFonts";
import { getPdfColorsFromTheme, PdfColors, ThemeId } from "./pdfTheme";
import { PdfSettings } from "@/hooks/usePdfSettings";

// ==================== Types ====================

export type LedgerEntryCategory = 
  | 'TRAINING' 
  | 'PRODUCT' 
  | 'SERVICE' 
  | 'ADJUSTMENT' 
  | 'TOPUP'
  | 'TRANSFER'
  | 'CANCELLATION';

export interface LedgerEntry {
  id: string;
  occurredAt: Date;
  category: LedgerEntryCategory;
  description: string;
  consumerName?: string; // Kdo čerpal (pro skupiny)
  amountCzk: number; // + = dobití, - = čerpání
  note?: string;
}

export interface CreditLedgerData {
  // Entity info
  entityName: string; // Jméno klienta nebo název skupiny
  entityEmail?: string;
  entityType: 'client' | 'group';
  
  // Period
  periodStart: Date;
  periodEnd: Date;
  
  // Entries
  entries: LedgerEntry[];
  
  // Balances
  openingBalance: number;
  closingBalance: number;
  
  // Company info
  companyName?: string;
  companyId?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWeb?: string;
  companyLogoUrl?: string;
}

export interface CreditLedgerOptions {
  includeNotes: boolean;
  includeRunningBalance: boolean;
  themeId?: ThemeId;
  pdfSettings?: PdfSettings;
}

// ==================== Translations ====================

const translations = {
  title: "VÝPIS KREDITU",
  documentNumber: "Číslo dokumentu",
  issueDate: "Datum vystavení",
  
  // Entity
  client: "Klient",
  group: "Skupina",
  email: "Email",
  
  // Period summary
  periodSummary: "SOUHRN OBDOBÍ",
  period: "Období",
  openingBalance: "Počáteční stav",
  totalCredits: "Dobití celkem",
  totalDebits: "Čerpání celkem",
  closingBalance: "Konečný stav",
  
  // Table headers
  date: "Datum",
  type: "Typ",
  description: "Popis",
  consumer: "Čerpal",
  amount: "Částka (CZK)",
  balance: "Zůstatek",
  note: "Poznámka",
  
  // Categories
  categoryTopup: "DOBITÍ",
  categoryDebit: "ČERPÁNÍ",
  categoryTraining: "Trénink",
  categoryProduct: "Produkt",
  categoryService: "Služba",
  categoryAdjustment: "Úprava",
  categoryTransfer: "Převod",
  categoryCancellation: "Zrušení",
  
  // Footer
  footer: "Tento dokument je generovaný systémem a slouží jako přehled kreditních pohybů.",
  page: "Strana",
  of: "z",
  noEntries: "V období nebyly zaznamenány žádné pohyby.",
  currency: "Kč",
};

// ==================== Helpers ====================

function generateDocumentNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `CR-${year}${month}-${random}`;
}

function formatCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  // Add thousands separator with space
  return formatted.replace(/,/g, ' ');
}

function formatCurrencyWithSign(amount: number): string {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(amount)} ${translations.currency}`;
}

function formatCurrencyPlain(amount: number): string {
  return `${formatCurrency(amount)} ${translations.currency}`;
}

function getCategoryDisplay(category: LedgerEntryCategory, isCredit: boolean): { type: string; subtype: string } {
  const mainType = isCredit ? translations.categoryTopup : translations.categoryDebit;
  
  let subtype: string;
  switch (category) {
    case 'TRAINING': subtype = translations.categoryTraining; break;
    case 'PRODUCT': subtype = translations.categoryProduct; break;
    case 'SERVICE': subtype = translations.categoryService; break;
    case 'ADJUSTMENT': subtype = translations.categoryAdjustment; break;
    case 'TOPUP': subtype = translations.categoryTopup; break;
    case 'TRANSFER': subtype = translations.categoryTransfer; break;
    case 'CANCELLATION': subtype = translations.categoryCancellation; break;
    default: subtype = category;
  }
  
  return { type: mainType, subtype };
}

function sanitizeFilename(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  return text.split('').map(char => map[char] || char).join('');
}

// Font sizes based on setting
const getFontSizes = (size: 'small' | 'medium' | 'large') => {
  const multiplier = size === 'small' ? 0.9 : size === 'large' ? 1.1 : 1;
  return {
    title: Math.round(22 * multiplier),
    subtitle: Math.round(14 * multiplier),
    heading: Math.round(11 * multiplier),
    body: Math.round(10 * multiplier),
    small: Math.round(9 * multiplier),
    tiny: Math.round(8 * multiplier),
  };
};

// ==================== PDF Generator ====================

export async function generateCreditLedgerPdf(
  data: CreditLedgerData,
  options: CreditLedgerOptions
): Promise<{ doc: jsPDF; documentNumber: string }> {
  const t = translations;
  const dateFormat = "dd.MM.yyyy";
  
  // Get theme colors
  const COLORS = getPdfColorsFromTheme(options.themeId);
  
  // Get PDF settings (with defaults)
  const pdfSettings: PdfSettings = {
    showLogo: true,
    showCompanyInfo: true,
    showSummary: true,
    showClientContact: true,
    customFooter: "",
    fontFamily: 'roboto',
    fontSize: 'medium',
    useThemeColors: true,
    primaryColor: '#1e293b',
    textColor: '#0f172a',
    tableHeaderColor: '#0f172a',
    customTitle: '',
    ...options.pdfSettings,
  };

  const FONTS = getFontSizes(pdfSettings.fontSize);
  const FONT_FAMILY = 'Roboto';
  
  // Generate document number
  const documentNumber = generateDocumentNumber();

  // Load fonts
  await loadPdfFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  registerInterFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let yPos = margin;

  // Calculate totals
  const creditsSum = data.entries
    .filter(e => e.amountCzk > 0)
    .reduce((sum, e) => sum + e.amountCzk, 0);
  const debitsSum = data.entries
    .filter(e => e.amountCzk < 0)
    .reduce((sum, e) => sum + e.amountCzk, 0);

  // Sort entries by date (oldest first)
  const sortedEntries = [...data.entries].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
  );

  // ==================== HEADER ====================
  
  // Header stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 7, 'F');

  yPos = 18;

  // Company logo (left side)
  let logoEndX = margin;
  if (data.companyLogoUrl && pdfSettings.showLogo) {
    try {
      const response = await fetch(data.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'AUTO', margin, yPos - 5, 0, 14);
      logoEndX = margin + 38;
    } catch (error) {
      console.error("Failed to load company logo:", error);
    }
  }

  // Title - use custom title if provided
  const titleText = pdfSettings.customTitle?.trim() || t.title;
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont(FONT_FAMILY, "bold");
  doc.text(titleText, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 4 : 0), yPos);
  yPos += 8;

  // Company info (if enabled)
  if (pdfSettings.showCompanyInfo && data.companyName) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont(FONT_FAMILY, "normal");
    
    const companyInfoX = logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 4 : 0);
    
    doc.text(data.companyName, companyInfoX, yPos);
    yPos += 4;
    
    const companyDetails: string[] = [];
    if (data.companyId) companyDetails.push(`IČ: ${data.companyId}`);
    if (data.companyAddress) companyDetails.push(data.companyAddress);
    
    if (companyDetails.length > 0) {
      doc.text(companyDetails.join(' | '), companyInfoX, yPos);
      yPos += 4;
    }
    
    const contactDetails: string[] = [];
    if (data.companyEmail) contactDetails.push(data.companyEmail);
    if (data.companyPhone) contactDetails.push(data.companyPhone);
    if (data.companyWeb) contactDetails.push(data.companyWeb);
    
    if (contactDetails.length > 0) {
      doc.text(contactDetails.join(' | '), companyInfoX, yPos);
      yPos += 4;
    }
  }

  // Document info on right side
  doc.setFontSize(FONTS.small);
  doc.setTextColor(...COLORS.text);
  doc.setFont(FONT_FAMILY, "normal");
  
  const docInfoY = 18;
  doc.text(`${t.documentNumber}: ${documentNumber}`, pageWidth - margin, docInfoY, { align: "right" });
  doc.text(`${t.issueDate}: ${format(new Date(), dateFormat, { locale: cs })}`, pageWidth - margin, docInfoY + 5, { align: "right" });

  yPos = Math.max(yPos, 36) + 6;

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ==================== CLIENT/GROUP INFO ====================
  
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 18, 2, 2, 'F');
  
  doc.setFontSize(FONTS.heading);
  doc.setTextColor(...COLORS.text);
  doc.setFont(FONT_FAMILY, "bold");
  const entityLabel = data.entityType === 'group' ? t.group : t.client;
  doc.text(`${entityLabel}:`, margin + 4, yPos + 5);
  
  doc.setFont(FONT_FAMILY, "normal");
  doc.text(data.entityName, margin + 22, yPos + 5);
  
  if (pdfSettings.showClientContact && data.entityEmail) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`${t.email}: ${data.entityEmail}`, margin + 4, yPos + 11);
  }

  yPos += 22;

  // ==================== PERIOD SUMMARY ====================
  
  if (pdfSettings.showSummary) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 32, 2, 2, 'F');
    
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.white);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(t.periodSummary, margin + 4, yPos + 6);
    
    doc.setFontSize(FONTS.small);
    doc.setFont(FONT_FAMILY, "normal");
    
    const periodStr = `${format(data.periodStart, dateFormat, { locale: cs })} – ${format(data.periodEnd, dateFormat, { locale: cs })}`;
    doc.text(`${t.period}: ${periodStr}`, margin + 4, yPos + 13);
    
    // Summary values in columns
    const col1X = margin + 4;
    const col2X = margin + 60;
    const col3X = pageWidth - margin - 60;
    const col4X = pageWidth - margin - 4;
    
    const summaryY = yPos + 21;
    
    // Row 1: Opening balance and Credits
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(`${t.openingBalance}:`, col1X, summaryY);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(formatCurrencyPlain(data.openingBalance), col2X, summaryY);
    
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(`${t.totalCredits}:`, col3X, summaryY, { align: "right" });
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(`+${formatCurrencyPlain(creditsSum)}`, col4X, summaryY, { align: "right" });
    
    // Row 2: Closing balance and Debits
    const summaryY2 = yPos + 28;
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(`${t.closingBalance}:`, col1X, summaryY2);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(formatCurrencyPlain(data.closingBalance), col2X, summaryY2);
    
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(`${t.totalDebits}:`, col3X, summaryY2, { align: "right" });
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(`${formatCurrencyPlain(debitsSum)}`, col4X, summaryY2, { align: "right" });
    
    yPos += 38;
  }

  // ==================== TABLE ====================
  
  if (sortedEntries.length === 0) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(t.noEntries, margin, yPos + 10);
  } else {
    // Build headers
    const headers: string[] = [t.date, t.type, t.description];
    if (data.entityType === 'group') {
      headers.push(t.consumer);
    }
    headers.push(t.amount);
    if (options.includeRunningBalance) {
      headers.push(t.balance);
    }
    if (options.includeNotes) {
      headers.push(t.note);
    }

    // Build table data with running balance
    let runningBalance = data.openingBalance;
    const tableData = sortedEntries.map((entry) => {
      runningBalance += entry.amountCzk;
      const isCredit = entry.amountCzk >= 0;
      const { type, subtype } = getCategoryDisplay(entry.category, isCredit);
      
      const row: string[] = [
        format(entry.occurredAt, dateFormat, { locale: cs }),
        `${type}\n${subtype}`,
        entry.description,
      ];
      
      if (data.entityType === 'group') {
        row.push(entry.consumerName || '–');
      }
      
      row.push(formatCurrencyWithSign(entry.amountCzk));
      
      if (options.includeRunningBalance) {
        row.push(formatCurrencyPlain(runningBalance));
      }
      
      if (options.includeNotes) {
        row.push(entry.note || '');
      }
      
      return row;
    });

    // Column styles
    const isGroup = data.entityType === 'group';
    const hasNotes = options.includeNotes;
    const hasBalance = options.includeRunningBalance;
    
    const columnStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'right' | 'center' }> = {
      0: { cellWidth: 20 }, // Date
      1: { cellWidth: 22 }, // Type
      2: { cellWidth: 'auto' }, // Description
    };
    
    let colIdx = 3;
    if (isGroup) {
      columnStyles[colIdx] = { cellWidth: 25 };
      colIdx++;
    }
    columnStyles[colIdx] = { cellWidth: 24, halign: 'right' }; // Amount
    colIdx++;
    if (hasBalance) {
      columnStyles[colIdx] = { cellWidth: 22, halign: 'right' };
      colIdx++;
    }
    if (hasNotes) {
      columnStyles[colIdx] = { cellWidth: 28 };
    }

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: FONTS.small,
        fontStyle: "bold",
        halign: "left",
        font: FONT_FAMILY,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: FONTS.tiny,
        textColor: COLORS.text,
        cellPadding: 2,
        font: FONT_FAMILY,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252],
      },
      columnStyles,
      margin: { left: margin, right: margin },
      styles: {
        overflow: 'linebreak',
        lineColor: COLORS.border,
        lineWidth: 0.1,
        font: FONT_FAMILY,
      },
      didParseCell: (data) => {
        // Color amount cells based on sign
        if (data.section === 'body') {
          const amountColIdx = isGroup ? 4 : 3;
          if (data.column.index === amountColIdx) {
            const cellText = String(data.cell.raw);
            if (cellText.startsWith('+')) {
              data.cell.styles.textColor = [22, 163, 74]; // green-600
            } else if (cellText.startsWith('-')) {
              data.cell.styles.textColor = [220, 38, 38]; // red-600
            }
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ==================== FOOTER ====================
  
  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer text (use custom footer if provided)
    const footerY = pageHeight - 15;
    doc.setFontSize(FONTS.tiny);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont(FONT_FAMILY, "normal");
    const footerText = pdfSettings.customFooter?.trim() || t.footer;
    doc.text(footerText, margin, footerY);
    
    // Page number
    doc.text(
      `${t.page} ${i} ${t.of} ${pageCount}`,
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
    
    // Footer stripe
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
  }

  return { doc, documentNumber };
}

// ==================== Download Function ====================

export async function downloadCreditLedgerPdf(
  data: CreditLedgerData,
  options: CreditLedgerOptions
): Promise<string> {
  const { doc, documentNumber } = await generateCreditLedgerPdf(data, options);
  
  const entityNameClean = sanitizeFilename(data.entityName).replace(/\s+/g, "-").toLowerCase();
  const filename = `vypis-kreditu-${entityNameClean}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  
  doc.save(filename);
  
  return documentNumber;
}
