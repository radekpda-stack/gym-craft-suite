import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs, enUS } from "date-fns/locale";
import { loadPdfFonts, registerInterFont } from "./pdfFonts";
import { getPdfColorsFromTheme, PdfColors, ThemeId } from "./pdfTheme";
import { PdfSettings } from "@/hooks/usePdfSettings";

export interface CreditStatementItem {
  date: Date;
  type: "training" | "product" | "late_cancellation";
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
  clientName?: string; // For group budgets
}

export interface CreditStatementData {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  periodStart: Date;
  periodEnd: Date;
  items: CreditStatementItem[];
  creditAtStart?: number;
  creditAtEnd?: number;
  isGroupBudget?: boolean;
  companyName?: string;
  companyId?: string;
  companyAddress?: string;
  companyContact?: string;
  companyLogoUrl?: string;
}

export interface CreditStatementOptions {
  language: "cs" | "en";
  themeId?: ThemeId;
  pdfSettings?: PdfSettings;
}

const translations = {
  cs: {
    title: "Výpis čerpání kreditu",
    client: "Klient",
    member: "Člen",
    period: "Období",
    issueDate: "Datum vystavení",
    summary: "Souhrn",
    totalItems: "Celkový počet položek",
    totalDeducted: "Celkem odečteno z kreditu",
    creditAtStart: "Kredit na začátku období",
    creditAtEnd: "Kredit na konci období",
    date: "Datum",
    type: "Typ",
    description: "Popis",
    quantity: "Množství",
    unitPrice: "Jedn. cena",
    total: "Celkem",
    note: "Poznámka",
    training: "Trénink",
    product: "Zboží",
    lateCancellation: "Pozdní zrušení",
    subtotalTraining: "Mezisoučet tréninky",
    subtotalProducts: "Mezisoučet zboží",
    subtotalCancellations: "Mezisoučet zrušení",
    grandTotal: "Celkem odečteno z kreditu",
    currency: "Kč",
    noItems: "V období nebyly nalezeny žádné položky.",
    footer: "Tento výpis slouží pro kontrolu čerpání kreditu.",
    page: "Strana",
    of: "z",
    trainingsCount: "Tréninků",
    productsCount: "Produktů",
    cancellationsCount: "Zrušení",
    groupBudget: "Skupinový rozpočet",
  },
  en: {
    title: "Credit Usage Statement",
    client: "Client",
    member: "Member",
    period: "Period",
    issueDate: "Issue date",
    summary: "Summary",
    totalItems: "Total items",
    totalDeducted: "Total deducted from credit",
    creditAtStart: "Credit at period start",
    creditAtEnd: "Credit at period end",
    date: "Date",
    type: "Type",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit price",
    total: "Total",
    note: "Note",
    training: "Training",
    product: "Product",
    lateCancellation: "Late cancellation",
    subtotalTraining: "Subtotal training",
    subtotalProducts: "Subtotal products",
    subtotalCancellations: "Subtotal cancellations",
    grandTotal: "Total deducted from credit",
    currency: "CZK",
    noItems: "No items found in the selected period.",
    footer: "This statement is provided for credit usage review.",
    page: "Page",
    of: "of",
    trainingsCount: "Trainings",
    productsCount: "Products",
    cancellationsCount: "Cancellations",
    groupBudget: "Group budget",
  },
};

// Font sizes based on setting
const getFontSizes = (size: 'small' | 'medium' | 'large') => {
  const multiplier = size === 'small' ? 0.9 : size === 'large' ? 1.1 : 1;
  return {
    title: Math.round(20 * multiplier),
    subtitle: Math.round(14 * multiplier),
    heading: Math.round(12 * multiplier),
    body: Math.round(10 * multiplier),
    small: Math.round(9 * multiplier),
    tiny: Math.round(8 * multiplier),
  };
};

// Get font family name for jsPDF
const getFontFamily = (fontFamily: string): string => {
  switch (fontFamily) {
    case 'helvetica': return 'helvetica';
    case 'times': return 'times';
    case 'courier': return 'courier';
    default: return 'Roboto';
  }
};

// Fallback for filename (remove diacritics for safe filenames)
function sanitizeFilename(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  return text.split('').map(char => map[char] || char).join('');
}

