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
    title: "Výpis čerpání kreditu",
    client: "Klient",
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
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(
        `${t.page} ${i} ${t.of} ${pageCount}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setTextColor(33, 33, 33);
  doc.text(t.title, margin, yPos);
  yPos += 12;

  // Company info (if available)
  if (data.companyName) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.companyName, margin, yPos);
    yPos += 5;
    if (data.companyId) {
      doc.text(`IČ: ${data.companyId}`, margin, yPos);
      yPos += 5;
    }
    if (data.companyAddress) {
      doc.text(data.companyAddress, margin, yPos);
      yPos += 5;
    }
    if (data.companyContact) {
      doc.text(data.companyContact, margin, yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  // Separator line
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Client info
  doc.setFontSize(11);
  doc.setTextColor(33);
  doc.text(`${t.client}: ${data.clientName}`, margin, yPos);
  yPos += 5;

  if (data.clientEmail || data.clientPhone) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    const contactInfo = [data.clientEmail, data.clientPhone]
      .filter(Boolean)
      .join(" | ");
    doc.text(contactInfo, margin, yPos);
    yPos += 5;
  }

  // Period and issue date
  doc.setFontSize(10);
  doc.setTextColor(100);
  const periodStr = `${format(data.periodStart, dateFormat, { locale })} – ${format(data.periodEnd, dateFormat, { locale })}`;
  doc.text(`${t.period}: ${periodStr}`, margin, yPos);
  yPos += 5;
  doc.text(
    `${t.issueDate}: ${format(new Date(), dateFormat, { locale })}`,
    margin,
    yPos
  );
  yPos += 10;

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

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 24, 2, 2, "F");
  yPos += 6;

  doc.setFontSize(11);
  doc.setTextColor(33);
  doc.text(t.summary, margin + 5, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${t.totalItems}: ${data.items.length}`, margin + 5, yPos);
  doc.text(
    `${t.totalDeducted}: ${Math.round(grandTotal)} ${t.currency}`,
    pageWidth / 2,
    yPos
  );
  yPos += 6;

  if (data.creditAtStart !== undefined || data.creditAtEnd !== undefined) {
    if (data.creditAtStart !== undefined) {
      doc.text(
        `${t.creditAtStart}: ${Math.round(data.creditAtStart)} ${t.currency}`,
        margin + 5,
        yPos
      );
    }
    if (data.creditAtEnd !== undefined) {
      doc.text(
        `${t.creditAtEnd}: ${Math.round(data.creditAtEnd)} ${t.currency}`,
        pageWidth / 2,
        yPos
      );
    }
  }
  yPos += 12;

  // Items table
  if (data.items.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100);
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
      .map((item) => [
        format(item.date, dateFormat, { locale }),
        getTypeName(item.type),
        item.description,
        item.quantity.toString(),
        `${Math.round(item.unitPrice)} ${t.currency}`,
        `${Math.round(item.totalPrice)} ${t.currency}`,
        item.note || "",
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          t.date,
          t.type,
          t.description,
          t.quantity,
          t.unitPrice,
          t.total,
          t.note,
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [33, 33, 33],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        // Header repeat handled by autoTable
      },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Subtotals
    doc.setFontSize(10);
    doc.setTextColor(80);

    let subtotalY = finalY;

    if (trainingTotal > 0) {
      doc.text(
        `${t.subtotalTraining}: ${Math.round(trainingTotal)} ${t.currency}`,
        pageWidth - margin,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 5;
    }

    if (productTotal > 0) {
      doc.text(
        `${t.subtotalProducts}: ${Math.round(productTotal)} ${t.currency}`,
        pageWidth - margin,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 5;
    }

    if (cancellationTotal > 0) {
      doc.text(
        `${t.subtotalCancellations}: ${Math.round(cancellationTotal)} ${t.currency}`,
        pageWidth - margin,
        subtotalY,
        { align: "right" }
      );
      subtotalY += 5;
    }

    // Grand total
    subtotalY += 2;
    doc.setFontSize(11);
    doc.setTextColor(33);
    doc.setFont(undefined, "bold");
    doc.text(
      `${t.grandTotal}: ${Math.round(grandTotal)} ${t.currency}`,
      pageWidth - margin,
      subtotalY,
      { align: "right" }
    );
    doc.setFont(undefined, "normal");

    // Footer text
    const footerY = Math.min(subtotalY + 15, pageHeight - 25);
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text(t.footer, margin, footerY);
  }

  // Add page numbers
  addPageNumber();

  return doc;
}

export function downloadCreditStatementPdf(
  data: CreditStatementData,
  options: CreditStatementOptions
): void {
  const doc = generateCreditStatementPdf(data, options);
  const filename =
    options.language === "cs"
      ? `vypis-kreditu-${data.clientName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      : `credit-statement-${data.clientName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
