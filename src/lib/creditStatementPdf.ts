import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs, enUS } from "date-fns/locale";

export interface CreditStatementItem {
  date: Date;
  type: "training" | "product" | "late_cancellation";
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
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
  companyName?: string;
  companyId?: string;
  companyAddress?: string;
  companyContact?: string;
}

export interface CreditStatementOptions {
  language: "cs" | "en";
}

const translations = {
  cs: {
    title: "Výpis cerpání kreditu",
    client: "Klient",
    period: "Období",
    issueDate: "Datum vystavení",
    summary: "Souhrn",
    totalItems: "Celkový pocet položek",
    totalDeducted: "Celkem odecteno z kreditu",
    creditAtStart: "Kredit na zacátku období",
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
    subtotalTraining: "Mezisouc. tréninky",
    subtotalProducts: "Mezisouc. zboží",
    subtotalCancellations: "Mezisouc. zrušení",
    grandTotal: "Celkem odecteno z kreditu",
    currency: "Kc",
    noItems: "V období nebyly nalezeny žádné položky.",
    footer: "Tento výpis slouží pro kontrolu cerpání kreditu.",
    page: "Strana",
    of: "z",
  },
  en: {
    title: "Credit Usage Statement",
    client: "Client",
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
  },
};

// App brand colors - Orange primary (HSL 24 100% 50% converted to RGB)
const COLORS = {
  primary: [255, 115, 0] as [number, number, number], // Orange primary hsl(24, 100%, 50%)
  primaryDark: [230, 100, 0] as [number, number, number], // Darker orange
  primaryLight: [255, 145, 51] as [number, number, number], // Lighter orange
  text: [15, 23, 42] as [number, number, number], // Dark text
  textMuted: [100, 116, 139] as [number, number, number], // Muted text
  textLight: [148, 163, 184] as [number, number, number], // Light text
  background: [250, 245, 240] as [number, number, number], // Warm light background
  backgroundAlt: [255, 248, 240] as [number, number, number], // Warm alternate
  white: [255, 255, 255] as [number, number, number],
  border: [255, 200, 150] as [number, number, number], // Orange-tinted border
};

// Font sizes (unified)
const FONTS = {
  title: 20,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 9,
  tiny: 8,
};