export async function generateCreditStatementPdf(
  data: CreditStatementData,
  options: CreditStatementOptions
): Promise<jsPDF> {
  const t = translations[options.language];
  const locale = options.language === "cs" ? cs : enUS;
  const dateFormat = options.language === "cs" ? "d. M. yyyy" : "MMM d, yyyy";
  
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

  // Compute font sizes and family based on settings
  const FONTS = getFontSizes(pdfSettings.fontSize);
  const FONT_FAMILY = getFontFamily(pdfSettings.fontFamily);

  // Load fonts first
  await loadPdfFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Register Inter font for consistent look with app
  registerInterFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper function to add page number
  const addPageNumber = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(FONTS.tiny);
      doc.setTextColor(...COLORS.textLight);
      doc.text(
        `${t.page} ${i} ${t.of} ${pageCount}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    }
  };

  // Header background stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');

  yPos = 20;

  // Company logo (if available and enabled)
  let logoEndX = margin;
  if (data.companyLogoUrl && pdfSettings.showLogo) {
    try {
      // Load image as base64
      const response = await fetch(data.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      // Add image to PDF (max height 15mm)
      const logoHeight = 15;
      doc.addImage(base64, 'AUTO', margin, yPos - 5, 0, logoHeight);
      logoEndX = margin + 40; // Reserve space for logo
    } catch (error) {
      console.error("Failed to load company logo:", error);
    }
  }

  // Title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont(FONT_FAMILY, "bold");
  doc.text(t.title, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 5 : 0), yPos);
  yPos += 10;

  // Company info (if available and enabled)
  if (data.companyName && pdfSettings.showCompanyInfo) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(data.companyName, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 5 : 0), yPos);
    yPos += 5;
    if (data.companyId) {
      doc.text(`IČ: ${data.companyId}`, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 5 : 0), yPos);
      yPos += 5;
    }
    if (data.companyAddress) {
      doc.text(data.companyAddress, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 5 : 0), yPos);
      yPos += 5;
    }
    if (data.companyContact) {
      doc.text(data.companyContact, logoEndX + (data.companyLogoUrl && pdfSettings.showLogo ? 5 : 0), yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  // Separator line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Client info box
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 22, 3, 3, 'F');
  
  doc.setFontSize(FONTS.heading);
  doc.setTextColor(...COLORS.text);
  doc.setFont(FONT_FAMILY, "bold");
  doc.text(`${t.client}:`, margin + 5, yPos + 5);
  doc.setFont(FONT_FAMILY, "normal");
  doc.text(data.clientName, margin + 25, yPos + 5);

  // Client contact info (if enabled)
  if (pdfSettings.showClientContact && (data.clientEmail || data.clientPhone)) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    const contactInfo = [data.clientEmail, data.clientPhone]
      .filter(Boolean)
      .join(" | ");
    doc.text(contactInfo, margin + 5, yPos + 11);
  }

  // Period and issue date on the right
  doc.setFontSize(FONTS.small);
  doc.setTextColor(...COLORS.textMuted);
  const periodStr = `${format(data.periodStart, dateFormat, { locale })} - ${format(data.periodEnd, dateFormat, { locale })}`;
  doc.text(`${t.period}: ${periodStr}`, pageWidth - margin - 5, yPos + 5, { align: "right" });
  doc.text(
    `${t.issueDate}: ${format(new Date(), dateFormat, { locale })}`,
    pageWidth - margin - 5,
    yPos + 11,
    { align: "right" }
  );
  
  yPos += 28;

  // Summary section
  const trainingItems = data.items.filter((i) => i.type === "training");
  const productItems = data.items.filter((i) => i.type === "product");
  const cancellationItems = data.items.filter((i) => i.type === "late_cancellation");
  const trainingTotal = trainingItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const productTotal = productItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const cancellationTotal = cancellationItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const grandTotal = trainingTotal + productTotal + cancellationTotal;

  // Summary box with primary color accent (if enabled)
  if (pdfSettings.showSummary) {
    const summaryHeight = data.isGroupBudget ? 28 : 20;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, summaryHeight, 3, 3, 'F');
    
    doc.setFontSize(FONTS.heading);
    doc.setTextColor(...COLORS.white);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(t.summary + (data.isGroupBudget ? ` (${t.groupBudget})` : ''), margin + 5, yPos + 7);

    doc.setFontSize(FONTS.small);
    doc.setFont(FONT_FAMILY, "normal");
    // Summary line with breakdown
    const summaryParts = [];
    if (trainingItems.length > 0) summaryParts.push(`${trainingItems.length}× ${t.training.toLowerCase()}`);
    if (productItems.length > 0) summaryParts.push(`${productItems.length}× ${t.product.toLowerCase()}`);
    if (cancellationItems.length > 0) summaryParts.push(`${cancellationItems.length}× ${t.lateCancellation.toLowerCase()}`);
    doc.text(summaryParts.join(' · '), margin + 5, yPos + 14);
    
    doc.setFontSize(FONTS.body);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(
      `${t.totalDeducted}: ${Math.round(grandTotal).toLocaleString('cs-CZ')} ${t.currency}`,
      pageWidth - margin - 5,
      yPos + 14,
      { align: "right" }
    );

    if (data.isGroupBudget) {
      doc.setFontSize(FONTS.tiny);
      doc.setFont(FONT_FAMILY, "normal");
      const breakdown = [];
      if (trainingTotal > 0) breakdown.push(`${t.training}: ${Math.round(trainingTotal).toLocaleString('cs-CZ')} ${t.currency}`);
      if (productTotal > 0) breakdown.push(`${t.product}: ${Math.round(productTotal).toLocaleString('cs-CZ')} ${t.currency}`);
      if (cancellationTotal > 0) breakdown.push(`${t.lateCancellation}: ${Math.round(cancellationTotal).toLocaleString('cs-CZ')} ${t.currency}`);
      doc.text(breakdown.join(' · '), margin + 5, yPos + 21);
    }

    yPos += summaryHeight + 8;
  }

  // Items table
  if (data.items.length === 0) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont(FONT_FAMILY, "normal");
    doc.text(t.noItems, margin, yPos);
  } else {
    const getTypeName = (type: CreditStatementItem["type"]) => {
      switch (type) {
        case "training":
          return t.training;
        case "product":
          return t.product;
        case "late_cancellation":
          return t.lateCancellation;
      }
    };

    const tableData = data.items
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => {
        const baseRow = [
          format(item.date, dateFormat, { locale }),
          getTypeName(item.type),
          item.description,
          `${Math.round(item.totalPrice).toLocaleString('cs-CZ')} ${t.currency}`,
        ];
        if (data.isGroupBudget) {
          // Insert client name after date
          baseRow.splice(1, 0, item.clientName || '-');
        }
        return baseRow;
      });

    // Define headers based on whether it's a group budget
    const headers = data.isGroupBudget
      ? [t.date, t.member, t.type, t.description, t.total]
      : [t.date, t.type, t.description, t.total];

    // Column styles for group vs individual
    const columnStyles = data.isGroupBudget
      ? {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 22 },
          3: { cellWidth: "auto" as const },
          4: { cellWidth: 28, halign: "right" as const },
        }
      : {
          0: { cellWidth: 22 },
          1: { cellWidth: 24 },
          2: { cellWidth: "auto" as const },
          3: { cellWidth: 28, halign: "right" as const },
        };

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
      },
      bodyStyles: {
        fontSize: FONTS.small,
        textColor: COLORS.text,
        cellPadding: 3,
        font: FONT_FAMILY,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles,
      margin: { left: margin, right: margin },
      styles: {
        overflow: 'linebreak',
        lineColor: COLORS.border,
        lineWidth: 0.1,
        font: FONT_FAMILY,
      },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Subtotals box
    const subtotalBoxHeight = 
      (trainingTotal > 0 ? 6 : 0) + 
      (productTotal > 0 ? 6 : 0) + 
      (cancellationTotal > 0 ? 6 : 0) + 
      10;

    doc.setFillColor(...COLORS.background);
    doc.roundedRect(pageWidth - margin - 70, finalY - 2, 70, subtotalBoxHeight, 2, 2, 'F');

    let subtotalY = finalY + 4;
    doc.setFontSize(FONTS.small);
    doc.setFont(FONT_FAMILY, "normal");

    if (trainingTotal > 0) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text(
        `${t.subtotalTraining}:`,
        pageWidth - margin - 65,
        subtotalY
      );
      doc.setTextColor(...COLORS.text);
      doc.text(
        `${Math.round(trainingTotal).toLocaleString('cs-CZ')} ${t.currency}`,
        pageWidth - margin - 5,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 6;
    }

    if (productTotal > 0) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text(
        `${t.subtotalProducts}:`,
        pageWidth - margin - 65,
        subtotalY
      );
      doc.setTextColor(...COLORS.text);
      doc.text(
        `${Math.round(productTotal).toLocaleString('cs-CZ')} ${t.currency}`,
        pageWidth - margin - 5,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 6;
    }

    if (cancellationTotal > 0) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text(
        `${t.subtotalCancellations}:`,
        pageWidth - margin - 65,
        subtotalY
      );
      doc.setTextColor(...COLORS.text);
      doc.text(
        `${Math.round(cancellationTotal).toLocaleString('cs-CZ')} ${t.currency}`,
        pageWidth - margin - 5,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 6;
    }

    // Grand total with primary color
    subtotalY += 2;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(pageWidth - margin - 70, subtotalY - 4, 70, 10, 2, 2, 'F');
    
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.white);
    doc.setFont(FONT_FAMILY, "bold");
    doc.text(
      `${t.grandTotal}:`,
      pageWidth - margin - 65,
      subtotalY + 2
    );
    doc.text(
      `${Math.round(grandTotal).toLocaleString('cs-CZ')} ${t.currency}`,
      pageWidth - margin - 5,
      subtotalY + 2,
      { align: "right" }
    );

    // Footer text - use custom footer if provided
    const footerY = Math.min(subtotalY + 20, pageHeight - 25);
    doc.setFontSize(FONTS.tiny);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont(FONT_FAMILY, "normal");
    const footerText = pdfSettings.customFooter?.trim() || t.footer;
    doc.text(footerText, margin, footerY);
  }

  // Add page numbers
  addPageNumber();

  // Footer stripe
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
  }

  return doc;
}

export async function downloadCreditStatementPdf(
  data: CreditStatementData,
  options: CreditStatementOptions
): Promise<void> {
  const doc = await generateCreditStatementPdf(data, options);
  const clientNameClean = sanitizeFilename(data.clientName).replace(/\s+/g, "-").toLowerCase();
  const filename =
    options.language === "cs"
      ? `vypis-kreditu-${clientNameClean}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      : `credit-statement-${clientNameClean}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
