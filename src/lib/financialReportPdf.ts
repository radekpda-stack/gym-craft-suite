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

// Modern professional color palette
const C = {
  headerBg: [15, 23, 42] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  accent: [249, 115, 22] as [number, number, number],
  accentLight: [255, 237, 213] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textSecondary: [71, 85, 105] as [number, number, number],
  textMuted: [148, 163, 184] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bgSubtle: [248, 250, 252] as [number, number, number],
  bgAlt: [241, 245, 249] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  borderLight: [241, 245, 249] as [number, number, number],
};

const F = {
  title: 24,
  subtitle: 11,
  sectionTitle: 13,
  kpiValue: 16,
  kpiLabel: 8,
  heading: 11,
  body: 9.5,
  small: 8.5,
  tiny: 7.5,
};

function fmt(amount: number): string {
  return `${amount.toLocaleString('cs-CZ')} Kč`;
}

function fmtPct(value: number | null): string {
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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerRobotoFont(doc);

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 16;
  const cw = pw - 2 * m;
  let y = m;

  const checkPage = (h: number) => {
    if (y + h > ph - 18) {
      doc.addPage();
      y = m;
      return true;
    }
    return false;
  };

  const drawSection = (title: string) => {
    checkPage(18);
    y += 4;
    doc.setFontSize(F.sectionTitle);
    doc.setTextColor(...C.headerBg);
    doc.setFont("Roboto", "bold");
    doc.text(title.toUpperCase(), m, y);
    y += 2;
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.6);
    doc.line(m, y, m + 45, y);
    doc.setLineWidth(0.2);
    y += 6;
  };

  const statRow = (label: string, value: string, x: number = m, w: number = cw, options?: { color?: [number, number, number]; bold?: boolean }) => {
    doc.setFontSize(F.body);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text(label, x + 2, y);
    doc.setTextColor(...(options?.color || C.text));
    doc.setFont("Roboto", options?.bold ? "bold" : "bold");
    doc.text(value, x + w - 2, y, { align: "right" });
    y += 5.5;
  };

  const drawKpiCard = (x: number, w: number, label: string, value: string, subtext?: string, valueColor?: [number, number, number]) => {
    doc.setFillColor(...C.bgSubtle);
    doc.setDrawColor(...C.border);
    doc.roundedRect(x, y, w, 22, 2, 2, 'FD');
    doc.setFontSize(F.kpiValue);
    doc.setTextColor(...(valueColor || C.headerBg));
    doc.setFont("Roboto", "bold");
    doc.text(value, x + w / 2, y + 10, { align: "center" });
    doc.setFontSize(F.kpiLabel);
    doc.setTextColor(...C.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(label.toUpperCase(), x + w / 2, y + 16, { align: "center" });
    if (subtext) {
      doc.setFontSize(6.5);
      doc.setTextColor(...C.textMuted);
      doc.text(subtext, x + w / 2, y + 20, { align: "center" });
    }
  };

  const tableTheme = {
    theme: 'striped' as const,
    styles: {
      font: 'Roboto',
      fontSize: F.tiny,
      cellPadding: 2.5,
      lineColor: C.borderLight,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: C.headerBg,
      textColor: C.headerText,
      fontStyle: 'bold' as const,
      fontSize: F.small,
    },
    alternateRowStyles: {
      fillColor: C.bgSubtle,
    },
    margin: { left: m, right: m },
  };

  // ═══════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, 5, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 5, pw, 1.2, 'F');
  y = 14;

  if (settings.branding.showLogo && options.companyLogoUrl) {
    try {
      const response = await fetch(options.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'AUTO', m, y - 3, 0, 10);
      y += 4;
    } catch (e) {
      console.error("Failed to load logo:", e);
    }
  }

  doc.setFontSize(F.title);
  doc.setTextColor(...C.headerBg);
  doc.setFont("Roboto", "bold");
  doc.text(settings.branding.customTitle || "Finanční report", m, y + 5);
  y += 12;

  if (settings.branding.showCompanyName && options.companyName) {
    doc.setFontSize(F.subtitle);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text(options.companyName, m, y);
    y += 5;
  }

  doc.setFontSize(F.small);
  doc.setTextColor(...C.textMuted);
  doc.text(`Období: ${data.period.label}`, m, y);
  doc.text(`Vygenerováno: ${format(new Date(), "d. M. yyyy HH:mm", { locale: cs })}`, pw - m, y, { align: "right" });
  y += 10;

  // ═══════════════════════════════════════════
  // KPI CARDS
  // ═══════════════════════════════════════════
  if (settings.sections.yearSummary) {
    if (data.summary.totalTrainings === 0 && data.summary.totalIncome === 0 && data.totalProductsSold === 0) {
      doc.setFontSize(F.body);
      doc.setTextColor(...C.textMuted);
      doc.text("Za zvolené období nejsou k dispozici žádná data.", m + 2, y);
      y += 12;
    } else {
      const cardGap = 4;
      const cardW = (cw - 3 * cardGap) / 4;
      const savedY = y;
      
      drawKpiCard(m, cardW, "Celkové příjmy", fmt(data.summary.totalIncome));
      drawKpiCard(m + cardW + cardGap, cardW, "Tréninky", data.summary.totalTrainings.toString(), `${(data.trainingsSummary?.totalHours || 0).toFixed(0)} hod`);
      drawKpiCard(m + 2 * (cardW + cardGap), cardW, "Klienti", data.summary.totalClients.toString());
      
      const npColor = data.summary.netProfit >= 0 ? C.success : C.danger;
      const npLabel = data.summary.totalExpenses > 0 ? "Čistý zisk" : "Příjmy";
      const npValue = data.summary.totalExpenses > 0 ? data.summary.netProfit : data.summary.totalIncome;
      drawKpiCard(m + 3 * (cardW + cardGap), cardW, npLabel, fmt(npValue), undefined, npColor);
      
      y = savedY + 26;

      // Income breakdown line
      const breakdownParts = [];
      if (data.summary.paymentIncome > 0) breakdownParts.push(`platby klientů ${fmt(data.summary.paymentIncome)}`);
      if (data.summary.productIncome > 0) breakdownParts.push(`prodeje produktů ${fmt(data.summary.productIncome)}`);
      // FIX #3: Show cancellation income in breakdown
      if (data.summary.cancellationIncome > 0) breakdownParts.push(`storno poplatky ${fmt(data.summary.cancellationIncome)}`);
      
      if (breakdownParts.length > 1) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        doc.text(`Rozpad: ${breakdownParts.join(' | ')}`, m + 2, y);
        y += 5;
      }
      
      if (data.summary.totalExpenses > 0) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        doc.text(`Provozní náklady: ${fmt(data.summary.totalExpenses)}`, m + 2, y);
        y += 5;
      }

      // Payment method breakdown
      const pmb = data.summary.paymentMethodBreakdown;
      if (pmb.cash > 0 || pmb.card > 0 || pmb.bank_transfer > 0 || pmb.credit > 0) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        const parts = [];
        if (pmb.cash > 0) parts.push(`Hotovost ${fmt(pmb.cash)}`);
        if (pmb.card > 0) parts.push(`Karta ${fmt(pmb.card)}`);
        if (pmb.bank_transfer > 0) parts.push(`Převod ${fmt(pmb.bank_transfer)}`);
        if (pmb.credit > 0) parts.push(`Kredit ${fmt(pmb.credit)}`);
        doc.text(`Platební metody: ${parts.join(' · ')}`, m + 2, y);
        y += 5;
      }

      if (data.summary.totalTrainings > 0) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        doc.text(`Typy: ${data.summary.soloTrainings}× 1:1 · ${data.summary.duoTrainings}× dvojice · ${data.summary.trioTrainings}× trojice+`, m + 2, y);
        y += 5;
      }

      if (data.totalProductsSold > 0) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        doc.text(`Produkty: ${data.totalProductsSold}× za ${fmt(data.summary.totalProductRevenue)}`, m + 2, y);
        const marginColor = data.summary.totalProductMargin >= 0 ? C.success : C.danger;
        doc.setTextColor(...marginColor);
        doc.text(` · marže ${fmt(data.summary.totalProductMargin)} (${data.summary.totalProductMarginPercent.toFixed(1)} %)`, m + 2 + doc.getTextWidth(`Produkty: ${data.totalProductsSold}× za ${fmt(data.summary.totalProductRevenue)}`), y);
        y += 5;
      }

      y += 4;
    }
  }

  // ═══════════════════════════════════════════
  // MONTHLY OVERVIEW
  // ═══════════════════════════════════════════
  if (settings.sections.monthlyOverview && data.monthly.length > 0) {
    drawSection("Měsíční přehled");
    
    const hasCancellations = data.monthly.some(m => m.cancellationIncome > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasCancellations 
        ? ['Měsíc', 'Příjmy', 'Storno', 'Tréninky', '1:1', '2', '3+', 'Klienti', 'Změna']
        : ['Měsíc', 'Příjmy', 'Tréninky', '1:1', '2', '3+', 'Klienti', 'Změna']
      ],
      body: data.monthly.map(m => hasCancellations ? [
        m.month,
        fmt(m.income),
        m.cancellationIncome > 0 ? fmt(m.cancellationIncome) : '-',
        m.trainingCount.toString(),
        m.soloCount.toString(),
        m.duoCount.toString(),
        m.trioCount.toString(),
        m.clientCount.toString(),
        fmtPct(m.changePercent),
      ] : [
        m.month,
        fmt(m.income),
        m.trainingCount.toString(),
        m.soloCount.toString(),
        m.duoCount.toString(),
        m.trioCount.toString(),
        m.clientCount.toString(),
        fmtPct(m.changePercent),
      ]),
      ...tableTheme,
      columnStyles: hasCancellations ? {
        0: { cellWidth: 22 },
        1: { halign: 'right' },
        2: { halign: 'right', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 10 },
        5: { halign: 'center', cellWidth: 10 },
        6: { halign: 'center', cellWidth: 10 },
        7: { halign: 'center', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 16 },
      } : {
        0: { cellWidth: 25 },
        1: { halign: 'right' },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 18 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // WEEKLY OVERVIEW
  // ═══════════════════════════════════════════
  if (settings.sections.weeklyOverview && data.weekly.length > 0) {
    checkPage(60);
    drawSection("Týdenní přehled");
    
    const hasCancellations = data.weekly.some(w => w.cancellationIncome > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasCancellations
        ? ['Týden', 'Příjmy', 'Storno', 'Tréninky', '1:1', 'Dvojice', 'Trojice+']
        : ['Týden', 'Příjmy', 'Tréninky', '1:1', 'Dvojice', 'Trojice+']
      ],
      body: data.weekly.map(w => hasCancellations ? [
        w.weekLabel,
        fmt(w.income),
        w.cancellationIncome > 0 ? fmt(w.cancellationIncome) : '-',
        w.trainingCount.toString(),
        w.soloCount.toString(),
        w.duoCount.toString(),
        w.trioCount.toString(),
      ] : [
        w.weekLabel,
        fmt(w.income),
        w.trainingCount.toString(),
        w.soloCount.toString(),
        w.duoCount.toString(),
        w.trioCount.toString(),
      ]),
      ...tableTheme,
      columnStyles: hasCancellations ? {
        0: { cellWidth: 28 },
        1: { halign: 'right' },
        2: { halign: 'right', cellWidth: 18 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      } : {
        0: { cellWidth: 30 },
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // CLIENTS BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.clientsBreakdown && data.clients.length > 0) {
    checkPage(60);
    drawSection("Klienti");
    
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.text(`TOP 20 % klientů generuje ${data.topClientsRevenuePercent.toFixed(1)} % příjmů`, m + 2, y);
    y += 6;
    
    // FIX #8: Add products column to client table
    const hasProducts = data.clients.some(c => c.productsPaid > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasProducts 
        ? ['Jméno', 'Zaplaceno', 'Produkty', 'Tréninky', '1:1', '2', '3+']
        : ['Jméno', 'Zaplaceno', 'Tréninky', '1:1', '2', '3+']
      ],
      body: data.clients.slice(0, 30).map(c => hasProducts ? [
        c.name,
        fmt(c.totalPaid),
        c.productsPaid > 0 ? fmt(c.productsPaid) : '-',
        c.trainingCount.toString(),
        c.soloCount.toString(),
        c.duoCount.toString(),
        c.trioCount.toString(),
      ] : [
        c.name,
        fmt(c.totalPaid),
        c.trainingCount.toString(),
        c.soloCount.toString(),
        c.duoCount.toString(),
        c.trioCount.toString(),
      ]),
      ...tableTheme,
      columnStyles: hasProducts ? {
        0: { cellWidth: 38 },
        1: { halign: 'right' },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'center', cellWidth: 13 },
        5: { halign: 'center', cellWidth: 13 },
        6: { halign: 'center', cellWidth: 13 },
      } : {
        0: { cellWidth: 45 },
        1: { halign: 'right' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // TRAINING TYPE BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.trainingTypeBreakdown && data.summary.totalTrainings > 0) {
    checkPage(40);
    drawSection("Rozpad typů tréninku");
    
    const total = data.summary.totalTrainings;
    const soloP = total > 0 ? (data.summary.soloTrainings / total * 100).toFixed(1) : '0';
    const duoP = total > 0 ? (data.summary.duoTrainings / total * 100).toFixed(1) : '0';
    const trioP = total > 0 ? (data.summary.trioTrainings / total * 100).toFixed(1) : '0';
    
    statRow("Individuální (1:1)", `${data.summary.soloTrainings}× (${soloP} %)`);
    statRow("Dvojice", `${data.summary.duoTrainings}× (${duoP} %)`);
    statRow("Trojice a více", `${data.summary.trioTrainings}× (${trioP} %)`);
    y += 6;
  }

  // ═══════════════════════════════════════════
  // PRODUCT SALES BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.productSalesBreakdown && data.products.length > 0) {
    checkPage(80);
    drawSection("Rozpad prodejů produktů");
    
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.text(`Celkem: ${data.totalProductsSold}× produktů | Tržba: ${fmt(data.summary.totalProductRevenue)} | Náklady: ${fmt(data.summary.totalProductCost)}`, m + 2, y);
    y += 5;
    
    const marginColor = data.summary.totalProductMargin >= 0 ? C.success : C.danger;
    doc.setTextColor(...marginColor);
    doc.setFont("Roboto", "bold");
    doc.text(`Celková marže: ${fmt(data.summary.totalProductMargin)} (${data.summary.totalProductMarginPercent.toFixed(1)} %)`, m + 2, y);
    doc.setFont("Roboto", "normal");
    y += 8;
    
    autoTable(doc, {
      startY: y,
      head: [['Produkt', 'Kategorie', 'Ks', 'Tržba', 'Náklady', 'Marže', 'Marže %']],
      body: data.products.slice(0, 25).map(p => [
        p.productName,
        p.category,
        `${p.quantity}×`,
        fmt(p.totalRevenue),
        fmt(p.totalCost),
        fmt(p.margin),
        `${p.marginPercent.toFixed(1)} %`,
      ]),
      ...tableTheme,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 20 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
    
    // Product clients
    if (data.productClients.length > 0) {
      checkPage(60);
      
      doc.setFontSize(F.heading);
      doc.setTextColor(...C.headerBg);
      doc.setFont("Roboto", "bold");
      doc.text("Klienti podle nákupů", m + 2, y);
      y += 6;
      
      autoTable(doc, {
        startY: y,
        head: [['Klient', 'Utraceno', 'Produktů', 'Objednávek']],
        body: data.productClients.slice(0, 20).map(c => [
          c.clientName,
          fmt(c.totalSpent),
          `${c.productCount}×`,
          c.orderCount.toString(),
        ]),
        ...tableTheme,
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: 'right', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 25 },
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ═══════════════════════════════════════════
  // TRAININGS & PAYMENTS SUMMARY
  // ═══════════════════════════════════════════
  if (settings.sections.trainingsPaymentsSummary && data.trainingsSummary && data.paymentsSummary) {
    checkPage(80);
    drawSection("Přehled tréninků a plateb");
    
    const halfW = (cw - 6) / 2;
    const leftX = m;
    const rightX = m + halfW + 6;
    
    const colStartY = y;
    
    // LEFT COLUMN: Trainings
    doc.setFontSize(F.heading);
    doc.setTextColor(...C.headerBg);
    doc.setFont("Roboto", "bold");
    doc.text("TRÉNINKY", leftX + 2, y);
    y += 7;
    
    const ts = data.trainingsSummary;
    statRow("Celkem odtrénováno", `${ts.totalTrainings}× (${ts.totalHours.toFixed(1)} hod)`, leftX, halfW);
    statRow("Hodnota tréninků", fmt(ts.totalTrainedValue), leftX, halfW);
    statRow("Průměr / trénink", fmt(ts.avgPricePerTraining), leftX, halfW);
    statRow("Průměrná hod. sazba", fmt(ts.avgHourlyRate), leftX, halfW);
    
    if (ts.unpaidTrainingsCount > 0) {
      y += 1;
      doc.setFontSize(F.small);
      doc.setTextColor(...C.danger);
      doc.text(`Neuhrazeno: ${ts.unpaidTrainingsCount}× za ${fmt(ts.unpaidValue)}`, leftX + 2, y);
      y += 5;
    }
    
    const leftEndY = y;
    
    // RIGHT COLUMN: Payments (start at same Y)
    y = colStartY;
    
    doc.setFontSize(F.heading);
    doc.setTextColor(...C.headerBg);
    doc.setFont("Roboto", "bold");
    doc.text("ÚHRADY", rightX + 2, y);
    y += 7;
    
    const ps = data.paymentsSummary;
    statRow("Uhrazeno za tréninky", fmt(ps.trainingPayments), rightX, halfW);
    // FIX #5: Renamed from "Přímé platby (kredit)" to "Nealokovaný kredit"
    statRow("Nealokovaný kredit", fmt(ps.unallocatedCredit), rightX, halfW);
    statRow("Platby za produkty", fmt(ps.productPayments), rightX, halfW);
    
    // FIX #3: Show cancellation income if any
    if (data.summary.cancellationIncome > 0) {
      statRow("Storno poplatky", fmt(data.summary.cancellationIncome), rightX, halfW);
    }
    
    const rightEndY = y;
    
    y = Math.max(leftEndY, rightEndY) + 8;
    
    // Difference summary bar
    const diff = ts.totalTrainedValue - ps.trainingPayments;
    // FIX #7: Positive diff = danger (debt), negative/zero = success (overpaid)
    const diffColor = diff <= 0 ? C.success : C.danger;
    
    doc.setFillColor(...C.bgAlt);
    doc.setDrawColor(...C.border);
    doc.roundedRect(m, y - 2, cw, 12, 2, 2, 'FD');
    
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.text("ROZDÍL (odtrénováno − uhrazeno za tréninky):", m + 5, y + 4);
    
    doc.setTextColor(...diffColor);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(F.heading);
    const diffSign = diff >= 0 ? '+' : '';
    doc.text(`${diffSign}${fmt(diff)}`, pw - m - 5, y + 4, { align: 'right' });
    
    y += 18;
  }

  // ═══════════════════════════════════════════
  // MANAGERIAL METRICS
  // ═══════════════════════════════════════════
  if (settings.sections.managerialMetrics) {
    checkPage(50);
    drawSection("Manažerské metriky");
    
    if (data.managerial.incomePerHour !== null) {
      statRow("Příjem / hodinu tréninku", fmt(Math.round(data.managerial.incomePerHour)));
    }
    statRow("Podíl skupinových tréninků", `${data.managerial.groupTrainingPercent.toFixed(1)} %`);
    
    if (data.managerial.bestMonth) {
      statRow("Nejlepší měsíc", `${data.managerial.bestMonth.name} (${fmt(data.managerial.bestMonth.income)})`);
    }
    if (data.managerial.worstMonth) {
      statRow("Nejslabší měsíc", `${data.managerial.worstMonth.name} (${fmt(data.managerial.worstMonth.income)})`);
    }
    
    y += 3;
    statRow("YTD příjem", fmt(data.managerial.ytdIncome));
    statRow("Loňský rok (stejné období)", fmt(data.managerial.lastYearIncome));
    if (data.managerial.yoyChangePercent !== null) {
      statRow("Meziroční změna", fmtPct(data.managerial.yoyChangePercent));
    }
    y += 6;
  }

  // ═══════════════════════════════════════════
  // DATA VALIDATION
  // ═══════════════════════════════════════════
  if (settings.sections.dataValidation) {
    checkPage(40);
    drawSection("Kontrola dat");
    
    statRow("Platby bez přiřazeného klienta", data.validation.paymentsWithoutClient.toString());
    statRow("Tréninky bez klienta", data.validation.trainingsWithoutClient.toString());
    
    y += 3;
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.text("Rozdíl 'odtrénováno vs zaplaceno':", m + 2, y);
    y += 5;
    
    // FIX #7: INVERTED - positive diff (debt) = danger, zero/negative (overpaid) = success
    const vDiffColor = data.validation.trainedNotPaidDiff <= 0 ? C.success : C.danger;
    doc.setTextColor(...vDiffColor);
    doc.setFont("Roboto", "bold");
    doc.text(fmt(data.validation.trainedNotPaidDiff), m + 2, y);
    
    doc.setTextColor(...C.textMuted);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(F.tiny);
    doc.text("(kladné = více odtrénováno než zaplaceno = dluh)", m + 50, y);
    y += 10;
  }

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.4);
    doc.line(m, ph - 14, pw - m, ph - 14);
    doc.setLineWidth(0.2);
    doc.setFontSize(F.tiny);
    doc.setTextColor(...C.textMuted);
    doc.text(`Strana ${i} / ${totalPages}`, pw - m, ph - 10, { align: 'right' });
    doc.text(settings.branding.customTitle || "Finanční report", m, ph - 10);
  }

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