// Map Czech diacritics to closest ASCII equivalents for PDF compatibility
// jsPDF default fonts don't support full Unicode, this is a necessary workaround
function normalizeCzech(text: string): string {
  const czechMap: Record<string, string> = {
    // Lowercase
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    // Uppercase
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  return text.split('').map(char => czechMap[char] || char).join('');
}

// Alias for backward compatibility
const removeDiacritics = normalizeCzech;

export function generateCreditStatementPdf(
  data: CreditStatementData,
  options: CreditStatementOptions
): jsPDF {
  const t = translations[options.language];
  const locale = options.language === "cs" ? cs : enUS;
  const dateFormat = options.language === "cs" ? "d. M. yyyy" : "MMM d, yyyy";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

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

  // Title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.text(removeDiacritics(t.title), margin, yPos);
  yPos += 10;

  // Company info (if available)
  if (data.companyName) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(removeDiacritics(data.companyName), margin, yPos);
    yPos += 5;
    if (data.companyId) {
      doc.text(`IC: ${data.companyId}`, margin, yPos);
      yPos += 5;
    }
    if (data.companyAddress) {
      doc.text(removeDiacritics(data.companyAddress), margin, yPos);
      yPos += 5;
    }
    if (data.companyContact) {
      doc.text(removeDiacritics(data.companyContact), margin, yPos);
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
  doc.setFont("helvetica", "bold");
  doc.text(`${t.client}:`, margin + 5, yPos + 5);
  doc.setFont("helvetica", "normal");
  doc.text(removeDiacritics(data.clientName), margin + 25, yPos + 5);

  if (data.clientEmail || data.clientPhone) {
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
    `${removeDiacritics(t.issueDate)}: ${format(new Date(), dateFormat, { locale })}`,
    pageWidth - margin - 5,
    yPos + 11,
    { align: "right" }
  );
  
  yPos += 28;

  // Summary section
  const trainingTotal = data.items
    .filter((i) => i.type === "training")
    .reduce((sum, i) => sum + i.totalPrice, 0);
  const productTotal = data.items
    .filter((i) => i.type === "product")
    .reduce((sum, i) => sum + i.totalPrice, 0);
  const cancellationTotal = data.items
    .filter((i) => i.type === "late_cancellation")
    .reduce((sum, i) => sum + i.totalPrice, 0);
  const grandTotal = trainingTotal + productTotal + cancellationTotal;

  // Summary box with primary color accent
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 3, 3, 'F');
  
  doc.setFontSize(FONTS.heading);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(t.summary, margin + 5, yPos + 7);

  doc.setFontSize(FONTS.body);
  doc.setFont("helvetica", "normal");
  doc.text(`${removeDiacritics(t.totalItems)}: ${data.items.length}`, margin + 5, yPos + 14);
  
  doc.setFont("helvetica", "bold");
  doc.text(
    `${removeDiacritics(t.totalDeducted)}: ${Math.round(grandTotal).toLocaleString('cs-CZ')} ${t.currency}`,
    pageWidth - margin - 5,
    yPos + 14,
    { align: "right" }
  );

  yPos += 28;

  // Items table
  if (data.items.length === 0) {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("helvetica", "italic");
    doc.text(removeDiacritics(t.noItems), margin, yPos);
  } else {
    const getTypeName = (type: CreditStatementItem["type"]) => {
      switch (type) {
        case "training":
          return removeDiacritics(t.training);
        case "product":
          return removeDiacritics(t.product);
        case "late_cancellation":
          return removeDiacritics(t.lateCancellation);
      }
    };

    const tableData = data.items
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => [
        format(item.date, dateFormat, { locale }),
        getTypeName(item.type),
        removeDiacritics(item.description),
        item.quantity.toString(),
        `${Math.round(item.unitPrice).toLocaleString('cs-CZ')} ${t.currency}`,
        `${Math.round(item.totalPrice).toLocaleString('cs-CZ')} ${t.currency}`,
        item.note ? removeDiacritics(item.note) : "",
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          t.date,
          t.type,
          removeDiacritics(t.description),
          removeDiacritics(t.quantity),
          removeDiacritics(t.unitPrice),
          t.total,
          removeDiacritics(t.note),
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: FONTS.small,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: {
        fontSize: FONTS.small,
        textColor: COLORS.text,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [255, 250, 245], // Warm orange-tinted background
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 24, halign: "right" },
        6: { cellWidth: 28 },
      },
      margin: { left: margin, right: margin },
      styles: {
        overflow: 'linebreak',
        lineColor: [255, 200, 150], // Orange-tinted border
        lineWidth: 0.1,
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
    doc.setFont("helvetica", "normal");

    if (trainingTotal > 0) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text(
        `${removeDiacritics(t.subtotalTraining)}:`,
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
        `${removeDiacritics(t.subtotalProducts)}:`,
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
        `${removeDiacritics(t.subtotalCancellations)}:`,
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
    doc.setFont("helvetica", "bold");
    doc.text(
      `${removeDiacritics(t.grandTotal)}:`,
      pageWidth - margin - 65,
      subtotalY + 2
    );
    doc.text(
      `${Math.round(grandTotal).toLocaleString('cs-CZ')} ${t.currency}`,
      pageWidth - margin - 5,
      subtotalY + 2,
      { align: "right" }
    );

    // Footer text
    const footerY = Math.min(subtotalY + 20, pageHeight - 25);
    doc.setFontSize(FONTS.tiny);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont("helvetica", "italic");
    doc.text(removeDiacritics(t.footer), margin, footerY);
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

export function downloadCreditStatementPdf(
  data: CreditStatementData,
  options: CreditStatementOptions
): void {
  const doc = generateCreditStatementPdf(data, options);
  const clientNameClean = removeDiacritics(data.clientName).replace(/\s+/g, "-").toLowerCase();
  const filename =
    options.language === "cs"
      ? `vypis-kreditu-${clientNameClean}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      : `credit-statement-${clientNameClean}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
