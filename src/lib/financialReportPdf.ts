import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { loadRobotoFonts, registerRobotoFont } from "./pdfFonts";
import type { FinancialReportData } from "@/hooks/useFinancialReportData";
import type { FinancialReportSettings } from "@/hooks/useFinancialReportSettings";

export interface FinancialReportPdfOptions {
  companyName?: string;
  companyLogoUrl?: string;
  settings: FinancialReportSettings;
}

const COLORS = {
  primary: [255, 115, 0] as [number, number, number],
  primaryDark: [230, 100, 0] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  background: [250, 245, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
};

const FONTS = {
  title: 22,
  sectionTitle: 14,
  heading: 11,
  body: 10,
  small: 9,
  tiny: 8,
};

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('cs-CZ')} Kč`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} %`;
}

export async function generateFinancialReportPdf(
  data: FinancialReportData,
  options: FinancialReportPdfOptions
): Promise<jsPDF> {
  const { settings } = options;
  
  await loadRobotoFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  registerRobotoFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const drawSectionTitle = (title: string) => {
    checkPageBreak(15);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFontSize(FONTS.sectionTitle);
    doc.setTextColor(...COLORS.white);
    doc.setFont("Roboto", "bold");
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;
  };

  const drawStatRow = (label: string, value: string, x: number = margin, width: number = pageWidth - 2 * margin) => {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(label, x + 3, yPos);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(value, x + width - 3, yPos, { align: "right" });
    yPos += 6;
  };

  // Header stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');
  yPos = 18;

  // Company logo
  if (settings.branding.showLogo && options.companyLogoUrl) {
    try {
      const response = await fetch(options.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'AUTO', margin, yPos - 5, 0, 12);
      yPos += 5;
    } catch (e) {
      console.error("Failed to load logo:", e);
    }
  }

  // Title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont("Roboto", "bold");
  const title = settings.branding.customTitle || "Finanční report";
  doc.text(title, margin, yPos + 5);
  yPos += 12;

  // Company name
  if (settings.branding.showCompanyName && options.companyName) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(options.companyName, margin, yPos);
    yPos += 5;
  }

  // Period and generation date
  doc.setFontSize(FONTS.small);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Období: ${data.period.label}`, margin, yPos);
  doc.text(`Vygenerováno: ${format(new Date(), "d. M. yyyy HH:mm", { locale: cs })}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 10;

  // === YEAR SUMMARY ===
  if (settings.sections.yearSummary) {
    drawSectionTitle("Souhrn období");
    
    // Handle empty data case
    if (data.summary.totalTrainings === 0 && data.summary.totalIncome === 0) {
      doc.setFontSize(FONTS.body);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Za zvolené období nejsou k dispozici žádná data.", margin + 3, yPos);
      yPos += 10;
    } else {
      const colWidth = (pageWidth - 2 * margin) / 2;
      
      // Left column
      const leftX = margin;
      drawStatRow("Celkové příjmy", formatCurrency(data.summary.totalIncome), leftX, colWidth - 5);
      
      // Show breakdown if multiple sources enabled
      if (data.summary.paymentIncome > 0 && data.summary.productIncome > 0) {
        doc.setFontSize(FONTS.tiny);
        doc.setTextColor(...COLORS.textLight);
        doc.text(`  (platby: ${formatCurrency(data.summary.paymentIncome)}, prodeje: ${formatCurrency(data.summary.productIncome)})`, leftX + 3, yPos);
        yPos += 5;
      }
      
      if (data.summary.totalTrainings > 0) {
        drawStatRow("Počet tréninků", data.summary.totalTrainings.toString(), leftX, colWidth - 5);
      }
      drawStatRow("Počet klientů", data.summary.totalClients.toString(), leftX, colWidth - 5);
      
      // Right column
      const rightStartY = yPos - (data.summary.totalTrainings > 0 ? 12 : 6);
      yPos = rightStartY;
      const rightX = margin + colWidth;
      
      if (data.summary.totalTrainings > 0) {
        drawStatRow("Průměr / trénink", formatCurrency(Math.round(data.summary.avgIncomePerTraining)), rightX, colWidth - 5);
      }
      drawStatRow("Průměr / klient", formatCurrency(Math.round(data.summary.avgIncomePerClient)), rightX, colWidth - 5);
      yPos += 6;
      
      // Training breakdown (only if trainings are included)
      if (data.summary.totalTrainings > 0) {
        yPos += 2;
        doc.setFontSize(FONTS.small);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`Rozpad: ${data.summary.soloTrainings}× 1:1 | ${data.summary.duoTrainings}× dvojice | ${data.summary.trioTrainings}× trojice+`, margin + 3, yPos);
        yPos += 8;
      }
      
      // Product summary
      if (data.totalProductsSold > 0) {
        doc.setFontSize(FONTS.small);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`Prodáno produktů: ${data.totalProductsSold}× za ${formatCurrency(data.summary.productIncome)}`, margin + 3, yPos);
        yPos += 8;
      }
      
      yPos += 2;
    }
  }

  // === MONTHLY OVERVIEW ===
  if (settings.sections.monthlyOverview && data.monthly.length > 0) {
    drawSectionTitle("Měsíční přehled");
    
    autoTable(doc, {
      startY: yPos,
      head: [['Měsíc', 'Příjmy', 'Tréninky', '1:1', '2', '3+', 'Klienti', 'Změna']],
      body: data.monthly.map(m => [
        m.month,
        formatCurrency(m.income),
        m.trainingCount.toString(),
        m.soloCount.toString(),
        m.duoCount.toString(),
        m.trioCount.toString(),
        m.clientCount.toString(),
        formatPercent(m.changePercent),
      ]),
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: FONTS.tiny,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { halign: 'right' },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 18 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // === WEEKLY OVERVIEW ===
  if (settings.sections.weeklyOverview && data.weekly.length > 0) {
    checkPageBreak(60);
    drawSectionTitle("Týdenní přehled");
    
    autoTable(doc, {
      startY: yPos,
      head: [['Týden', 'Tréninky', '1:1', 'Dvojice', 'Trojice+']],
      body: data.weekly.map(w => [
        w.weekLabel,
        w.trainingCount.toString(),
        w.soloCount.toString(),
        w.duoCount.toString(),
        w.trioCount.toString(),
      ]),
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: FONTS.tiny,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // === CLIENTS BREAKDOWN ===
  if (settings.sections.clientsBreakdown && data.clients.length > 0) {
    checkPageBreak(60);
    drawSectionTitle("Klienti");
    
    // Top 20% info
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`TOP 20 % klientů generuje ${data.topClientsRevenuePercent.toFixed(1)} % příjmů`, margin + 3, yPos);
    yPos += 6;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Jméno', 'Zaplaceno', 'Tréninky', '1:1', '2', '3+']],
      body: data.clients.slice(0, 30).map(c => [
        c.name,
        formatCurrency(c.totalPaid),
        c.trainingCount.toString(),
        c.soloCount.toString(),
        c.duoCount.toString(),
        c.trioCount.toString(),
      ]),
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: FONTS.tiny,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: 'right' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // === TRAINING TYPE BREAKDOWN ===
  if (settings.sections.trainingTypeBreakdown && data.summary.totalTrainings > 0) {
    checkPageBreak(40);
    drawSectionTitle("Rozpad typů tréninku");
    
    const total = data.summary.totalTrainings;
    const soloPercent = total > 0 ? (data.summary.soloTrainings / total * 100).toFixed(1) : '0';
    const duoPercent = total > 0 ? (data.summary.duoTrainings / total * 100).toFixed(1) : '0';
    const trioPercent = total > 0 ? (data.summary.trioTrainings / total * 100).toFixed(1) : '0';
    
    drawStatRow("Individuální (1:1)", `${data.summary.soloTrainings}× (${soloPercent} %)`);
    drawStatRow("Dvojice", `${data.summary.duoTrainings}× (${duoPercent} %)`);
    drawStatRow("Trojice a více", `${data.summary.trioTrainings}× (${trioPercent} %)`);
    yPos += 5;
  }

  // === PRODUCT SALES BREAKDOWN ===
  if (settings.sections.productSalesBreakdown && data.products.length > 0) {
    checkPageBreak(60);
    drawSectionTitle("Rozpad prodejů produktů");
    
    autoTable(doc, {
      startY: yPos,
      head: [['Produkt', 'Prodáno', 'Tržba', 'Klientů']],
      body: data.products.slice(0, 20).map(p => [
        p.productName,
        `${p.quantity}×`,
        formatCurrency(p.totalRevenue),
        p.clientCount.toString(),
      ]),
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: FONTS.tiny,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // === MANAGERIAL METRICS ===
  if (settings.sections.managerialMetrics) {
    checkPageBreak(50);
    drawSectionTitle("Manažerské metriky");
    
    if (data.managerial.incomePerHour !== null) {
      drawStatRow("Příjem / hodinu tréninku", formatCurrency(Math.round(data.managerial.incomePerHour)));
    }
    drawStatRow("Podíl skupinových tréninků", `${data.managerial.groupTrainingPercent.toFixed(1)} %`);
    
    if (data.managerial.bestMonth) {
      drawStatRow("Nejlepší měsíc", `${data.managerial.bestMonth.name} (${formatCurrency(data.managerial.bestMonth.income)})`);
    }
    if (data.managerial.worstMonth) {
      drawStatRow("Nejslabší měsíc", `${data.managerial.worstMonth.name} (${formatCurrency(data.managerial.worstMonth.income)})`);
    }
    
    yPos += 3;
    drawStatRow("YTD příjem", formatCurrency(data.managerial.ytdIncome));
    drawStatRow("Loňský rok (stejné období)", formatCurrency(data.managerial.lastYearIncome));
    if (data.managerial.yoyChangePercent !== null) {
      drawStatRow("Meziroční změna", formatPercent(data.managerial.yoyChangePercent));
    }
    yPos += 5;
  }

  // === DATA VALIDATION ===
  if (settings.sections.dataValidation) {
    checkPageBreak(40);
    drawSectionTitle("Kontrola dat");
    
    drawStatRow("Platby bez přiřazeného klienta", data.validation.paymentsWithoutClient.toString());
    drawStatRow("Tréninky bez klienta", data.validation.trainingsWithoutClient.toString());
    
    yPos += 3;
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("Rozdíl 'odtrénováno vs zaplaceno':", margin + 3, yPos);
    yPos += 5;
    
    const diffColor = data.validation.trainedNotPaidDiff >= 0 ? COLORS.success : COLORS.danger;
    doc.setTextColor(...diffColor);
    doc.setFont("Roboto", "bold");
    doc.text(formatCurrency(data.validation.trainedNotPaidDiff), margin + 3, yPos);
    
    doc.setTextColor(...COLORS.textLight);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(FONTS.tiny);
    doc.text("(kladné = více odtrénováno než zaplaceno, záporné = více zaplaceno)", margin + 50, yPos);
    yPos += 10;
  }

  // Footer
  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(FONTS.tiny);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`Strana ${i} z ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  };
  
  addFooter();

  return doc;
}

export async function downloadFinancialReportPdf(
  data: FinancialReportData,
  options: FinancialReportPdfOptions
): Promise<void> {
  const doc = await generateFinancialReportPdf(data, options);
  const filename = `financni-report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
